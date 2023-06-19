import { WALLET_PROVIDER } from '../../constants/wallet.constant';

export type WalletStorage = {
  provider: WALLET_PROVIDER;
  chainId: string;
  timestamp: number;
};
export type ITermOfService = {
  id: number;
  name: string;
  api: string;
  status: string;
};
export type TermOfServiceData = {
  tos: ITermOfService;
  pp: ITermOfService;
};

export type ApproveTermOfServiceRequest = {
  address: string;
  sign: string;
  tosId: number;
  accept: boolean;
};

export interface WalletState {
  termOfServiceData: TermOfServiceData;
  loading?: boolean;
  error?: boolean;
}
