
import { ellipsisAddress } from 'helpers/ellipsisAddress';
import { useMemo } from 'react';


interface AccountButtonProps {
  address: string;
  avatar?: string;
  pendingTsx?: number;
}
const AccountButton: React.FC<AccountButtonProps> = ({
  address,
  avatar = '/images/avatar.png',
  pendingTsx
}) => {
  const pending = useMemo(() => !!pendingTsx && pendingTsx > 0, [pendingTsx]);
  const className = 'account-btn';

  return (
    <button className={className}>
      {pending && (
        <>
          
          <span>({pendingTsx}) Pending</span>
        </>
      )}
      {!pending && (
        <>
          <span>{ellipsisAddress(address, 6, 4)}</span>
          <img
            className="account-btn__avatar"
            src={avatar}
            alt="account avatar"
          />
        </>
      )}
    </button>
  );
};

export default AccountButton;
