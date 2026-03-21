import React from 'react';
import StatCard from './StatCard';

interface StatsCardsProps {
  pagoPendiente : number | string;
  deuda         : number | string;
  saldoPendiente: number | string;
}

const StatsCards: React.FC<StatsCardsProps> = ({
  pagoPendiente,
  deuda,
  saldoPendiente,
}) => {
  const formatMoney = (value: number | string) => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
  };

  return (
    <div className="flex flex-col xl:flex-row justify-between mb-4">
      <StatCard
        title="PAGO PENDIENTE"
        value={`Bs. ${formatMoney(pagoPendiente)}`}
        color="#007bff"
      />
      <StatCard
        title="Deuda no pagada"
        value={`Bs. ${formatMoney(deuda)}`}
        color="#1976d2"
      />
      <StatCard
        title="Saldo Pendiente"
        value={`Bs. ${formatMoney(saldoPendiente)}`}
        color="#1976d2"
      />
    </div>
  );
};

export default StatsCards;
