import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { Coin, StdFee } from '@cosmjs/stargate';
import axios from 'axios';
import { Config } from 'helpers';
import { sortBy } from 'lodash';
import { isAndroid, isIOS } from 'react-device-detect';
import { makeSignDoc } from '@cosmjs/amino';
import { MsgSend } from 'cosmjs-types/cosmos/bank/v1beta1/tx';
import { isCoin98Browser } from '../../../helpers/wallet';
import { IPair } from 'pages/Pools/types';
import { CONTRACT_QUERY_SIZE } from 'constants/constants';
export type Expiration =
  | { readonly at_height: number }
  | { readonly at_time: number }
  | { readonly never: unknown };

export interface AllowanceResponse {
  readonly allowance: string; // integer as string
  readonly expires: Expiration;
}

export interface AllowanceInfo {
  readonly allowance: string; // integer as string
  readonly spender: string; // bech32 address
  readonly expires: Expiration;
}

export interface AllAllowancesResponse {
  readonly allowances: readonly AllowanceInfo[];
}

export interface TokenInfo {
  readonly name: string;
  readonly symbol: string;
  readonly decimals: number;
  readonly total_supply: string;
}

export interface Investment {
  readonly exit_tax: string;
  readonly min_withdrawal: string;
  readonly nominal_value: string;
  readonly owner: string;
  readonly staked_tokens: Coin;
  readonly token_supply: string;
  readonly validator: string;
}

export interface Claim {
  readonly amount: string;
  readonly release_at: { readonly at_time: number };
}

export interface Claims {
  readonly claims: readonly Claim[];
}

export interface AllAccountsResponse {
  // list of bech32 address that have a balance
  readonly accounts: readonly string[];
}

interface CreatePairProps {
  assetInfos: AssetInfo[];
  requirements: CreatePairRequirements;
  fee?: number | StdFee | 'auto';
  memo?: string;
  funds?: Coin[];
  address: string;
  lpTokenInfo: {
    lp_token_name: string;
    lp_token_symbol: string;
  };
}

interface ProvideLiquidityProps {
  address: string;
  assets: Asset[];
  receiver?: string;
  funds?: Coin[];
}

export interface Operations {
  halo_swap: {
    ask_asset_info: AssetInfo;
    offer_asset_info: AssetInfo;
  };
}

interface SwapFromCw20Props {
  offerToken: string;
  amount: string;
  minimumReceive: string;
  operations: Operations[];
}
interface SwapFromNativeProps {
  amount: string;
  offerAssetInfo: NativeAsset;
  operations: Operations[];
  minimumReceive: string;
}

interface RemoveLiquidityProps {
  amount: string;
  pairAddress: string;
  lpTokenAddress: string;
}

export type NativeAsset = {
  native_token: {
    denom: string;
  };
};

export type AssetInfo =
  | {
      token: {
        contract_addr: string;
      };
    }
  | {
      native_token: {
        denom: string;
      };
    };

export type Asset = {
  amount: string;
  info: AssetInfo;
};

export interface CreatePairRequirements {
  first_asset_minimum: string;
  second_asset_minimum: string;
  whitelist: string[];
}

export interface CW20Instance {
  readonly contractAddress: string;

  // queries
  balance: (address: string) => Promise<string>;
  allowance: (owner: string, spender: string) => Promise<AllowanceResponse>;
  allAllowances: (
    owner: string,
    startAfter?: string,
    limit?: number
  ) => Promise<AllAllowancesResponse>;
  allAccounts: (
    startAfter?: string,
    limit?: number
  ) => Promise<readonly string[]>;
  tokenInfo: () => Promise<TokenInfo>;
  investment: () => Promise<Investment>;
  claims: (address: string) => Promise<Claims>;
  minter: (sender: string) => Promise<any>;

  // actions
  mint: (sender: string, recipient: string, amount: string) => Promise<string>;
  transfer: (
    sender: string,
    recipient: string,
    amount: string
  ) => Promise<string>;
  burn: (sender: string, amount: string) => Promise<string>;
  increaseAllowance: (
    sender: string,
    recipient: string,
    amount: string
  ) => Promise<string>;
  decreaseAllowance: (
    sender: string,
    recipient: string,
    amount: string
  ) => Promise<string>;
  transferFrom: (
    sender: string,
    owner: string,
    recipient: string,
    amount: string
  ) => Promise<string>;
  bond: (sender: string, coin: Coin) => Promise<string>;
  unbond: (sender: string, amount: string) => Promise<string>;
  claim: (sender: string) => Promise<string>;
  createPair: ({}: CreatePairProps) => any;
  getPairs: () => Promise<any>;
  provideLiquidity: ({}: ProvideLiquidityProps) => Promise<any>;
  removeLiquidity: ({}: RemoveLiquidityProps) => Promise<any>;
  swapFromCw20: ({}: SwapFromCw20Props) => Promise<any>;
  swapFromNative: ({}: SwapFromNativeProps) => Promise<any>;
  sendTokens: (
    senderAddress: string,
    recipientAddress: string,
    amount: Coin[],
    fee: StdFee | 'auto' | number,
    memo?: string
  ) => Promise<any>;
}

export interface CW20Contract {
  use: (contractAddress: string) => CW20Instance;
}

const makeSignDocData = async (address: string, signDoc: any) => {
  const res = await axios.get(
    `${Config.indexerUri}/account-info?address=${address}&chainId=${signDoc.chain_id}`
  );

  const account = res.data.data.account_auth.account;

  return makeSignDoc(
    signDoc.msgs,
    signDoc.fee,
    signDoc.chain_id,
    signDoc.memo,
    account.account_number,
    account.sequence
  );
};

export const CW20 = (client: SigningCosmWasmClient): CW20Contract => {
  const use = (contractAddress: string): CW20Instance => {
    const _execute = async (
      senderAddress: string,
      contractAddress: string,
      msg: Record<string, unknown>,
      fee?: number | StdFee | 'auto',
      memo?: string,
      funds?: readonly Coin[]
    ) => {
      if (!isCoin98Browser() && (isAndroid || isIOS)) {
        const gasPrice = `${Config.chainInfo.gasPrice}${Config.chainInfo.feeToken}`;

        const signer = senderAddress;
        const chainId = Config.chainInfo.chainId;

        const param = funds
          ? {
              chainId,
              signer,
              contractAddress,
              msg,
              memo,
              gasPrice,
              fee,
              funds: funds
            }
          : {
              chainId,
              signer,
              contractAddress,
              msg,
              memo,
              gasPrice,
              fee
            };
        const _window = window as any;
        const response = await _window.clientMobile.request({
          method: 'cosmos_execute' as any,
          params: [param],
          id: _window.clientMobileId
        });
        const error = response?.result?.error || response?.error;
        if (error) {
          throw new Error(
            typeof error === 'string' ? error : JSON.stringify(error)
          );
        }
        return response?.result?.result || response?.result;
      }

      return await client.execute(
        senderAddress,
        contractAddress,
        msg,
        'auto',
        memo,
        funds
      );
    };

    const signAndBroadcast = (signer: string, signDoc: any) => {
      const _window = window as any;
      const chainId = Config.chainInfo.chainId;

      return _window.clientMobile.request({
        method: 'cosmos_signAndBroadcast' as any,
        params: [
          {
            chainId,
            signer,
            signDoc,
            isDirect: false
          }
        ]
      });
    };

    const balance = async (address: string): Promise<string> => {
      const result = await client.queryContractSmart(contractAddress, {
        balance: { address }
      });
      return result.balance;
    };

    const allowance = async (
      owner: string,
      spender: string
    ): Promise<AllowanceResponse> => {
      return client.queryContractSmart(contractAddress, {
        allowance: { owner, spender }
      });
    };

    const allAllowances = async (
      owner: string,
      startAfter?: string,
      limit?: number
    ): Promise<AllAllowancesResponse> => {
      return client.queryContractSmart(contractAddress, {
        all_allowances: { owner, start_after: startAfter, limit }
      });
    };

    const allAccounts = async (
      startAfter?: string,
      limit?: number
    ): Promise<readonly string[]> => {
      const accounts: AllAccountsResponse = await client.queryContractSmart(
        contractAddress,
        {
          all_accounts: { start_after: startAfter, limit }
        }
      );
      return accounts.accounts;
    };

    const tokenInfo = async (): Promise<TokenInfo> => {
      return client.queryContractSmart(contractAddress, { token_info: {} });
    };

    const investment = async (): Promise<Investment> => {
      return client.queryContractSmart(contractAddress, { investment: {} });
    };

    const claims = async (address: string): Promise<Claims> => {
      return client.queryContractSmart(contractAddress, {
        claims: { address }
      });
    };

    const minter = async (): Promise<any> => {
      return client.queryContractSmart(contractAddress, { minter: {} });
    };

    // mints tokens, returns transactionHash
    const mint = async (
      sender: string,
      recipient: string,
      amount: string
    ): Promise<string> => {
      const result = await _execute(
        sender,
        contractAddress,
        { mint: { recipient, amount } },
        'auto'
      );
      return result.transactionHash;
    };

    // transfers tokens, returns transactionHash
    const transfer = async (
      sender: string,
      recipient: string,
      amount: string
    ): Promise<string> => {
      const result = await _execute(
        sender,
        contractAddress,
        { transfer: { recipient, amount } },
        'auto'
      );
      return result.transactionHash;
    };

    // burns tokens, returns transactionHash
    const burn = async (sender: string, amount: string): Promise<string> => {
      const result = await _execute(
        sender,
        contractAddress,
        { burn: { amount } },
        'auto'
      );
      return result.transactionHash;
    };

    const increaseAllowance = async (
      sender: string,
      spender: string,
      amount: string
    ): Promise<string> => {
      const result = await _execute(
        sender,
        contractAddress,
        { increase_allowance: { spender, amount } },
        'auto'
      );
      return result.transactionHash;
    };

    const decreaseAllowance = async (
      sender: string,
      spender: string,
      amount: string
    ): Promise<string> => {
      const result = await _execute(
        sender,
        contractAddress,
        { decrease_allowance: { spender, amount } },
        'auto'
      );
      return result.transactionHash;
    };

    const transferFrom = async (
      sender: string,
      owner: string,
      recipient: string,
      amount: string
    ): Promise<string> => {
      const result = await _execute(
        sender,
        contractAddress,
        { transfer_from: { owner, recipient, amount } },
        'auto'
      );
      return result.transactionHash;
    };

    const bond = async (sender: string, coin: Coin): Promise<string> => {
      const result = await _execute(
        sender,
        contractAddress,
        { bond: {} },
        'auto',
        'bond',
        [coin]
      );
      return result.transactionHash;
    };

    const unbond = async (sender: string, amount: string): Promise<string> => {
      const result = await _execute(
        sender,
        contractAddress,
        { unbond: { amount } },
        'auto'
      );
      return result.transactionHash;
    };

    const claim = async (sender: string): Promise<string> => {
      const result = await _execute(
        sender,
        contractAddress,
        { claim: {} },
        'auto'
      );
      return result.transactionHash;
    };

    const createPair = async ({
      assetInfos,
      requirements,
      address,
      fee = 'auto',
      memo,
      funds,
      lpTokenInfo
    }: CreatePairProps) => {
      return await _execute(
        address,
        contractAddress,
        {
          create_pair: {
            asset_infos: assetInfos,
            lp_token_info: lpTokenInfo,
            requirements
          }
        },
        fee,
        memo,
        funds
      );
    };

    const getPairs = async (): Promise<any> => {
      const pairs: IPair[] = [];
      let lastPair: AssetInfo[] | null = null;

      const getData = async () => {
        const result = await client.queryContractSmart(contractAddress, {
          pairs: {
            limit: CONTRACT_QUERY_SIZE,
            start_after: lastPair
          }
        });

        pairs.push(...result.pairs);
        const hasMoreData = result.pairs.length;

        if (!hasMoreData) return;

        lastPair = result.pairs[result.pairs.length - 1].asset_infos;
        await getData();
      };

      await getData();
      return pairs;
    };

    const provideLiquidity = async ({
      address,
      assets,
      receiver,
      funds
    }: {
      address: string;
      assets: Asset[];
      receiver?: string;
      funds?: Coin[];
    }) => {
      return await _execute(
        address,
        contractAddress,
        {
          provide_liquidity: {
            assets,
            receiver
          }
        },
        'auto',
        'memo',
        funds ? sortBy(funds, (token) => token.denom) : undefined
      );
    };

    const removeLiquidity = async ({
      amount,
      pairAddress,
      lpTokenAddress
    }: RemoveLiquidityProps) => {
      const executeSendMsg = {
        send: {
          contract: pairAddress,
          amount,
          msg: Buffer.from(
            JSON.stringify({
              withdraw_liquidity: {}
            })
          ).toString('base64')
        }
      };

      return _execute(contractAddress, lpTokenAddress, executeSendMsg, 'auto');
    };

    const swapFromCw20 = async ({
      offerToken,
      amount,
      operations,
      minimumReceive
    }: SwapFromCw20Props) => {
      const hookMsg = {
        execute_swap_operations: {
          operations: operations,
          minimum_receive: minimumReceive
        }
      };

      const executeSendMsg = {
        send: {
          contract: Config.auraRouter,
          amount,
          msg: Buffer.from(JSON.stringify(hookMsg)).toString('base64')
        }
      };

      return await _execute(
        contractAddress,
        offerToken,
        executeSendMsg,
        'auto',
        'memo'
      );
    };

    const swapFromNative = async ({
      amount,
      offerAssetInfo,
      minimumReceive,
      operations
    }: SwapFromNativeProps) => {
      const msg = {
        execute_swap_operations: {
          operations,
          minimum_receive: minimumReceive
        }
      };

      return await _execute(
        contractAddress,
        Config.auraRouter,
        msg,
        'auto',
        'memo',
        [
          {
            amount,
            denom: offerAssetInfo.native_token.denom
          }
        ]
      );
    };

    // send tokens, returns transactionHash
    const sendTokens = async (
      senderAddress: string,
      recipientAddress: string,
      amount: Coin[],
      fee: StdFee | 'auto' | number,
      memo?: string
    ) => {
      if (isIOS || isAndroid) {
        const msg = MsgSend.fromPartial({
          fromAddress: senderAddress,
          toAddress: recipientAddress,
          amount
        });

        const msgs = {
          typeUrl: '/cosmos.bank.v1beta1.MsgSend',
          value: msg
        };

        const chainId = Config.chainInfo.chainId;
        const fee = Config.chainInfo.feeToken;

        const res = await makeSignDocData(contractAddress, {
          msgs,
          chain_id: chainId,
          fee,
          memo
        });

        const result = await signAndBroadcast(senderAddress, res);
        return result.result.transactionHash;
      }

      const result = await client.sendTokens(
        senderAddress,
        recipientAddress,
        amount,
        fee,
        memo
      );

      return result.transactionHash;
    };

    return {
      contractAddress,
      balance,
      allowance,
      allAllowances,
      allAccounts,
      tokenInfo,
      investment,
      claims,
      minter,
      mint,
      transfer,
      burn,
      increaseAllowance,
      decreaseAllowance,
      transferFrom,
      bond,
      unbond,
      claim,
      createPair,
      getPairs,
      provideLiquidity,
      removeLiquidity,
      swapFromCw20,
      swapFromNative,
      sendTokens
    };
  };
  return { use };
};
