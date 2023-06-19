import { ConnectWallet as ConnectWalletBase } from './connectWallet'
import { compose } from 'ramda'
import { withApi } from './with-api'
import { withStyle } from './with-style'
import { withCssModule } from './with-css-module'

export const ConnectWallet = compose(
  withCssModule,
  withStyle,
  withApi
)(ConnectWalletBase)

//  export * from './connectWallet'