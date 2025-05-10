import React from 'react';

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  color = '#1976d2',
}) => (
  <div
    style={{ background: color, color: '#fff' }}
    className="w-full xl:w-3/6 p-4 rounded-lg text-center m-1"
  >
    <h3 className="text-mobile-sm xl:text-desktop-sm">{title}</h3>
    <h2 className="text-mobile-sm xl:text-desktop-sm">{value}</h2>
  </div>
);

export default StatCard;
