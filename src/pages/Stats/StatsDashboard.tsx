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
  Select,
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
import ReportsLauncher from "../../components/ReportsLauncher";
import { getSucursalsAPI } from "../../api/sucursal";

const EMPTY_STATS = {
  income: 0,
  expenses: 0,
  investments: 0,
  utility: 0,
  commission: 0,
  merchandiseSold: 0,
  deliveryIncome: 0,
  deliveryExpenses: 0,
  deliveryBalance: 0,
  externalDeliveryIncome: 0,
  externalDeliveredPackageTotal: 0,
  simplePackagesNoDeliveryTotal: 0,
  simplePackagesInterbranchTotal: 0,
  caja: 0,
};

const StatisticsDashboard = () => {
  const [stats, setStats] = useState<any>(EMPTY_STATS);
  const [selectedTag, setSelectedTag] = useState<string | null>(DATE_TAGS.LAST_30_DAYS);
  const [customDateRange, setCustomDateRange] = useState<any>([]);
  const [branches, setBranches] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [loading, setLoading] = useState({
    income: true,
    expenses: true,
    utility: true,
    deliveryIncome: true,
    deliveryExpenses: true,
  });

  const fetchStats = useCallback(async (filter: string = DATE_TAGS.ALL_TIME, branchIds: string[] = []) => {
    setLoading({
      income: true,
      expenses: true,
      utility: true,
      deliveryIncome: true,
      deliveryExpenses: true,
    });

    try {
      const statsInfo = await getFilteredStats(filter, customDateRange, branchIds);
      setStats(statsInfo);
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
    }
  }, [customDateRange]);

  const fetchBranches = useCallback(async () => {
    setBranchesLoading(true);
    try {
      const response = await getSucursalsAPI();
      const nextBranches = (Array.isArray(response) ? response : [])
        .map((branch: any) => ({
          value: String(branch?._id || ""),
          label: String(branch?.nombre || branch?.sucursal || "Sucursal").trim(),
        }))
        .filter((branch) => branch.value);
      setBranches(nextBranches);
    } catch (error) {
      console.error("Error al cargar sucursales para estadísticas:", error);
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  const onTagClick = (tag: string) => {
    setSelectedTag(tag);
    if (tag !== DATE_TAGS.CUSTOM) {
      setCustomDateRange([]);
    }
  };

  const onBranchChange = (values: string[]) => {
    setSelectedBranchIds(Array.from(new Set((values || []).filter(Boolean))));
  };

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    if (selectedTag === DATE_TAGS.CUSTOM && customDateRange?.length !== 2) return;
    fetchStats(selectedTag || DATE_TAGS.ALL_TIME, selectedBranchIds);
  }, [selectedTag, customDateRange, selectedBranchIds, fetchStats]);

  const espTags = [
    "ULTIMOS 7 DIAS",
    "ULTIMOS 30 DIAS",
    "ULTIMOS 90 DIAS",
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

          <Card
            className="border-gray-200 bg-slate-50/80"
            bodyStyle={{ padding: 16 }}
          >
            <Space direction="vertical" size="small" className="w-full">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Typography.Text strong>Filtros por sucursal</Typography.Text>
                <Tag color={selectedBranchIds.length ? "blue" : "default"} className="rounded-full px-3 py-1">
                  {selectedBranchIds.length
                    ? `${selectedBranchIds.length} sucursal${selectedBranchIds.length > 1 ? "es" : ""}`
                    : "Global"}
                </Tag>
              </div>
              <Space wrap size={[8, 8]}>
                <Tag.CheckableTag
                  checked={!selectedBranchIds.length}
                  onChange={() => setSelectedBranchIds([])}
                  className={`px-4 py-2 border rounded transition-all ${
                    !selectedBranchIds.length
                      ? "border-blue-500 bg-blue-50 !text-blue-600"
                      : "border-gray-200 hover:border-blue-400"
                  }`}
                >
                  Global
                </Tag.CheckableTag>
                {selectedBranchIds.length > 0 && (
                  <Typography.Text type="secondary">
                    Filtrando solo las sucursales seleccionadas
                  </Typography.Text>
                )}
              </Space>
              <Select
                mode="multiple"
                size="large"
                allowClear
                className="w-full"
                placeholder="Selecciona una o varias sucursales"
                loading={branchesLoading}
                value={selectedBranchIds}
                onChange={onBranchChange}
                maxTagCount="responsive"
                optionFilterProp="label"
                options={branches}
              />
              <Typography.Text type="secondary">
                Global suma todo. Si eliges sucursales, todas las tarjetas se recalculan solo con esas sucursales.
              </Typography.Text>
            </Space>
          </Card>
        </div>

        {selectedTag === DATE_TAGS.CUSTOM && (
          <Card className="bg-gray-50 border-gray-200">
            <Space direction="vertical" size="small" className="w-full">
              <Typography.Text strong>Seleccione el rango de fechas:</Typography.Text>
              <DatePicker.RangePicker
                onChange={(dates) => {
                  setCustomDateRange(dates);
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
                    message={`Rango seleccionado: ${dayjs(customDateRange[0]).format("DD-MM-YYYY")} - ${dayjs(
                      customDateRange[1]
                    ).format("DD-MM-YYYY")}`}
                    type="info"
                    showIcon
                  />
                </div>
              )}
            </Space>
          </Card>
        )}

        <div>
          <Typography.Title level={3} className="!mb-6">
            Estadisticas Generales
          </Typography.Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Spin spinning={loading.income} tip="Cargando...">
                <StatisticCard title="INGRESOS" value={stats?.income || 0} prefix={<DollarOutlined />} color="#20c997" />
              </Spin>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Spin spinning={loading.expenses} tip="Cargando...">
                <StatisticCard title="GASTOS" value={stats?.expenses || 0} prefix={<ShoppingCartOutlined />} color="#dc3545" />
              </Spin>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Spin spinning={loading.utility} tip="Cargando...">
                <StatisticCard title="UTILIDAD" value={stats?.utility ?? 0} prefix={<RiseOutlined />} color="#28a745" />
              </Spin>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Spin spinning={loading.expenses} tip="Cargando...">
                <StatisticCard title="INVERSION" value={stats?.investments || 0} prefix={<RiseOutlined />} color="#007bff" />
              </Spin>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Spin spinning={loading.utility} tip="Cargando...">
                <StatisticCard title="CAJA" value={stats?.caja ?? 0} prefix={<DollarOutlined />} color="#faad14" />
              </Spin>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Spin spinning={loading.utility} tip="Cargando...">
                <StatisticCard title="COMISION" value={stats?.commission ?? 0} prefix={<RiseOutlined />} color="#6f42c1" />
              </Spin>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Spin spinning={loading.utility} tip="Cargando...">
                <StatisticCard
                  title="MERCADERIA VENDIDA"
                  value={stats?.merchandiseSold ?? 0}
                  prefix={<ShoppingCartOutlined />}
                  color="#dc3545"
                />
              </Spin>
            </Col>
          </Row>
        </div>

        <div>
          <Typography.Title level={3} className="!mb-6">
            Estadisticas de Delivery
          </Typography.Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Spin spinning={loading.deliveryIncome} tip="Cargando...">
                <StatisticCard
                  title="MONTO COBRADO DELIVERY"
                  value={stats?.deliveryIncome ?? 0}
                  prefix={<DollarOutlined />}
                  color="#007bff"
                />
              </Spin>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Spin spinning={loading.deliveryExpenses} tip="Cargando...">
                <StatisticCard
                  title="COSTOS DELIVERY"
                  value={stats?.deliveryExpenses ?? 0}
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

        <div>
          <Typography.Title level={3} className="!mb-6">
            Estadisticas de Paquetes
          </Typography.Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Spin spinning={loading.utility} tip="Cargando...">
                <StatisticCard
                  title="PRECIO PAQUETE EXTERNAS ENTREGADAS"
                  value={stats?.externalDeliveredPackageTotal ?? 0}
                  prefix={<DollarOutlined />}
                  color="#0ea5e9"
                />
              </Spin>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Spin spinning={loading.utility} tip="Cargando...">
                <StatisticCard
                  title="PAQUETES SIMPLES SIN DELIVERY"
                  value={stats?.simplePackagesNoDeliveryTotal ?? 0}
                  prefix={<ShoppingCartOutlined />}
                  color="#f59e0b"
                />
              </Spin>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Spin spinning={loading.utility} tip="Cargando...">
                <StatisticCard
                  title="PAQUETES ENTRE SUCURSALES + ENVIO"
                  value={stats?.simplePackagesInterbranchTotal ?? 0}
                  prefix={<CarOutlined />}
                  color="#14b8a6"
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
