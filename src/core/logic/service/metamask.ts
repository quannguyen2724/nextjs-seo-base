import { ToastContextType } from 'components/contexts/toast';
import { isIOS } from 'react-device-detect';

export const connectMetamaskWallet = async (
  chainInfo: any,
  toast: ToastContextType,
  connectFirst = true
) => {
  const _window = window as any;
  const isInstalled = Boolean(_window.ethereum?.isMetaMask || false);

  if (!isInstalled) {
    return toast.notify({
      notificationType: 'error',
      message: 'Please Install Metamask!'
    });
  }
  if (connectFirst || !isIOS) {
    (await _window.ethereum.request({
      method: 'eth_requestAccounts'
    })) as string[];
  }

  if (!isIOS || !connectFirst) {
    try {
      await _window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainInfo.chainId }]
      });
    } catch (err: any) {
      console.log(err);
      if (err.code === 4902) {
        await _window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{ ...chainInfo, chainId: chainInfo.chainId }]
        });
      }
    }
  }
};
