import { useEffect, useMemo, useState } from "react";
import { Card, DatePicker, Empty, Row, Col, Select, Segmented, Spin, Statistic, Table, Tag, Typography } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { getBoxCloseSummaryAPI } from "../../api/boxClose";
import { getSucursalsAPI } from "../../api/sucursal";
import { IBoxClose } from "../../models/boxClose";

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

type ViewMode = "daily" | "monthly";
type RangePreset = "today" | "yesterday" | "7d" | "30d" | "custom";

type SummaryRow = {
  key: string;
  branchId: string;
  branchName: string;
  periodLabel: string;
  periodSortKey: string;
  closingsCount: number;
  expected: number;
  real: number;
  positiveDiff: number;
  negativeDiff: number;
  netDiff: number;
  lastClosedAt: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const toMoney = (value: unknown) => Number(value || 0) || 0;

const getEffectiveDate = (boxClose: Partial<IBoxClose> & { closed_at?: string; created_at?: string }) =>
  dayjs(boxClose.closed_at || boxClose.created_at);

const getBranchId = (boxClose: any) => String(boxClose?.id_sucursal?._id || boxClose?.id_sucursal || "");
const getBranchName = (boxClose: any) => String(boxClose?.id_sucursal?.nombre || "Sucursal sin nombre");

const makeRangeFromPreset = (preset: RangePreset): [Dayjs, Dayjs] => {
  const today = dayjs().startOf("day");
  if (preset === "yesterday") return [today.subtract(1, "day"), today.subtract(1, "day")];
  if (preset === "7d") return [today.subtract(6, "day"), today];
  if (preset === "30d") return [today.subtract(29, "day"), today];
  return [today, today];
};

type BoxCloseSummaryPanelProps = {
  compact?: boolean;
};

export default function BoxCloseSummaryPanel({ compact = false }: BoxCloseSummaryPanelProps) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<IBoxClose[]>([]);
  const [branchOptions, setBranchOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [rangePreset, setRangePreset] = useState<RangePreset>("7d");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => makeRangeFromPreset("7d"));

  useEffect(() => {
    (async () => {
      try {
        const data = await getSucursalsAPI();
        setBranchOptions(
          (Array.isArray(data) ? data : []).map((branch: any) => ({
            value: String(branch._id),
            label: String(branch.nombre || "Sucursal sin nombre"),
          }))
        );
      } catch (error) {
        console.error("No se pudieron cargar las sucursales", error);
      }
    })();
  }, []);

  useEffect(() => {
    if (rangePreset !== "custom") {
      setRange(makeRangeFromPreset(rangePreset));
    }
  }, [rangePreset]);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const data = await getBoxCloseSummaryAPI({
          from: range[0].startOf("day").toISOString(),
          to: range[1].endOf("day").toISOString(),
          sucursalIds: selectedBranchIds,
        });
        setRows(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error al cargar el resumen", error);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [range, selectedBranchIds]);

  const summarizedRows = useMemo<SummaryRow[]>(() => {
    const bucket = new Map<string, SummaryRow>();

    rows.forEach((boxClose: any) => {
      const date = getEffectiveDate(boxClose);
      if (!date.isValid()) return;

      const branchId = getBranchId(boxClose) || "unknown";
      const branchName = getBranchName(boxClose);
      const periodSortKey = viewMode === "monthly" ? date.format("YYYY-MM") : date.format("YYYY-MM-DD");
      const periodLabel = viewMode === "monthly" ? date.format("MMMM YYYY") : date.format("DD/MM/YYYY");
      const key = `${branchId}-${periodSortKey}`;

      const expected = toMoney(boxClose?.efectivo_esperado);
      const real = toMoney(boxClose?.efectivo_real);
      const diff = real - expected;
      const prev = bucket.get(key);

      const next: SummaryRow = prev || {
        key,
        branchId,
        branchName,
        periodLabel,
        periodSortKey,
        closingsCount: 0,
        expected: 0,
        real: 0,
        positiveDiff: 0,
        negativeDiff: 0,
        netDiff: 0,
        lastClosedAt: date.toISOString(),
      };

      next.closingsCount += 1;
      next.expected += expected;
      next.real += real;
      next.netDiff += diff;
      next.positiveDiff += Math.max(diff, 0);
      next.negativeDiff += Math.max(-diff, 0);
      if (date.isAfter(dayjs(next.lastClosedAt))) next.lastClosedAt = date.toISOString();

      bucket.set(key, next);
    });

    return Array.from(bucket.values()).sort((a, b) => {
      if (a.branchName === b.branchName) return b.periodSortKey.localeCompare(a.periodSortKey);
      return a.branchName.localeCompare(b.branchName);
    });
  }, [rows, viewMode]);

  const totals = useMemo(() => {
    return summarizedRows.reduce(
      (acc, row) => {
        acc.expected += row.expected;
        acc.real += row.real;
        acc.positiveDiff += row.positiveDiff;
        acc.negativeDiff += row.negativeDiff;
        acc.netDiff += row.netDiff;
        acc.closingsCount += row.closingsCount;
        return acc;
      },
      { expected: 0, real: 0, positiveDiff: 0, negativeDiff: 0, netDiff: 0, closingsCount: 0 }
    );
  }, [summarizedRows]);

  const columns = [
    { title: "Sucursal", dataIndex: "branchName", key: "branchName" },
    { title: viewMode === "monthly" ? "Mes" : "Día", dataIndex: "periodLabel", key: "periodLabel" },
    { title: "Cierres", dataIndex: "closingsCount", key: "closingsCount", render: (value: number) => value },
    { title: "Debería haber", dataIndex: "expected", key: "expected", render: (value: number) => `Bs. ${money(value)}` },
    { title: "Había", dataIndex: "real", key: "real", render: (value: number) => `Bs. ${money(value)}` },
    { title: "Desfase positivo", dataIndex: "positiveDiff", key: "positiveDiff", render: (value: number) => <Tag color="green">Bs. {money(value)}</Tag> },
    { title: "Desfase negativo", dataIndex: "negativeDiff", key: "negativeDiff", render: (value: number) => <Tag color="volcano">Bs. {money(value)}</Tag> },
    { title: "Neto", dataIndex: "netDiff", key: "netDiff", render: (value: number) => <Tag color={value >= 0 ? "green" : "red"}>Bs. {money(value)}</Tag> },
    { title: "Último cierre", dataIndex: "lastClosedAt", key: "lastClosedAt", render: (value: string) => dayjs(value).format("DD/MM/YYYY HH:mm") },
  ];

  return (
    <div className={compact ? "space-y-4" : "min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8"}>
      <div className={compact ? "space-y-4" : "mx-auto max-w-7xl space-y-6"}>
        {!compact && (
          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <div className="flex flex-col gap-6 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 p-6 text-white lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/75">
                  Solo superadmin
                </div>
                <Title level={2} className="!mb-2 !text-white">Resumen de cierre de caja</Title>
                <Text className="max-w-2xl text-white/75">
                  Revisa el cierre por sucursal, con vista diaria o mensual y filtros de rango para detectar desfases positivos y negativos.
                </Text>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Card className="min-w-[180px] border-0 bg-white/10 text-white shadow-none"><Statistic title={<span className="text-white/65">Total esperado</span>} value={`Bs. ${money(totals.expected)}`} valueStyle={{ color: "#fff" }} /></Card>
                <Card className="min-w-[180px] border-0 bg-white/10 text-white shadow-none"><Statistic title={<span className="text-white/65">Total real</span>} value={`Bs. ${money(totals.real)}`} valueStyle={{ color: "#fff" }} /></Card>
                <Card className="min-w-[180px] border-0 bg-white/10 text-white shadow-none"><Statistic title={<span className="text-white/65">Cierres</span>} value={totals.closingsCount} valueStyle={{ color: "#fff" }} /></Card>
              </div>
            </div>
          </Card>
        )}

        <Card className="shadow-sm">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Sucursales</div>
              <Select mode="multiple" allowClear showSearch placeholder="Todas las sucursales" options={branchOptions} value={selectedBranchIds} onChange={setSelectedBranchIds} className="w-full" maxTagCount="responsive" />
            </Col>
            <Col xs={24} lg={6}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Periodo</div>
              <Segmented block value={rangePreset} onChange={(value) => setRangePreset(value as RangePreset)} options={[{ label: "Hoy", value: "today" }, { label: "Ayer", value: "yesterday" }, { label: "7 días", value: "7d" }, { label: "30 días", value: "30d" }, { label: "Personalizado", value: "custom" }]} />
            </Col>
            <Col xs={24} lg={5}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Vista</div>
              <Segmented block value={viewMode} onChange={(value) => setViewMode(value as ViewMode)} options={[{ label: "Diaria", value: "daily" }, { label: "Mensual", value: "monthly" }]} />
            </Col>
            <Col xs={24} lg={5}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Rango</div>
              <RangePicker value={range} onChange={(value) => { if (!value || !value[0] || !value[1]) return; setRangePreset("custom"); setRange([value[0], value[1]]); }} className="w-full" format="DD/MM/YYYY" />
            </Col>
          </Row>
        </Card>

        <Card className="shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <Title level={4} className="!mb-1">Detalle por sucursal</Title>
              <Text type="secondary">{summarizedRows.length} filas resultantes con los filtros actuales.</Text>
            </div>
          </div>

          {loading ? (
            <div className="grid min-h-[260px] place-items-center"><Spin size="large" /></div>
          ) : summarizedRows.length ? (
            <Table
              dataSource={summarizedRows}
              columns={columns as any}
              rowKey="key"
              pagination={{ pageSize: 12 }}
              scroll={{ x: 1100 }}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={2}><strong>Total</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={2}><strong>{totals.closingsCount}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={3}><strong>Bs. {money(totals.expected)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={4}><strong>Bs. {money(totals.real)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={5}><strong>Bs. {money(totals.positiveDiff)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={6}><strong>Bs. {money(totals.negativeDiff)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={7}><strong>Bs. {money(totals.netDiff)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={8} />
                </Table.Summary.Row>
              )}
            />
          ) : (
            <Empty description="No hay cierres en el rango seleccionado" />
          )}
        </Card>
      </div>
    </div>
  );
}
