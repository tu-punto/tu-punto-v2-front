import { Card, Statistic } from "antd";
import { ReactNode } from "react";

interface StatisticCardProps {
  title: string;
  value: number;
  prefix: ReactNode;
  color: string;
}

const StatisticCard = ({ title, value, prefix, color }: StatisticCardProps) => (
  <Card className="h-full shadow-sm">
    <Statistic
      title={<span className="font-semibold text-lg">{title}</span>}
      value={value}
      precision={2}
      valueStyle={{ color, fontSize: "24px" }}
      prefix={<span className="text-xl">{prefix}</span>}
    />
  </Card>
);

export default StatisticCard;
