import React from 'react';
import StatCard from './StatCard';

interface StatsCardsProps {
  pagoPendiente : number | string;
  deuda         : number | string;
  saldoPendiente: number | string;
  ultimaFechaPago?: string | null;
}

const StatsCards: React.FC<StatsCardsProps> = ({
  pagoPendiente,
  deuda,
  saldoPendiente,
  ultimaFechaPago,
}) => {
  const formatMoney = (value: number | string) => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
  };
  const deudaSubtitle = ultimaFechaPago
    ? `Desde ${ultimaFechaPago}`
    : undefined;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5 justify-items-center">
      <StatCard
        title="Monto por cobrar"
        helperText="(Saldo acumulado - deuda pendiente)"
        value={`Bs. ${formatMoney(pagoPendiente)}`}
        color="#007bff"
      />
      <StatCard
        title="Deuda pendiente"
        subtitle={deudaSubtitle}
        helperText="(este monto se descuenta al momento del cobro)"
        value={`Bs. ${formatMoney(deuda)}`}
        color="#1976d2"
      />
      <StatCard
        title="Saldo acumulado"
        value={`Bs. ${formatMoney(saldoPendiente)}`}
        color="#1976d2"
      />
    </div>
  );
};

export default StatsCards;
