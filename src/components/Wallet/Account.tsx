
import { useViewPort } from 'hooks';
import { useState } from 'react';
import { useSdk } from '../../core/logic';
import AccountButton from './AccountButton';
import AccountDetails from './AccountDetails';
import { Modal, Popover } from '@mui/material';

interface AccountProps {
  onChangeWallet: () => void;
}

const Account: React.FC<AccountProps> = ({ onChangeWallet }) => {
  const { address } = useSdk();
  const [openAccountInfo, setOpenAccountInfo] = useState(false);
  const { isMobile } = useViewPort();

  if (isMobile)
    return (
      <>
        <div onClick={() => setOpenAccountInfo(true)}>
          <AccountButton address={address} />
        </div>
        {/* {openAccountInfo && (
          <Modal
            open
            onCancel={() => setOpenAccountInfo(false)}
            hideHeader
            className="account-details-popup"
          >
            <AccountDetails
              onChangeWallet={() => {
                setOpenAccountInfo(false);
                onChangeWallet();
              }}
            />
          </Modal>
        )} */}
      </>
    );

  return (
    <div>
      {/* <Popover
    placement="bottomRight"
    autoAdjustOverflow
    open={openAccountInfo}
    onOpenChange={setOpenAccountInfo}
    content={
      <AccountDetails
        onChangeWallet={() => {
          setOpenAccountInfo(false);
          onChangeWallet();
        }}
      />
    }
    trigger="click"
    overlayClassName="account-details-popup"
  >
    <div>
      <AccountButton address={address} />
    </div>
      </Popover> */}
    </div>
    
  );
};

export default Account;
