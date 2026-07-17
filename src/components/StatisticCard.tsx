import { Card } from "antd";
import { ReactNode } from "react";

interface StatisticCardProps {
  title: string;
  value: number;
  prefix: ReactNode;
  color: string;
}

const StatisticCard = ({ title, value, prefix, color }: StatisticCardProps) => (
  <Card
    className="h-full overflow-hidden shadow-sm transition-shadow hover:shadow-lg"
    style={{
      borderTop: `4px solid ${color}`,
      borderRadius: 20,
      background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
    }}
    bodyStyle={{ padding: 20 }}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">{title}</div>
        <div className="mt-3 flex items-center gap-3">
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-50 shadow-inner"
            style={{ color }}
          >
            <span className="text-xl">{prefix}</span>
          </div>
          <div className="min-w-0 text-3xl font-black tracking-tight" style={{ color }}>
            {new Intl.NumberFormat("es-BO", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(Number(value || 0))}
          </div>
        </div>
      </div>
    </div>
  </Card>
);

export default StatisticCard;
