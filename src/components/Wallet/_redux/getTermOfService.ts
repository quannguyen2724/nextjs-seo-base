import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import { APIMapping } from 'services';
import get from 'lodash/get';
import set from 'lodash/set';
import { ITermOfService, TermOfServiceData, WalletState } from '../type';

export const getTermOfService = createAsyncThunk<
  TermOfServiceData,
  undefined,
  ThunkAPIConfig
>('getTermOfService', async (args: undefined, thunkAPI) => {
  const { walletService } = get(thunkAPI, 'extra') as APIMapping;

  const response = await walletService.getTermOfService();
  const res = get(response, ['data', 'data', 'res'], []);
  const tos = res?.find(
    (f: ITermOfService) => f.status === '1' && f.name === 'tos'
  );
  const pp = res?.find(
    (f: ITermOfService) => f.status === '1' && f.name === 'pp'
  );
  return { tos, pp };
});

export const getTermOfServiceBuilder = (
  builder: ActionReducerMapBuilder<WalletState>
) => {
  builder.addCase(getTermOfService.pending, (draftState) => {
    set(draftState, 'loading', true);
  });
  builder.addCase(getTermOfService.fulfilled, (draftState, action) => {
    return {
      ...draftState,
      termOfServiceData: action.payload,
      loading: false,
      error: false
    };
  });
  builder.addCase(getTermOfService.rejected, (draftState) => {
    set(draftState, 'loading', false);
    set(draftState, 'error', true);
  });
};
