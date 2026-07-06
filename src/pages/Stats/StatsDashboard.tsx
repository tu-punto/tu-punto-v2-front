import {
  BarChartOutlined,
  BankOutlined,
  CarOutlined,
  DollarOutlined,
  FilterOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import {
  Card,
  Col,
  Empty,
  Row,
  Select,
  Segmented,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import StatisticCard from "../../components/StatisticCard";
import { getFinanceFluxCategoriesAPI, getFinancialSummaryAPI } from "../../api/financeFlux";
import { getSucursalsAPI } from "../../api/sucursal";

type SummaryShape = {
  monthlyPaymentsIncome?: number;
  commissionIncome?: number;
  deliveryPackagesIncome?: number;
  deliveryIncome?: number;
  deliveryExpenses?: number;
  balanceDelivery?: number;
  expenses?: number;
  utility?: number;
  caja?: number;
  historicalIncome?: number;
  historicalExpenses?: number;
  simplePackagesInterbranchTotal?: number;
  simplePackagesNoDeliveryTotal?: number;
  externalDeliveredPackageTotal?: number;
};

type BranchOption = { value: string; label: string };
type CategoryOption = { value: string; label: string };
type BranchChartRow = { id: string; label: string; utility: number; income: number; expenses: number };

const money = (value: number) =>
  new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const monthOptions = Array.from({ length: 12 }, (_, index) => {
  const date = dayjs().subtract(index, "month").startOf("month");
  return {
    value: date.format("YYYY-MM"),
    label: date.format("YYYY-MM"),
  };
});

const monthToLabel = (value: string) => {
  const parsed = dayjs(`${value}-01`);
  return parsed.isValid() ? parsed.format("MMM YYYY") : value;
};

const toNumber = (value: unknown) => Number(value || 0) || 0;

const getSummaryIncome = (summary: SummaryShape) => {
  const monthly = toNumber(summary.monthlyPaymentsIncome);
  const commissions = toNumber(summary.commissionIncome);
  const deliveries = toNumber(summary.deliveryPackagesIncome);
  return { monthly, commissions, deliveries, total: monthly + commissions + deliveries };
};

const BranchBars = ({ rows, loading }: { rows: BranchChartRow[]; loading: boolean }) => {
  const maxAbs = Math.max(1, ...rows.flatMap((row) => [Math.abs(row.income), Math.abs(row.expenses), Math.abs(row.utility)]));

  return (
    <div className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <Typography.Title level={4} className="!mb-0">
            Utilidad por sucursal
          </Typography.Title>
          <Typography.Text type="secondary">Ingresos menos gastos, usando los filtros activos.</Typography.Text>
        </div>
        <Tag color="blue" className="rounded-full px-3 py-1">
          {rows.length} sucursal{rows.length === 1 ? "" : "es"}
        </Tag>
      </div>

      {loading ? (
        <div className="grid min-h-[240px] place-items-center rounded-3xl bg-slate-50">
          <Spin size="large" />
        </div>
      ) : rows.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const incomeHeight = Math.max(18, Math.round((Math.abs(row.income) / maxAbs) * 180));
            const expenseHeight = Math.max(18, Math.round((Math.abs(row.expenses) / maxAbs) * 180));
            const utilityHeight = Math.max(18, Math.round((Math.abs(row.utility) / maxAbs) * 180));
            const positive = row.utility >= 0;
            return (
              <div key={row.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">{row.label}</div>
                    <div className="mt-1 text-xs text-slate-500">Ingresos: Bs. {money(row.income)} · Gastos: Bs. {money(row.expenses)}</div>
                  </div>
                  <Tag color={positive ? "green" : "red"} className="rounded-full px-3 py-1 font-semibold">
                    {positive ? "+" : ""}{money(row.utility)}
                  </Tag>
                </div>

                <div className="flex h-[210px] items-end rounded-2xl bg-slate-50 p-3 shadow-inner">
                  <div className="flex h-full w-full items-end gap-3">
                    <div className="flex flex-1 flex-col items-center gap-2 text-center">
                      <div className="flex h-full items-end gap-2">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-8 rounded-t-2xl bg-sky-500 transition-all" style={{ height: incomeHeight }} />
                          <span className="text-[11px] font-medium text-slate-600">Ing.</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-8 rounded-t-2xl bg-rose-500 transition-all" style={{ height: expenseHeight }} />
                          <span className="text-[11px] font-medium text-slate-600">Gasto</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-8 rounded-t-2xl transition-all ${positive ? "bg-emerald-500" : "bg-amber-500"}`} style={{ height: utilityHeight }} />
                          <span className="text-[11px] font-medium text-slate-600">Util.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty description="No hay datos para el filtro actual" />
      )}
    </div>
  );
};

const StatisticsDashboard = () => {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedPeriodMode, setSelectedPeriodMode] = useState<"historico" | "1-mes" | "varios-meses">("historico");
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [selectedMonths, setSelectedMonths] = useState<string[]>([dayjs().format("YYYY-MM")]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [selectedExpenseCategories, setSelectedExpenseCategories] = useState<string[]>([]);
  const [includeCommissions, setIncludeCommissions] = useState(true);
  const [includeDeliveries, setIncludeDeliveries] = useState(true);
  const [deliveryMode, setDeliveryMode] = useState<"real" | "potential">("real");
  const [summary, setSummary] = useState<SummaryShape>({});
  const [historicalSummary, setHistoricalSummary] = useState<SummaryShape>({});
  const [branchRows, setBranchRows] = useState<BranchChartRow[]>([]);
  const [loading, setLoading] = useState(true);

  const monthSelection = useMemo(() => {
    if (selectedPeriodMode === "1-mes") return [selectedMonth];
    if (selectedPeriodMode === "varios-meses") return selectedMonths;
    return [];
  }, [selectedMonth, selectedMonths, selectedPeriodMode]);

  const summaryParams = useMemo(() => ({
    months: monthSelection,
    sucursalIds: selectedBranchIds,
    expenseCategories: selectedExpenseCategories,
    includeCommissions,
    includeDeliveries,
    deliveryMode,
  }), [deliveryMode, includeCommissions, includeDeliveries, monthSelection, selectedBranchIds, selectedExpenseCategories]);

  useEffect(() => {
    const loadBaseData = async () => {
      const [branchResponse, categoryResponse] = await Promise.all([
        getSucursalsAPI(),
        getFinanceFluxCategoriesAPI(),
      ]);

      setBranches(
        (Array.isArray(branchResponse) ? branchResponse : [])
          .map((branch: any) => ({
            value: String(branch?._id || branch?.id_sucursal || "").trim(),
            label: String(branch?.nombre || "Sucursal").trim(),
          }))
          .filter((branch: BranchOption) => branch.value)
      );

      setCategories(
        (Array.isArray(categoryResponse) ? categoryResponse : [])
          .map((item: any) => ({
            value: String(item?.nombre || "").trim(),
            label: String(item?.nombre || "Categoria").trim(),
          }))
          .filter((item: CategoryOption) => item.value)
      );
    };

    void loadBaseData();
  }, []);

  useEffect(() => {
    const loadSummary = async () => {
      setLoading(true);
      try {
        const [current, historical, perBranch] = await Promise.all([
          getFinancialSummaryAPI(summaryParams),
          getFinancialSummaryAPI({
            includeCommissions: true,
            includeDeliveries: true,
            deliveryMode: "real",
            expenseCategories: selectedExpenseCategories,
          }),
          Promise.all(
            (selectedBranchIds.length ? selectedBranchIds : branches.map((branch) => branch.value))
              .slice(0, 8)
              .map(async (branchId) => ({
                branchId,
                summary: await getFinancialSummaryAPI({
                  ...summaryParams,
                  sucursalIds: [branchId],
                }),
              }))
          ),
        ]);

        setSummary(current || {});
        setHistoricalSummary(historical || {});
        setBranchRows(
          perBranch
            .map(({ branchId, summary: branchSummary }: any) => {
              const branch = branches.find((item) => item.value === branchId);
              const incomeParts = getSummaryIncome(branchSummary || {});
              const expenses = toNumber((branchSummary as any)?.expenses ?? (branchSummary as any)?.gastos);
              return {
                id: branchId,
                label: branch?.label || branchId,
                utility: toNumber(branchSummary?.utility ?? incomeParts.total - expenses),
                income: incomeParts.total,
                expenses,
              };
            })
            .sort((a, b) => Math.abs(b.utility) - Math.abs(a.utility))
        );
      } finally {
        setLoading(false);
      }
    };

    if (!branches.length && selectedBranchIds.length) return;
    void loadSummary();
  }, [branches, selectedBranchIds, selectedExpenseCategories, summaryParams]);

  const income = getSummaryIncome(summary);
  const expenses = toNumber((summary as any).expenses ?? (summary as any).gastos);
  const totalIncome = income.total;
  const utility = toNumber(summary.utility ?? totalIncome - expenses);
  const breakEven = totalIncome > 0 ? (expenses / totalIncome) * 100 : 0;
  const historicalIncome = getSummaryIncome(historicalSummary).total;
  const historicalExpenses = toNumber((historicalSummary as any).expenses ?? (historicalSummary as any).gastos);
  const companyTotal = toNumber(historicalSummary.utility ?? historicalIncome - historicalExpenses);
  const deliveryIncome = toNumber(summary.deliveryIncome ?? summary.deliveryPackagesIncome);
  const deliveryExpenses = toNumber(summary.deliveryExpenses);
  const deliveryBalance = toNumber(summary.balanceDelivery ?? deliveryIncome - deliveryExpenses);
  const selectedBranchCount = selectedBranchIds.length || branches.length || 0;

  const monthLabels = selectedPeriodMode === "historico"
    ? []
    : selectedPeriodMode === "1-mes"
      ? [selectedMonth]
      : selectedMonths;

  const selectedMonthCount = selectedPeriodMode === "historico" ? 0 : monthLabels.length || 1;

  const toggleMonth = (month: string) => {
    if (selectedPeriodMode === "1-mes") {
      setSelectedMonth(month);
      return;
    }

    setSelectedMonths((current) =>
      current.includes(month)
        ? current.filter((item) => item !== month)
        : [...current, month]
    );
  };

  return (
    <Card className="m-4 overflow-hidden border-0 shadow-xl" bodyStyle={{ padding: 0 }}>
      <div className="relative overflow-hidden bg-slate-950 px-5 py-5 text-white sm:px-8 sm:py-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.28),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.18),_transparent_28%),linear-gradient(135deg,_#0f172a_0%,_#111827_55%,_#1f2937_100%)]" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400" />
        <div className="relative grid gap-5 xl:grid-cols-[1.35fr_0.95fr] xl:items-center">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.28em] text-slate-200 backdrop-blur">
              <BarChartOutlined />
              Control financiero
            </div>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl xl:text-5xl">
              Dashboard de ingresos, gastos, utilidad y punto de equilibrio.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Una vista clara para comparar sucursales, revisar gasto real y entender de un vistazo dónde se gana y dónde se fuga margen.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:justify-self-end">
            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">Periodo</div>
              <div className="mt-1 truncate text-sm font-semibold text-white">{selectedPeriodMode === "historico" ? "Histórico" : monthLabels.join(", ")}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">Sucursales</div>
              <div className="mt-1 text-sm font-semibold text-white">{selectedBranchCount}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">Meses</div>
              <div className="mt-1 text-sm font-semibold text-white">{selectedMonthCount || "Todos"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 bg-slate-50 p-5 lg:p-6">
        <Card className="border-slate-200/80 shadow-sm" bodyStyle={{ padding: 18 }}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-800">
              <FilterOutlined />
              <Typography.Text strong>Filtros</Typography.Text>
            </div>
            <Typography.Text className="text-xs font-medium text-slate-500">
              Los cambios se reflejan al instante en los indicadores.
            </Typography.Text>
          </div>

          <Space direction="vertical" size={18} className="w-full">
            <div className="grid gap-3 xl:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)]">
              <Segmented
                className="w-full"
                value={selectedPeriodMode}
                options={[
                  { label: "Historico", value: "historico" },
                  { label: "1 mes", value: "1-mes" },
                  { label: "Varios meses", value: "varios-meses" },
                ]}
                onChange={(value) => setSelectedPeriodMode(value as any)}
              />

              <Select
                size="large"
                className="w-full"
                mode="multiple"
                allowClear
                placeholder="Sucursales para analisis"
                value={selectedBranchIds}
                onChange={(values) => setSelectedBranchIds(values)}
                options={branches}
                maxTagCount="responsive"
                optionFilterProp="label"
              />

              <Select
                size="large"
                className="w-full"
                mode="multiple"
                allowClear
                placeholder="Tipos de gasto"
                value={selectedExpenseCategories}
                onChange={(values) => setSelectedExpenseCategories(values)}
                options={categories}
                maxTagCount="responsive"
                optionFilterProp="label"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-slate-200 bg-slate-100/80 px-4 py-4">
              <Space size={8} className="rounded-2xl bg-white px-4 py-2 shadow-sm">
                <Switch checked={includeCommissions} onChange={setIncludeCommissions} />
                <span className="font-medium text-slate-700">Tomar comisiones</span>
              </Space>
              <Space size={8} className="rounded-2xl bg-white px-4 py-2 shadow-sm">
                <Switch checked={includeDeliveries} onChange={setIncludeDeliveries} />
                <span className="font-medium text-slate-700">Tomar entregas simples y externas</span>
              </Space>
              <Segmented
                className="rounded-2xl bg-white shadow-sm"
                value={deliveryMode}
                options={[
                  { label: "Real", value: "real" },
                  { label: "Potencial", value: "potential" },
                ]}
                onChange={(value) => setDeliveryMode(value as any)}
              />
            </div>

            {selectedPeriodMode !== "historico" ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <Typography.Text strong className="mb-3 block text-slate-700">
                  Meses para analisis
                </Typography.Text>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {monthOptions.map((month) => {
                    const active = selectedPeriodMode === "1-mes"
                      ? selectedMonth === month.value
                      : selectedMonths.includes(month.value);

                    return (
                      <button
                        key={month.value}
                        type="button"
                        onClick={() => toggleMonth(month.value)}
                        className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${active ? "border-slate-950 bg-slate-950 text-white shadow-md" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400 hover:bg-white"}`}
                      >
                        {monthToLabel(month.label)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </Space>
        </Card>

        <Spin spinning={loading}>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <StatisticCard title="Pagos mensuales" value={income.monthly} prefix={<DollarOutlined />} color="#0f766e" />
            <StatisticCard title="Comisiones" value={income.commissions} prefix={<RiseOutlined />} color="#7c3aed" />
            <StatisticCard title="Entregas simples y externas" value={income.deliveries} prefix={<CarOutlined />} color="#ea580c" />
            <StatisticCard title="Ingresos totales" value={totalIncome} prefix={<DollarOutlined />} color="#16a34a" />
            <StatisticCard title="Gastos totales" value={expenses} prefix={<BankOutlined />} color="#dc2626" />
            <StatisticCard title="Costo delivery" value={deliveryExpenses} prefix={<CarOutlined />} color="#f97316" />
            <StatisticCard title="Ingreso delivery" value={deliveryIncome} prefix={<CarOutlined />} color="#0ea5e9" />
            <StatisticCard title="Balance delivery" value={deliveryBalance} prefix={<RiseOutlined />} color="#059669" />
            <StatisticCard title="Utilidad" value={utility} prefix={<RiseOutlined />} color="#2563eb" />
            <StatisticCard title="Punto de equilibrio (%)" value={breakEven} prefix={<BarChartOutlined />} color="#ca8a04" />
            <StatisticCard title="Total empresa historico" value={companyTotal} prefix={<BankOutlined />} color="#111827" />
          </div>
        </Spin>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={16}>
            <Card className="h-full border-slate-200/80 shadow-sm" bodyStyle={{ padding: 0 }}>
              <BranchBars rows={branchRows} loading={loading} />
            </Card>
          </Col>
          <Col xs={24} xl={8}>
            <Card className="h-full border-slate-200/80 shadow-sm" bodyStyle={{ padding: 20 }}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <Typography.Title level={4} className="!mb-0">
                  Resumen rapido
                </Typography.Title>
                <Tag color="default" className="rounded-full px-3 py-1">
                  {selectedBranchCount} sucursales
                </Tag>
              </div>
              <div className="space-y-3 text-sm text-slate-700">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-slate-500">Sucursales analizadas</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {selectedBranchIds.length ? selectedBranchIds.length : branches.length || 0}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-slate-500">Meses seleccionados</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {selectedPeriodMode === "historico" ? "Todo el historico" : monthLabels.length || 1}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-slate-500">Delivery</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {includeDeliveries ? (deliveryMode === "real" ? "Real" : "Potencial") : "Desactivado"}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-slate-500">Comisiones</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {includeCommissions ? "Incluidas" : "Excluidas"}
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </Card>
  );
};

export default StatisticsDashboard;
