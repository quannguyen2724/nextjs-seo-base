import { createSlice } from '@reduxjs/toolkit';
import { WalletState } from '../type';

import { getTermOfService, getTermOfServiceBuilder } from './getTermOfService';

const { reducer, actions } = createSlice({
  name: 'wallet',
  initialState: {
    termOfServiceData: {}
  } as WalletState,
  reducers: {},
  extraReducers: (builder) => {
    getTermOfServiceBuilder(builder);
  }
});

const allActions = { ...actions, getTermOfService };

export { reducer, allActions as walletActions };
