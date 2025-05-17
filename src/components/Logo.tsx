import React from 'react';
import DittoLogo from '@/assets/DittoLogoFinal.png';

const Logo: React.FC = () => {
  return (
    <img
      src={DittoLogo}
      alt="Ditto logo"
      className="h-16 w-auto object-contain"
      style={{ maxHeight: 64 }}
    />
  );
};

export default Logo;
