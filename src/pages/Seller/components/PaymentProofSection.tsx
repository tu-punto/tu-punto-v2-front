import React from 'react';
import PaymentProofPDF from '../../GeneratePDF/PaymentProofPDF';
import PaymentProofTable from './PaymentProofTable';

const PaymentProofSection: React.FC<{ proofs: any[]; sellerId: number }> = ({
  proofs,
  sellerId,
}) => (
  <section className="mb-4 overflow-x-auto">
    <h4 className="font-bold text-mobile-sm xl:text-desktop-sm mb-2">
      Comprobante de pago
    </h4>
    <PaymentProofPDF sellerId={sellerId} />
    <PaymentProofTable data={proofs} />
  </section>
);

export default PaymentProofSection;
