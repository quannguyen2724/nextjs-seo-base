import { createSelector } from 'reselect';
import { AppState } from 'storeConfig';
import { TermOfServiceData } from '../type';

export const selectTermOfService = createSelector(
  (state: AppState) => state.wallet.termOfServiceData,
  (data: TermOfServiceData) => {
    return data;
  }
);
export const selectAcceptAndSignLoading = createSelector(
  (state: AppState) => state.wallet.loading,
  (loading?: boolean) => loading
);
