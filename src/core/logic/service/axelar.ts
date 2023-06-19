import { AxelarAssetTransfer } from '@axelar-network/axelarjs-sdk/dist/src/libs/AxelarAssetTransfer';
import { AxelarQueryAPI } from '@axelar-network/axelarjs-sdk/dist/src/libs/AxelarQueryAPI';
import { Environment } from '@axelar-network/axelarjs-sdk/dist/src/libs/types/index';
import { SigningStargateClient } from '@cosmjs/stargate';
import { GlobalEventName } from 'constants/global.types';
import { ethers, providers } from 'ethers';
import { Config, GlobalEvent } from 'helpers';
import { Asset, Chain } from 'pages/Assets/type';
import { KeplrConfig } from '../config';
import { transferErc20 } from '../utils/erc20';
import { ApiService } from 'services/api.service';
import BigNumber from 'bignumber.js';

interface EstimateTransferFeeParams {
  srcChainId: string;
  destChainId: string;
  asset: Asset;
}
export const getTransferFee = async ({
  srcChainId,
  destChainId,
  asset
}: EstimateTransferFeeParams) => {
  try {
    const api = new AxelarQueryAPI({
      environment: Environment.TESTNET
    });

    const transferFee = await api.getTransferFee(
      srcChainId,
      destChainId,
      asset.denom,
      Math.pow(10, asset.decimals)
    );

    return ethers.utils.formatUnits(
      transferFee.fee?.amount || '0',
      asset.decimals
    );
  } catch (error) {
    console.error(error);
  }

  return '0';
};

interface DepositAddressParams {
  srcChain: Chain;
  destChain: Chain;
  destAddress: string;
  denom: string;
  isDeposit?: boolean;
}
export const getDepositAddress = async ({
  srcChain,
  destChain,
  destAddress,
  denom,
  isDeposit
}: DepositAddressParams) => {
  try {
    const sdk = new AxelarAssetTransfer({
      environment: Environment.TESTNET
    });

    const depositAddress = await sdk.getDepositAddress(
      srcChain.chainId,
      destChain.chainId,
      destAddress,
      denom
    );
    const socketService = sdk.getSocketService();

    if (isDeposit) {
      const confirmRoomId = {
        depositAddress,
        sourceModule: srcChain.type,
        type: 'deposit-confirmation'
      };

      socketService
        .joinRoomAndWaitForEvent(
          JSON.stringify(confirmRoomId),
          srcChain.chainId,
          destChain.chainId,
          destAddress
        )
        .then((resp) => {
          console.log(resp);
          const checkAxelar = () => {
            ApiService.instance
              .post(
                '/cross-chain/transfers',
                {
                  txHash: resp.transactionHash,
                  size: 1
                },
                { baseURL: Config.axelarQueryUrl }
              )
              .then((resp2) => {
                console.log(resp2);
                if (resp2.data.data[0].status !== 'ibc_sent') {
                  return checkAxelar();
                }

                checkAura(resp2.data.data[0].ibc_send.packet.packet_sequence);
              });
          };

          const checkAura = (packetSequence: string) => {
            ApiService.instance
              .get(
                '/transaction?chainid={1}&pageLimit=20&sequenceIBC={2}'
                  .replace('{1}', Config.chainInfo.chainId)
                  .replace('{2}', packetSequence),
                { baseURL: Config.horoscopeUrl }
              )
              .then((resp3) => {
                console.log(resp3);

                const txHash =
                  resp3.data.data.transactions[0]?.tx_response?.txhash;
                if (!txHash) {
                  return checkAura(packetSequence);
                }

                GlobalEvent.dispatchEvent(
                  GlobalEvent.depositConfirmation(txHash)
                );
              });
          };

          checkAxelar();
        });
    } else {
      const confirmRoomId = {
        depositAddress,
        sourceModule: srcChain.type,
        type: 'deposit-confirmation'
      };

      socketService
        .joinRoomAndWaitForEvent(
          JSON.stringify(confirmRoomId),
          srcChain.chainId,
          destChain.chainId,
          destAddress
        )
        .then((resp) => {
          console.log(resp);
          const checkAxelar = () => {
            ApiService.instance
              .post(
                '/batches',
                { from: 0, size: 25 },
                { baseURL: Config.axelarQueryUrl }
              )
              .then((resp2) => {
                console.log(resp2);
                const batch = resp2.data.data.find(
                  (c: any) =>
                    new BigNumber(`0x${c.command_ids[0]}`).toString() ===
                    resp.Attributes.transferID
                );
                const txHash = batch?.commands[0]?.transactionHash;
                if (!txHash) {
                  return checkAxelar();
                }

                GlobalEvent.dispatchEvent(
                  GlobalEvent.depositConfirmation(txHash)
                );
              });
          };
          checkAxelar();
        });
    }

    return depositAddress;
  } catch (error) {
    console.error(error);
  }
};

export const getProvider = () => {
  return new providers.Web3Provider((window as any).ethereum);
};

const DEFAULT_INTERVAL = 1_000; // 1s
const BLOCKS_TO_WAIT = 96;

interface OnProgressingTrxFnc {
  (percent: number, txHash?: string): void;
}
interface SendEvmTokenParams {
  asset: Asset;
  amount: number;
  depositAddress: string;

  onSent?: (txHash: string) => void;
  onProgress?: OnProgressingTrxFnc;
}
export const sendEvmToken = async ({
  asset,
  amount,
  depositAddress,
  onSent,
  onProgress
}: SendEvmTokenParams) => {
  const srcProvider = getProvider();
  const unitAmount = ethers.utils.parseUnits(amount.toString(), asset.decimals);

  const txHash = await transferErc20(
    asset.tokenAddress,
    depositAddress,
    unitAmount,
    srcProvider
  )
    .then((tx: any) => tx.wait())
    .then((receipt: any) => {
      console.log(receipt);
      return receipt.transactionHash;
    });

  onSent && onSent(txHash);

  _waitToCompletedTrx(txHash, onProgress);
};

const _waitToCompletedTrx = (
  txnHash: string,
  onProgress?: OnProgressingTrxFnc
) => {
  let txTargetHash = '';

  const srcProvider = getProvider();
  const intervalId = setInterval(async () => {
    if (txTargetHash) {
      onProgress && onProgress(100, txTargetHash);
      clearInterval(intervalId);
      return;
    }
    try {
      const receipt = await srcProvider.getTransactionReceipt(txnHash);
      if (!receipt || !receipt.blockNumber) return;

      try {
        const block = await srcProvider.getBlock(receipt.blockNumber);
        const current = await srcProvider.getBlock('latest');

        if (txTargetHash) return;

        const numOfBlocks = current.number - block.number;
        const percent = (numOfBlocks * 100) / BLOCKS_TO_WAIT;
        if (percent >= 98) {
          onProgress && onProgress(100);
          clearInterval(intervalId);
          return;
        }

        onProgress && onProgress(percent);
      } catch (e) {}
    } catch (e) {}
  }, DEFAULT_INTERVAL);

  const handleDepositConfirm = (txHash: string) => {
    txTargetHash = txHash;

    destroy();
    destroyDone();
  };
  const destroy = GlobalEvent.listenEvent(
    GlobalEventName.ON_DEPOSIT_CONFIRMATION,
    handleDepositConfirm
  );
  const destroyDone = GlobalEvent.listenEvent(
    GlobalEventName.ON_DEPOSIT_COMPLETED,
    handleDepositConfirm
  );
};

interface SendIbcTokenParams {
  chainConfig: Chain;
  asset: Asset;
  amount: number;
  depositAddress: string;

  onSent?: (txHash: string) => void;
  onProgress?: OnProgressingTrxFnc;
}
export const sendIbcToken = async ({
  chainConfig,
  asset,
  amount,
  depositAddress,
  onSent,
  onProgress
}: SendIbcTokenParams) => {
  const coinConfig = (chainConfig.connection as KeplrConfig).currencies.find(
    (c) => c.coinDenom === asset.coinDenom
  )!;

  const _window = window as any;
  const senderAddress = _window.ibcSenderAddress;
  const client = _window.ibcCosmosClient as SigningStargateClient;

  const result = await client.sendIbcTokens(
    senderAddress,
    depositAddress,
    {
      denom: coinConfig!.coinMinimalDenom,
      amount: ethers.utils
        .parseUnits(amount.toString(), asset.decimals)
        .toString()
    },
    'transfer',
    chainConfig.ibcChannel!,
    undefined,
    Math.floor(Date.now() / 1000) + 60 * 5,
    'auto'
  );

  onSent && onSent(result.transactionHash);

  const TIME_TO_WAIT = 600;
  let timeRun = 0;
  const intervalId = setInterval(() => {
    const percent = (timeRun * 100) / TIME_TO_WAIT;
    if (percent >= 98) {
      clearInterval(intervalId);
      return;
    }

    timeRun = timeRun + 1;
    onProgress && onProgress((timeRun * 100) / TIME_TO_WAIT);
  }, DEFAULT_INTERVAL);

  const handleDepositConfirm = (txHash: string) => {
    timeRun = TIME_TO_WAIT - 1;

    onProgress && onProgress(100, txHash);
    destroy();
    destroyDone();
  };
  const destroy = GlobalEvent.listenEvent(
    GlobalEventName.ON_DEPOSIT_CONFIRMATION,
    handleDepositConfirm
  );
  const destroyDone = GlobalEvent.listenEvent(
    GlobalEventName.ON_DEPOSIT_COMPLETED,
    handleDepositConfirm
  );

  console.log(result);
};
