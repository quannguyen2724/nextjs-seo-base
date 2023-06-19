import { Client } from '@coin98-com/connect-sdk';
import { URLS } from 'constants/url';
import { Config } from 'helpers';
import { useViewPort } from 'hooks';
import React, { useEffect, useRef, useState } from 'react';
import {
  isAndroid,
  isIOS,
  isMobile as isMobileDevice,
  isTablet
} from 'react-device-detect';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router';
import { commonActions } from '../../_redux';
import {
  selectChainConfig,
  selectIsAuraConfig,
  selectShowConnectWalletModal
} from '../../_redux/selectors';
import {
  LAST_USED_PROVIDER,
  WALLET_PROVIDER
} from '../../constants/wallet.constant';
import {
  WalletLoader,
  configKeplr,
  loadCoin98MobileWallet,
  loadCoin98Wallet,
  loadKeplrWallet,
  useError,
  useSdk
} from '../../core/logic';
import {
  deleteLocalStorage,
  getLocalStorage,
  setLocalStorage
} from '../../helpers/localStorage';
import { getProvider, isCoin98Browser } from '../../helpers/wallet';
import { useInterval } from '../../hooks/useInterval';
// import { walletService } from '../../services/wallet.service';
// import { useToast } from '../contexts/toast';
import AcceptAndSignModal from './AcceptAndSignModal';
import Account from './Account';
import ConnectWalletModal from './ConnectWalletModal';
import { selectTermOfService } from './_redux/selectors';
import { ApproveTermOfServiceRequest, WalletStorage } from './type';
import { Button } from '@mui/material';

export const Wallet: React.FC = () => {
  const { pathname } = useLocation();
  useState<boolean>(false);
  const [openAcceptAndSignModal, setOpenAcceptAndSignModal] =
    useState<boolean>(false);
  const dispatch = useDispatch();
  const { isMobile } = useViewPort();
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  const termOfService = useSelector(selectTermOfService);
  const isShowConnectWalletModal = useSelector(selectShowConnectWalletModal);
  const chainConfig = useSelector(selectChainConfig);
  const isAuraConfig = useSelector(selectIsAuraConfig);

  const { setError, clearError } = useError();
  const sdk = useSdk();

  // const toast = useToast();

  const walletKeyRef = useRef<any>({});
  const selectedProvider = useRef<WALLET_PROVIDER | undefined>(undefined);
  const walletClientRef = useRef<any>(undefined);

  const refreshBalance = async () => {
    if (sdk.initialized) {
      await sdk.refreshBalance();
    }
  };
  useInterval(refreshBalance, Config.intervalRefreshBalance);

  const init = async (loadWallet: WalletLoader) => {
    clearError();
    try {
      const config = chainConfig || configKeplr(Config.chainInfo);
      const signer = await loadWallet(config.chainId, walletClientRef.current);
      isAuraConfig && sdk.init(signer);

      // GlobalEvent.dispatchEvent(
      //   GlobalEvent.walletConnectedEvent(config.chainId)
      // );

      return signer;
    } catch (error) {
      console.error(error);
      setError(Error(error as any).message);
    }
  };

  const signWallet = async (_provider?: WALLET_PROVIDER) => {
    try {
      if (isFirstLogin && isAuraConfig) {
        const bech32Address = walletKeyRef.current?.bech32Address;
        const msg = `Welcome to Halo Trade!
          This message is only to authenticate yourself. Please sign to proceed with using Halo Trade.
          Signing this message will not trigger a blockchain transaction or cost any gas fees.
          Wallet address:
          ${bech32Address}
          Timestamp:
          ${new Date().getTime()}`;

        const walletProvider = await getProvider(
          _provider || selectedProvider.current!
        );

        const account = await walletProvider.signArbitrary(
          Config.chainInfo.chainId,
          bech32Address,
          msg
        );

        if (account?.error) {
          throw new Error(account.error);
        }
        const param: ApproveTermOfServiceRequest = {
          address: bech32Address,
          sign: account.signature,
          tosId: termOfService?.tos?.id,
          accept: true
        };
        // await walletService.approvedTermOfService(param);
      }

      let signer = null;
      if (_provider === WALLET_PROVIDER.COIN98) {
        if (isAndroid || isIOS) {
          if (isCoin98Browser()) {
            signer = await init(loadCoin98Wallet);
          } else {
            signer = await init(loadCoin98MobileWallet);
          }
        } else {
          signer = await init(loadCoin98Wallet);
        }
      } else {
        signer = await init(loadKeplrWallet);
      }

      let providerConnected = (signer as any).keplr?.isCoin98
        ? WALLET_PROVIDER.COIN98
        : WALLET_PROVIDER.KEPLR;
      if ((isAndroid || isIOS) && !!signer) {
        providerConnected = WALLET_PROVIDER.COIN98;
      }
      if (!isAndroid && !isIOS) {
        setLocalStorage(LAST_USED_PROVIDER, {
          provider: providerConnected,
          chainId: Config.chainInfo.chainId,
          timeStamp: new Date().getTime()
        });
      }

      setOpenAcceptAndSignModal(false);
      dispatch(commonActions.showConnectWalletModal({ open: false }));
      selectedProvider.current = providerConnected;
      if (!isCoin98Browser() && (isAndroid || isIOS)) return;
      // isAuraConfig &&
      //   toast.notify({
      //     notificationType: 'success',
      //     message: 'Connect successful',
      //     description: 'Welcome to HaloTrade'
      //   });
    } catch (error) {
      setError(Error(error as any).message);
      // toast.notify({
      //   notificationType: 'error',
      //   message: 'Connect error',
      //   description: 'Please try again'
      // });
    }
  };

  const connectWallet = async (keplr: any, prodvider: WALLET_PROVIDER) => {
    try {
      const lastProvider = getLocalStorage<any>(LAST_USED_PROVIDER);
      if (lastProvider) {
        if (lastProvider.provider === WALLET_PROVIDER.COIN98) {
          if (isMobileDevice || isTablet) {
            await init(loadCoin98MobileWallet);
          } else {
            await init(loadCoin98Wallet);
          }
        } else {
          await init(loadKeplrWallet);
        }

        selectedProvider.current = lastProvider.provider;
      } else if (isAuraConfig && !isAndroid && !isIOS) {
        const walletKey = await keplr.getKey(Config.chainInfo.chainId);
        walletKeyRef.current = walletKey;

        // const isFirstLogin = await walletService.checkIsFirstLogin(
        //   walletKey.bech32Address
        // );
        setIsFirstLogin(isFirstLogin);
        if (isFirstLogin) {
          setOpenAcceptAndSignModal(true);
          return;
        }

        await signWallet(prodvider);
      } else {
        await signWallet(prodvider);
      }
    } catch (error) {
      console.error(error);
      setError(Error(error as any).message);
    }
  };

  const handleConnect = async (
    provider: WALLET_PROVIDER,
    firstLoad = false
  ) => {
    try {
      dispatch(commonActions.showConnectWalletModal({ open: false }));
      if (sdk.initialized && isAuraConfig) {
        if (selectedProvider.current === provider) {
          return;
        }
      }

      if (isAndroid || isIOS) {
        deleteLocalStorage(LAST_USED_PROVIDER);
      }

      const keplr = await getProvider(provider, firstLoad);

      const chain = chainConfig || configKeplr(Config.chainInfo);
      if (keplr) {
        await keplr.experimentalSuggestChain(chain);
        await keplr.enable(chain.chainId);
        await connectWallet(keplr, provider);
      } else {
        if (isAndroid || isIOS) {
          const client = new Client();

          const res: any = await client.connect(Config.chainInfo.chainId, {
            logo: 'https://i.imgur.com/zi0mTYb.png',
            name: 'HaloTrade',
            url: isIOS ? window.location.href : window.location.origin
          });
          const { result, id } = res;
          if (result && id) {
            (window as any).clientMobileId = res.id;
          }
          walletClientRef.current = client;
          (window as any).clientMobile = client;
          await connectWallet(null, provider);
        }
      }
    } catch (error: any) {
      console.error(error);
      setError(Error(error as any).message);
    }
  };

  useEffect(() => {
    async function connect(firstLoad = false) {
      const lastProvider = getLocalStorage<WalletStorage>(LAST_USED_PROVIDER);
      if (lastProvider) {
        await handleConnect(lastProvider.provider, firstLoad);
      } else if (pathname === URLS.ASSETS) {
        // toast.notify({
        //   notificationType: 'warning',
        //   message: 'Connect wallet to view Assets',
        //   action: {
        //     label: 'Connect Wallet',
        //     linkTo: '',
        //     onClick: (e) => {
        //       e.preventDefault();
        //       dispatch(commonActions.showConnectWalletModal({ open: true }));
        //     }
        //   }
        // });
      }
    }
    connect(true);

    // const onKeplrKeyStoreChange = () => {
    //   connect();
    // };

    // window.addEventListener('keplr_keystorechange', onKeplrKeyStoreChange);

    return () => {
      // window.removeEventListener('keplr_keystorechange', onKeplrKeyStoreChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const acceptAndSignModal = () => (
    <AcceptAndSignModal
      open={openAcceptAndSignModal}
      onOk={() => signWallet()}
      onCancel={() => {
        setOpenAcceptAndSignModal(false);
      }}
    />
  );

  const renderConnectWallet = () => (
    <div>
        <Button
          onClick={() =>
            dispatch(commonActions.showConnectWalletModal({ open: true }))
          }
        >
          {isMobile ? 'Connect' : 'Connect Wallet'}
        </Button>

      {openAcceptAndSignModal && acceptAndSignModal()}
    </div>
  );

  return (
    <>
      {sdk.initialized ? (
        <Account
          onChangeWallet={() =>
            dispatch(commonActions.showConnectWalletModal({ open: true }))
          }
        />
      ) : (
        renderConnectWallet()
      )}

      {isShowConnectWalletModal && (
        <ConnectWalletModal
          open={isShowConnectWalletModal}
          connect={handleConnect}
          onClose={() =>
            dispatch(commonActions.showConnectWalletModal({ open: false }))
          }
        />
      )}
    </>
  );
};
