import React from 'react';
import PaymentProofTable from './PaymentProofTable';

const PaymentProofSection: React.FC<{ proofs: any[]; sellerId: number }> = ({
  proofs,
}) => (
  <section className="mb-4 overflow-x-auto">
    <h4 className="font-bold text-mobile-sm xl:text-desktop-sm mb-2">
      Comprobante de pago
    </h4>
    <PaymentProofTable data={proofs} />
  </section>
);

export default PaymentProofSection;
