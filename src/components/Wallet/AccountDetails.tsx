import coin98 from 'assets/images/coin98.png';
import keplr from 'assets/images/keplr.png';
import { URLS } from 'constants/url';
import { LAST_USED_PROVIDER, WALLET_PROVIDER } from 'constants/wallet.constant';
import {
  Config,
  deleteLocalStorage,
  formatFromUnit,
  getDecimalsFromConfig,
  getLocalStorage
} from 'helpers';
import { useBoolean, useViewPort } from 'hooks';
import { useMemo } from 'react';
import { isAndroid, isIOS } from 'react-device-detect';
import { useDispatch } from 'react-redux';
import { useSdk } from '../../core/logic';
import { WalletStorage } from './type';
import { Button } from '@mui/material';

export const providerMapping = {
  [WALLET_PROVIDER.COIN98]: { logo: coin98, name: 'Coin98' },
  [WALLET_PROVIDER.KEPLR]: { logo: keplr, name: 'Keplr' }
};

interface AccountDetailsProps {
  onChangeWallet: () => void;
}

const AccountDetails: React.FC<AccountDetailsProps> = ({ onChangeWallet }) => {
  const dispatch = useDispatch();

  const { isMobile } = useViewPort();
  const { address, clear, balance } = useSdk();
  const provider = getLocalStorage<WalletStorage>(LAST_USED_PROVIDER);
  let providerInfo = provider?.provider
    ? providerMapping[provider.provider]
    : ({} as any);
  if (isAndroid || isIOS) {
    providerInfo = providerMapping[WALLET_PROVIDER.COIN98];
  }

  const {
    value: isCopied,
    setTrue: copySuccess,
    setFalse: copyDone
  } = useBoolean(false);
  const { value: showBalance, toggle: toggleBalance } = useBoolean(false);

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(address);
      copySuccess();

      const timeoutId = setTimeout(() => {
        copyDone();
        clearTimeout(timeoutId);
      }, 1000);
    } catch {}
  };

  const disconnectWallet = async () => {
    clear();
    (window as any).clientMobile = undefined;
    deleteLocalStorage(LAST_USED_PROVIDER);
  };

  const coinAmount = useMemo(
    () =>
      formatFromUnit(
        balance?.[0]?.amount,
        getDecimalsFromConfig(balance?.[0]?.denom)
      ),
    [balance]
  );

  return (
    <>
      <div className="text-center">
        <img src={providerInfo?.logo} alt="Provider logo" />
        <div className="text-gray-10_0-5 mt-8">
          Connected with {providerInfo?.name}
        </div>
      </div>
      <div className="account-address" onClick={handleCopy}>
        <span className="text-ellipsis text-gray-black_0-5">{address}</span>
      </div>
      <div className="d-flex align-items-center justify-content-between mt-16">
        <span className="text-gray-7_5">AURA Balance</span>
        <div className="d-flex align-items-center gap-4">
          <img src="/images/aura-coin.png" alt="coin" />
          <span className="fw-600 text-gray-10_2">
            {showBalance ? coinAmount : '••••'}
          </span>
        </div>
      </div>
      <div className="d-flex align-items-center justify-content-between mt-16">
        <a
          className="link"
          target="_blank"
          href={`${Config.auraScanUrl}/account/${address}`}
          rel="noreferrer"
        >
          <span>View Transaction</span>
        </a>
      </div>
      <div className="d-flex gap-16 mt-24">
        <Button fullWidth onClick={disconnectWallet}>
          Disconnect
        </Button>
        <Button
          fullWidth
          disabled={isMobile}
          onClick={() => !isMobile && onChangeWallet()}
        >
          Change Wallet
        </Button>
      </div>
    </>
  );
};

export default AccountDetails;
