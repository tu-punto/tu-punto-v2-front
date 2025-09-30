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
}) => (
  <div className="flex flex-col xl:flex-row justify-between mb-4">
    <StatCard
      title="PAGO PENDIENTE"
      value={`Bs. ${Number(pagoPendiente).toFixed(2)}`}
      color="#007bff"
    />
    <StatCard
      title="Deuda no pagada"
      value={`Bs. ${deuda}`}
      color="#1976d2"
    />
    <StatCard
      title="Saldo Pendiente"
      value={`Bs. ${Number(saldoPendiente).toFixed(2)}`}
      color="#1976d2"
    />
  </div>
);

export default StatsCards;
