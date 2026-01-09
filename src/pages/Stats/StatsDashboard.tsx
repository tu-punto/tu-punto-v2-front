import {
  Card,
  Row,
  Col,
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
import { useCallback, useEffect, useState } from "react";
import { DATE_TAGS } from "../../constants/fluxes";
import { getFilteredStats } from "../../helpers/financeFluxesHelpers";
import dayjs from "dayjs";
import StatisticCard from "../../components/StatisticCard";
import { getCommissionAPI, getMerchandiseSoldAPI } from "../../api/financeFlux";
import ReportsLauncher from "../../components/ReportsLauncher";

const StatisticsDashboard = () => {
  const [stats, setStats] = useState<any>();
  const [selectedTag, setSelectedTag] = useState<string | null>(
    DATE_TAGS.LAST_30_DAYS
  );
  const [customDateRange, setCustomDateRange] = useState<any>([]);
  const [loading, setLoading] = useState({
    income: true,
    expenses: true,
    utility: true,
    deliveryIncome: true,
    deliveryExpenses: true,
  });
  const [commission, setCommission] = useState<number>(0);
  const [loadingCommission, setLoadingCommission] = useState<boolean>(true);
  const [merchandiseSold, setMerchandiseSold] = useState<number>(0);
  const [loadingMerchandise, setLoadingMerchandise] = useState<boolean>(true);

  const fetchStats = useCallback(async (filter: string = DATE_TAGS.ALL_TIME) => {
    setLoading({
      income: true,
      expenses: true,
      utility: true,
      deliveryIncome: true,
      deliveryExpenses: true,
    });
    setLoadingCommission(true);
    setLoadingMerchandise(true);
    try {
      const statsInfo = await getFilteredStats(filter, customDateRange);
      setStats(statsInfo);

      let from: string | undefined;
      let to: string | undefined;
      let rangeParam: string | undefined;

      if (filter === DATE_TAGS.CUSTOM && customDateRange && customDateRange.length === 2) {
        from = customDateRange[0] ? dayjs(customDateRange[0]).format("YYYY-MM-DD") : undefined;
        to = customDateRange[1] ? dayjs(customDateRange[1]).format("YYYY-MM-DD") : undefined;
        rangeParam = "custom";
      } else {
        // Derive range via dates to avoid backend range mismatch; omit params for ALL_TIME
        const now = dayjs();
        let start: dayjs.Dayjs | null = null;
        switch (filter) {
          case DATE_TAGS.LAST_7_DAYS:
            start = now.subtract(7, "day").startOf("day");
            rangeParam = "7d";
            break;
          case DATE_TAGS.LAST_30_DAYS:
            start = now.subtract(30, "day").startOf("day");
            rangeParam = "30d";
            break;
          case DATE_TAGS.LAST_90_DAYS:
            start = now.subtract(90, "day").startOf("day");
            rangeParam = "90d";
            break;
          case DATE_TAGS.LAST_YEAR:
            start = now.startOf("year");
            // Not specified by backend mapping; fall back to explicit from/to
            rangeParam = undefined;
            break;
          case DATE_TAGS.ALL_TIME:
          default:
            start = null;
            rangeParam = "all";
            break;
        }
        if (start) {
          from = start.format("YYYY-MM-DD");
          to = now.endOf("day").format("YYYY-MM-DD");
        }
      }

      const commissionRes = await getCommissionAPI({ from, to });
      const commissionValue = typeof commissionRes === "number"
        ? commissionRes
        : (commissionRes?.comision ?? commissionRes?.total ?? 0);
      setCommission(Number(commissionValue) || 0);

      const merchRes = await getMerchandiseSoldAPI({ range: rangeParam, from, to });
      const merchValue = typeof merchRes === "number" ? merchRes : (merchRes?.mercaderiaVendida ?? merchRes?.total ?? 0);
      setMerchandiseSold(Number(merchValue) || 0);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading({
        income: false,
        expenses: false,
        utility: false,
        deliveryIncome: false,
        deliveryExpenses: false,
      });
      setLoadingCommission(false);
      setLoadingMerchandise(false);
    }
  }, [customDateRange]);

  const onTagClick = (tag: string) => {
    setSelectedTag(tag);
    if (tag !== DATE_TAGS.CUSTOM) {
      setCustomDateRange([]);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchStats(selectedTag || DATE_TAGS.ALL_TIME);
  }, [selectedTag, fetchStats]);

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
      <div className="absolute right-4 top-4">
        <ReportsLauncher />
      </div>
      <Space direction="vertical" className="w-full" size="large">
        <div>
          <Space wrap className="mb-4">
            {Object.entries(DATE_TAGS).map(([key, value], index: number) => (
              <Tag.CheckableTag
                key={key}
                checked={selectedTag === value}
                onChange={() => onTagClick(value)}
                className={`px-4 py-2 border rounded transition-all ${selectedTag === value
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
              <Spin spinning={loading.income} tip="Cargando...">
                <StatisticCard
                  title="INGRESOS"
                  value={stats?.income || 0}
                  prefix={<DollarOutlined />}
                  color="#20c997"
                />
              </Spin>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Spin spinning={loading.expenses} tip="Cargando...">
                <StatisticCard
                  title="GASTOS"
                  value={stats?.expenses || 0}
                  prefix={<ShoppingCartOutlined />}
                  color="#dc3545"
                />
              </Spin>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Spin spinning={loading.utility}>
                <StatisticCard
                  title="UTILIDAD"
                  value={stats?.utility ?? 0}
                  prefix={<RiseOutlined />}
                  color="#28a745"
                />
              </Spin>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Spin spinning={loading.expenses} tip="Cargando...">
                <StatisticCard
                  title="INVERSIÓN"
                  value={stats?.investments || 0}
                  prefix={<RiseOutlined />}
                  color="#007bff"
                />
              </Spin>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Spin spinning={loading.deliveryExpenses} tip="Cargando...">
                <StatisticCard
                  title="CAJA"
                  value={stats?.caja ?? 0}
                  prefix={<DollarOutlined />}
                  color="#faad14"
                />
              </Spin>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Spin spinning={loading.deliveryExpenses} tip="Cargando...">
                <StatisticCard
                  title="Comisión"
                  value={commission}
                  prefix={<RiseOutlined />}
                  color="#6f42c1"
                />
              </Spin>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Spin spinning={loading.deliveryExpenses} tip="Cargando...">
                <StatisticCard
                  title="Mercadería Vendida"
                  value={merchandiseSold}
                  prefix={<ShoppingCartOutlined />}
                  color="#dc3545"
                />
              </Spin>
            </Col>
          </Row>
        </div>

        {/* Estadísticas Delivery */}
        <div>
          <Typography.Title level={3} className="!mb-6">
            Estadísticas de Delivery
          </Typography.Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Spin spinning={loading.deliveryIncome} tip="Cargando...">
                <StatisticCard
                  title="INGRESOS DELIVERY SUELTOS"
                  value={stats?.deliveryIncome}
                  prefix={<DollarOutlined />}
                  color="#007bff"
                />
              </Spin>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Spin spinning={loading.deliveryExpenses} tip="Cargando...">
                <StatisticCard
                  title="COSTOS DELIVERY"
                  value={stats?.deliveryExpenses}
                  prefix={<CarOutlined />}
                  color="#6f42c1"
                />
              </Spin>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Spin spinning={loading.deliveryExpenses} tip="Cargando...">
                <StatisticCard
                  title="BALANCE DELIVERY"
                  value={stats?.deliveryBalance ?? 0}
                  prefix={<CarOutlined />}
                  color="#20c997"
                />
              </Spin>
            </Col>
          </Row>
        </div>
      </Space>
    </Card>
  );
};

export default StatisticsDashboard;
