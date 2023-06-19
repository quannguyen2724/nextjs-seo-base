import axios from 'axios';
import { ITransferConfigs } from './celer.types';
import { Config } from 'helpers';
import { WebClient } from '../ts-proto/gateway/GatewayServiceClientPb';
import { GetTransferStatusRequest } from '../ts-proto/gateway/gateway_pb';

interface IEstimateAmt {
  src_chain_id: number;
  dst_chain_id: number;
  token_symbol: string;
  usr_addr?: string;
  slippage_tolerance: string;
  amt: string;
  is_pegged: boolean;
}

export const getTransferConfigs = (): Promise<ITransferConfigs> =>
  axios
    .get(`${Config.celerUrl}/v2/getTransferConfigs`)
    .then(({ data }) => data)
    .catch((err) => console.log(err));

export const estimateAmt = ({
  src_chain_id,
  dst_chain_id,
  token_symbol,
  usr_addr,
  slippage_tolerance,
  amt,
  is_pegged
}: IEstimateAmt) => {
  return axios
    .get(`${Config.celerUrl}/v2/estimateAmt`, {
      params: {
        src_chain_id,
        dst_chain_id,
        token_symbol,
        usr_addr,
        slippage_tolerance,
        amt,
        is_pegged
      }
    })
    .then(({ data }) => data)
    .catch((err) => console.log(err));
};

export const getTransferStatus = async (
  rpc: string,
  transferId: string
): Promise<any> => {
  const client = new WebClient(rpc, null, null);
  const statusRequest = new GetTransferStatusRequest();
  statusRequest.setTransferId(transferId);
  const transferStatus = await client.getTransferStatus(statusRequest, null);

  return transferStatus.toObject();
};

export const getArrivalTime = (srcChain: number, dstChain: number) =>
  axios
    .get(`${Config.celerUrl}/v2/getLatest7DayTransferLatencyForQuery`, {
      params: {
        src_chain_id: srcChain,
        dst_chain_id: dstChain
      }
    })
    .then(({ data }) => data)
    .catch((err) => console.log(err));

export const statusTracker = async (
  rpc: string,
  transferId: string,
  callback?: any,
  statusCode?: number
) => {
  let observerdStatus: number = statusCode ? statusCode : 0;
  const transferStatusResponse = async () => {
    const res: any = await getTransferStatus(rpc, transferId);

    if (res.status === 1 && res.status !== observerdStatus) {
      observerdStatus = res.status;
      console.info('cBRIDGE => TRANSFER_SUBMITTING');
    } else if (res.status === 2 && res.status !== observerdStatus) {
      observerdStatus = res.status;
      console.error('cBRIDGE => TRANSFER_FAILED');
      clearInterval(interval);
    } else if (res.status === 3 && res.status !== observerdStatus) {
      observerdStatus = res.status;
      console.info('cBRIDGE => TRANSFER_WAITING_FOR_SGN_CONFIRMATION');
    } else if (res.status === 4 && res.status !== observerdStatus) {
      observerdStatus = res.status;
      console.info('cBRIDGE => TRANSFER_WAITING_FOR_FUND_RELEASE');
    } else if (res.status === 5 && res.status !== observerdStatus) {
      observerdStatus = res.status;
      console.log('cBRIDGE => TRANSFER_COMPLETED');
      clearInterval(interval);
    } else if (res.status === 6 && res.status !== observerdStatus) {
      observerdStatus = res.status;
      console.warn('cBRIDGE => TRANSFER_TO_BE_REFUNDED');
      console.log(
        'Initiate the Refund process, e.g: use-cases/***FlowRefund.ts'
      );
      clearInterval(interval);
      callback ? callback(res) : null;
    } else if (res.status === 7 && res.status !== observerdStatus) {
      observerdStatus = res.status;
      console.info('cBRIDGE => TRANSFER_REQUESTING_REFUND');
    } else if (res.status === 8 && res.status !== observerdStatus) {
      observerdStatus = res.status;
      console.warn('cBRIDGE => TRANSFER_REFUND_TO_BE_CONFIRMED');
      callback ? callback(res) : null;
    } else if (res.status === 9 && res.status !== observerdStatus) {
      observerdStatus = res.status;
      console.info('cBRIDGE => TRANSFER_CONFIRMING_YOUR_REFUND');
    } else if (res.status === 10 && res.status !== observerdStatus) {
      observerdStatus = res.status;
      console.log('cBRIDGE => TRANSFER_REFUNDED');
      clearInterval(interval);
    }
  };
  const interval = setInterval(transferStatusResponse, 10000); // 10 seconds interval
  transferStatusResponse();
};
