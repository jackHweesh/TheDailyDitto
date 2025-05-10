
import React from 'react';

const Logo: React.FC = () => {
  return (
    <div className="flex items-center">
      <div className="bg-alike-teal rounded-full p-2 mr-2">
        <span className="text-white font-bold">A</span>
      </div>
      <span className="text-2xl font-bold text-alike-navy">
        <span>a</span>
        <span className="text-alike-teal">like</span>
      </span>
    </div>
  );
};

export default Logo;
