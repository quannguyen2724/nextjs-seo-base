import { getTransferConfigs } from './celer.service';
import { utils, ethers, Contract } from 'ethers';
import OriginalTokenVaultABI from 'core/abi/celer/pegged/OriginalTokenVault.sol/OriginalTokenVault.json';
import PeggedTokenABI from 'core/abi/celer/pegged/PeggedTokenBridgeV2.sol/PeggedTokenBridgeV2.json';
// import OriginalTokenVaultV2ABI from 'core/abi/celer/pegged/OriginalTokenVaultV2.sol/OriginalTokenVaultV2.json';
import {
  approve,
  checkApprove,
  getAllowance,
  getTransferObject,
  transactor
} from 'helpers/transactionHelper';
import { IAsset } from 'pages/V2';

export const getContract = (address: string, abi: any) => {
  const _window = window as any;
  const provider = new ethers.providers.Web3Provider(_window.ethereum);

  const contractInterface = new utils.Interface(abi);
  return new Contract(address, contractInterface, provider.getSigner());
};

//main func

export const mint = async (
  walletAddress: string,
  srcChainId: number,
  dstChainId: number,
  tokenSymbol: string,
  assetAddress: string,
  amount: string
) => {
  const transferConfigs = await getTransferConfigs();
  const originalTokenVaultAddress = transferConfigs.pegged_pair_configs.find(
    (config) =>
      config.org_chain_id === srcChainId &&
      config.vault_version < 2 &&
      config.pegged_chain_id === dstChainId
  )?.pegged_deposit_contract_addr;

  const originalTokenVault = getContract(
    originalTokenVaultAddress || '',
    OriginalTokenVaultABI.abi
  );

  const originalTokenVaultV2Address = transferConfigs.pegged_pair_configs.find(
    (config) =>
      config.org_chain_id === srcChainId &&
      config.vault_version === 2 &&
      config.pegged_chain_id === dstChainId
  )?.pegged_deposit_contract_addr;

  if (!originalTokenVaultAddress && !originalTokenVaultV2Address)
    throw new Error('srcChainId not yet supported by cBridge');

  const isPairPresent = !!(
    transferConfigs.pegged_pair_configs.filter(
      (chainToken) =>
        chainToken.org_chain_id == srcChainId &&
        chainToken.pegged_chain_id == dstChainId &&
        chainToken.pegged_token?.token?.symbol.toUpperCase() == tokenSymbol
    ).length > 0
  );

  if (!isPairPresent) {
    throw new Error(
      'Please choose valid tokenSymbol that is supported by given pair of chains'
    );
  }

  const { nonce } = getTransferObject(
    transferConfigs,
    srcChainId,
    dstChainId,
    tokenSymbol,
    amount
  );

  return await transactor(
    originalTokenVault!.deposit(
      assetAddress,
      amount,
      dstChainId,
      walletAddress,
      nonce,
      { gasLimit: 200000 }
    )
  );
};

export const burn = async (
  transferToken: IAsset,
  amount: string,
  toChainId: number,
  toAccount: string
) => {
  const burnContract = getContract(
    transferToken.pegged_burn_contract_addr,
    PeggedTokenABI.abi
  );
  return await transactor(
    burnContract.burn(
      transferToken.token.address,
      amount,
      toChainId,
      toAccount,
      Date.now(),
      { gasLimit: 200000 }
    )
  );
};

export const needToApprove = async (
  walletAddress: string,
  transferToken: IAsset,
  amount: string
) => {
  const allowance = await getAllowance(
    walletAddress,
    transferToken.pegged_burn_contract_addr || '',
    transferToken.token.address
  );

  return checkApprove(allowance, amount, false);
};

export const approveTokenOnCeler = async (
  transferToken: IAsset,
  amount: string
) => {
  const approveTx = await approve(
    transferToken.pegged_burn_contract_addr,
    transferToken.token,
    amount
  );
  if (!approveTx) {
    throw new Error(`Cannot approve the token`);
  }
};
