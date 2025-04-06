import {
  Card,
  Row,
  Col,
  Statistic,
  Spin,
  Tag,
  DatePicker,
  Typography,
  Space,
  Alert,
} from "antd";
import {
  DollarOutlined,
  ShoppingCartOutlined,
  RiseOutlined,
  CarOutlined,
} from "@ant-design/icons";
import { FC, useEffect, useState } from "react";
import { DATE_TAGS } from "../../constants/fluxes";
import { getFilteredStats } from "../../helpers/financeFluxesHelpers";
import dayjs from "dayjs";
import StatisticCard from "../../components/StatisticCard";

const StatisticsDashboard = () => {
  const [stats, setStats] = useState<any>();
  const [selectedTag, setSelectedTag] = useState<string | null>(
    DATE_TAGS.LAST_30_DAYS
  );
  const [customDateRange, setCustomDateRange] = useState<any>([]);

  const fetchStats = async (filter: string = DATE_TAGS.ALL_TIME) => {
    try {
      const statsInfo = await getFilteredStats(filter, customDateRange);
      setStats(statsInfo);
    } catch (error) {
      console.error(error);
    }
  };

  const onTagClick = (tag: string) => {
    setSelectedTag(tag);
    if (tag !== DATE_TAGS.CUSTOM) {
      setCustomDateRange([]);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchStats(selectedTag || DATE_TAGS.ALL_TIME);
  }, [selectedTag]);

  if (!stats) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <Spin size="large" tip="Cargando estadísticas..." />
      </div>
    );
  }

  const espTags = [
    "ÚLTIMOS 7 DÍAS",
    "ÚLTIMOS 30 DÍAS",
    "ÚLTIMOS 90 DÍAS",
    "ESTE AÑO",
    "FECHA PERSONALIZADA",
    "TODO EL TIEMPO",
  ];

  return (
    <Card className="m-4 shadow-md">
      <Space direction="vertical" className="w-full" size="large">
        <div>
          <Space wrap className="mb-4">
            {Object.entries(DATE_TAGS).map(([key, value], index: number) => (
              <Tag.CheckableTag
                key={key}
                checked={selectedTag === value}
                onChange={() => onTagClick(value)}
                className={`px-4 py-2 border rounded transition-all ${
                  selectedTag === value
                    ? "border-blue-500 bg-blue-50 !text-blue-600"
                    : "border-gray-200 hover:border-blue-400"
                }`}
              >
                {espTags[index]}
              </Tag.CheckableTag>
            ))}
          </Space>
        </div>

        {selectedTag === DATE_TAGS.CUSTOM && (
          <Card className="bg-gray-50 border-gray-200">
            <Space direction="vertical" size="small" className="w-full">
              <Typography.Text strong>
                Seleccione el rango de fechas:
              </Typography.Text>
              <DatePicker.RangePicker
                onChange={(dates) => {
                  setCustomDateRange(dates);
                  if (dates) {
                    fetchStats(DATE_TAGS.CUSTOM);
                  }
                }}
                value={customDateRange}
                format="DD-MM-YYYY"
                className="w-full md:w-auto"
                size="large"
                placeholder={["Fecha inicial", "Fecha final"]}
              />
              {customDateRange?.length === 2 && (
                <div className="flex justify-center w-full">
                <Alert
                  message={`Rango seleccionado: ${dayjs(
                    customDateRange[0]
                  ).format("DD-MM-YYYY")} - ${dayjs(customDateRange[1]).format(
                    "DD-MM-YYYY"
                  )}`}
                  type="info"
                    showIcon
                  />
                </div>
              )}
            </Space>
          </Card>
        )}

        {/* Estadísticas Generales */}
        <div>
          <Typography.Title level={3} className="!mb-6">
            Estadísticas Generales
          </Typography.Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <StatisticCard
                title="INGRESOS"
                value={stats!.income || 0}
                prefix={<DollarOutlined />}
                color="#20c997"
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <StatisticCard
                title="GASTOS"
                value={stats!.expenses || 0}
                prefix={<ShoppingCartOutlined />}
                color="#dc3545"
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <StatisticCard
                title="UTILIDAD"
                value={stats!.utility || 0}
                prefix={<RiseOutlined />}
                color="#28a745"
              />
            </Col>
          </Row>
        </div>

        {/* Estadísticas Delivery */}
        <div>
          <Typography.Title level={3} className="!mb-6">
            Estadísticas de Delivery
          </Typography.Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <StatisticCard
                title="INGRESOS DELIVERY SUELTOS"
                value={stats.deliveryIncome}
                prefix={<DollarOutlined />}
                color="#007bff"
              />
            </Col>
            <Col xs={24} sm={12}>
              <StatisticCard
                title="COSTOS DELIVERY"
                value={stats.deliveryExpenses}
                prefix={<CarOutlined />}
                color="#6f42c1"
              />
            </Col>
          </Row>
        </div>
      </Space>
    </Card>
  );
};

export default StatisticsDashboard;
