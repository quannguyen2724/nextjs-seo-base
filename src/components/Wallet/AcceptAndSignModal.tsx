import { isFunction } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { walletActions } from './_redux';
import { useEffect } from 'react';
import {
  selectAcceptAndSignLoading,
  selectTermOfService
} from './_redux/selectors';
import { Button, Modal } from '@mui/material';

interface AcceptAndSignModalProps {
  open: boolean;
  onOk: () => void;
  onCancel: () => void;
}
const AcceptAndSignModal: React.FC<AcceptAndSignModalProps> = ({
  open,
  onOk,
  onCancel,
  ...props
}) => {
  const dispatch = useDispatch();

  const termOfService = useSelector(selectTermOfService);
  const isLoading = useSelector(selectAcceptAndSignLoading);

  const handleOk = (e: React.MouseEvent) => {
    isFunction(onOk) && onOk();
  };
  const handleCancel = (e: React.MouseEvent) => {
    isFunction(onCancel) && onCancel();
  };

  useEffect(() => {
    dispatch(walletActions.getTermOfService());
  }, [dispatch]);

  return (
    <Modal open={open} {...props} >
      <div className="d-flex flex-column justify-content-center align-items-center">
        <div className="mt-16">
          By connecting your wallet and using HaloTrade you agree to our
        </div>
        <div className="mt-4">
          <a
            className="link pr-4"
            href={termOfService?.tos?.api}
            target="_blank"
            rel="noreferrer"
          >
            <span>Terms of Service</span>
          </a>
          <span>and</span>
          <a
            className="link pl-4"
            href={termOfService?.pp?.api}
            target="_blank"
            rel="noreferrer"
          >
            <span>Privacy Policy</span>
          </a>
        </div>
        <div className="w-100 mt-24 px-16 pb-24">
          <div >
            <Button fullWidth onClick={handleCancel}>
              Cancel
            </Button>
          </div>
          <div  className="">
            <Button
              fullWidth
              onClick={handleOk}
            >
              Accept and Sign
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AcceptAndSignModal;
