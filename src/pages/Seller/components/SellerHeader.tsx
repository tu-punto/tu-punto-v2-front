import React from 'react';

const SellerHeader: React.FC<{ name: string }> = ({ name }) => (
  <h2 className="text-mobile-sm xl:text-desktop-sm mb-2">
    Información del Vendedor: {name}
  </h2>
);

export default SellerHeader;
