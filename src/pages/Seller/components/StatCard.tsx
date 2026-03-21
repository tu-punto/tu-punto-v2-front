import React from 'react';

interface StatCardProps {
  title: React.ReactNode;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  helperText?: React.ReactNode;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  helperText,
  color = '#1976d2',
}) => (
  <div
    style={{
      background: `linear-gradient(180deg, ${color} 0%, ${color}dd 100%)`,
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.18)',
      boxShadow: '0 12px 28px rgba(15, 23, 42, 0.14)',
      transition: 'transform 180ms ease, box-shadow 180ms ease',
    }}
    className="w-full max-w-[360px] p-5 rounded-2xl min-h-[148px] flex flex-col justify-between text-left motion-safe:hover:scale-[1.02] motion-safe:hover:-translate-y-0.5"
  >
    <div>
      <h3
        className="text-mobile-sm xl:text-desktop-sm leading-tight"
        style={{ fontSize: "17px", fontWeight: 600 }}
      >
        {title}
      </h3>
      {subtitle ? (
        <div
          className="mt-1"
          style={{ fontSize: "13px", lineHeight: 1.35, opacity: 0.95 }}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
    {helperText ? (
      <div
        className="mt-1"
        style={{ fontSize: "12px", lineHeight: 1.4, opacity: 0.86 }}
      >
        {helperText}
      </div>
    ) : null}
    <h2
      className="text-mobile-sm xl:text-desktop-sm mt-3"
      style={{ fontSize: "24px", fontWeight: 700, lineHeight: 1.2 }}
    >
      {value}
    </h2>
  </div>
);

export default StatCard;
