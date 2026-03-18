import React from 'react';

interface SellerHeaderProps {
  name: string;
  isSeller?: boolean;
}

const SellerHeader: React.FC<SellerHeaderProps> = ({ name, isSeller = false }) => {
  if (isSeller) {
    return (
      <div
        className="mb-4 rounded-2xl px-5 py-4 text-center"
        style={{
          background:
            "linear-gradient(135deg, rgba(235,244,255,0.96) 0%, rgba(221,236,255,0.92) 100%)",
          border: "1px solid rgba(24, 119, 242, 0.14)",
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#1d4f91",
            fontWeight: 700,
            marginBottom: "6px",
          }}
        >
          Bienvenido
        </div>
        <h2
          className="text-mobile-sm xl:text-desktop-sm m-0"
          style={{ fontSize: "26px", fontWeight: 700, color: "#0f2f57" }}
        >
          {name}
        </h2>
      </div>
    );
  }

  return (
    <h2 className="text-mobile-sm xl:text-desktop-sm mb-2 text-center">
      Informacion del Vendedor: {name}
    </h2>
  );
};

export default SellerHeader;
