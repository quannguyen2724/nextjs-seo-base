import React, { useState } from 'react';
import { ConnectWallet } from '../connectWallet';

declare global {
  interface Window {
    // ⚠️ notice that "Window" is capitalized here
    keplr: any;
    getOfflineSigner: any;
  }
}

const Header = ({}) => {
  return (
    <header>
      <div className='bg-black'>My Next.js App</div>
      <ConnectWallet></ConnectWallet>
    </header>
  );
};

export default Header;
