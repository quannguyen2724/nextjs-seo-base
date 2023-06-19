import { isFunction } from 'lodash';
import { WALLET_PROVIDER } from '../../constants/wallet.constant';
import { useViewPort } from 'hooks';
import { Modal } from '@mui/material';

interface ConnectWalletModalProps {
  open: boolean;
  onClose?: () => void;
  connect: (provider: WALLET_PROVIDER) => void;
}
const ConnectWalletModal: React.FC<ConnectWalletModalProps> = ({
  open,
  onClose,
  connect,
  ...props
}) => {
  const { isMobile } = useViewPort();
  const handleClose = () => {
    isFunction(onClose) && onClose();
  };

  return (
    <Modal
      open={open}
      className="connect-wallet-modal"
      onClose={handleClose}
      {...props}
    >
      <div>
        <div >
          <div
            className="wallet-btn"
            onClick={() => connect(WALLET_PROVIDER.COIN98)}
          >
            <div>Coin98</div>
            <div>
              <img src='/public/assets/images/logo/coin98.png' alt="coin98Icon" />
            </div>
          </div>
        </div>
        <div className="mt-16">
          <div
             className="wallet-btn"
            onClick={() => !isMobile && connect(WALLET_PROVIDER.KEPLR)}
          >
            <div>Keplr</div>
            <div>
              <img src='/public/assets/images/logo/keplr.png' alt="keplrIcon" />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ConnectWalletModal;
