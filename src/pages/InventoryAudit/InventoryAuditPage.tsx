import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Input,
  List,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DownloadOutlined, EyeOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";

import {
  downloadInventoryAuditXlsxAPI,
  getInventoryAuditEventDetailAPI,
  getInventoryAuditMovementsAPI,
} from "../../api/inventoryAudit";
import { getSellersBasicAPI } from "../../api/seller";
import { getSucursalsAPI } from "../../api/sucursal";

import "./InventoryAuditPage.css";

const { RangePicker } = DatePicker;

type AuditRow = {
  _id: string;
  event_id: string;
  event_type: string;
  source_module: string;
  source_id?: string;
  product_name_snapshot: string;
  variant_label_snapshot?: string;
  seller_name?: string;
  branch_name?: string;
  stock_before: number;
  stock_delta: number;
  stock_after: number;
  movement_direction: "in" | "out" | "neutral";
  created_at: string;
  event_actor_name?: string;
  event_actor_role?: string;
};

type EventDetail = {
  event?: any;
  movements?: any[];
};

type SummaryData = {
  movementCount: number;
  totalOut: number;
  totalIn: number;
  uniqueProducts: number;
  byType: { eventType: string; count: number; totalDelta: number }[];
  byActor: { actorName: string; count: number; outUnits: number }[];
  topProducts: { productId: string; productName: string; variantLabel: string; count: number; totalAdjustment: number }[];
};

type Option = {
  value: string;
  label: string;
  searchText?: string;
};

const EVENT_TYPE_OPTIONS = [
  { value: "all", label: "Todos los eventos" },
  { value: "manual_stock_adjustment", label: "Ajuste manual" },
  { value: "superadmin_manual_stock_adjustment", label: "Ajuste superadmin" },
  { value: "sale_registered", label: "Venta registrada" },
  { value: "sale_deleted_stock_restored", label: "Venta eliminada / stock restaurado" },
  { value: "sale_stock_adjusted", label: "Venta ajustada" },
  { value: "withdrawal_request_approved", label: "Solicitud aprobada" },
  { value: "initial_stock_registered", label: "Stock inicial" },
  { value: "variant_stock_initialized", label: "Variante agregada con stock" },
  { value: "catalog_stock_reserved", label: "Reserva catálogo" },
  { value: "catalog_stock_restored", label: "Restauración catálogo" },
  { value: "entry_deleted_stock_adjustment", label: "Eliminación de ingreso" },
  { value: "entry_updated_stock_adjustment", label: "Edición de ingreso" },
];

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-BO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getEventTypeMeta = (eventType?: string) => {
  const map: Record<string, { label: string; color: string }> = {
    manual_stock_adjustment: { label: "Ajuste manual", color: "gold" },
    superadmin_manual_stock_adjustment: { label: "Ajuste superadmin", color: "magenta" },
    sale_registered: { label: "Venta registrada", color: "volcano" },
    sale_deleted_stock_restored: { label: "Venta eliminada", color: "green" },
    sale_stock_adjusted: { label: "Venta ajustada", color: "orange" },
    withdrawal_request_approved: { label: "Solicitud aprobada", color: "red" },
    initial_stock_registered: { label: "Stock inicial", color: "cyan" },
    variant_stock_initialized: { label: "Variante con stock", color: "blue" },
    catalog_stock_reserved: { label: "Reserva catálogo", color: "purple" },
    catalog_stock_restored: { label: "Restauración catálogo", color: "lime" },
    entry_deleted_stock_adjustment: { label: "Ingreso eliminado", color: "geekblue" },
    entry_updated_stock_adjustment: { label: "Ingreso editado", color: "processing" },
  };
  return map[eventType || ""] || { label: eventType || "Sin tipo", color: "default" };
};

const getDeltaTagColor = (delta: number) => {
  if (delta > 0) return "green";
  if (delta < 0) return "volcano";
  return "default";
};

const InventoryAuditPage = () => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    movementCount: 0,
    totalOut: 0,
    totalIn: 0,
    uniqueProducts: 0,
    byType: [],
    byActor: [],
    topProducts: [],
  });
  const [sellers, setSellers] = useState<Option[]>([]);
  const [branches, setBranches] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<EventDetail>({});
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [selectedSellerId, setSelectedSellerId] = useState<string>("all");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [selectedEventType, setSelectedEventType] = useState<string>("all");
  const [selectedDirection, setSelectedDirection] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchText.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchText]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [sellerResponse, branchResponse] = await Promise.all([
          getSellersBasicAPI({ onlyActiveOrRenewal: true }),
          getSucursalsAPI(),
        ]);

        const sellerRows = Array.isArray(sellerResponse) ? sellerResponse : [];
        const branchRows = Array.isArray(branchResponse) ? branchResponse : [];

        setSellers([
          { value: "all", label: "Todos los vendedores" },
          ...sellerRows
            .map((seller: any) => {
              const brand = String(seller?.marca || "").trim();
              const fullName = `${String(seller?.nombre || "").trim()} ${String(seller?.apellido || "").trim()}`.trim();
              const label = [brand, fullName].filter(Boolean).join(" - ") || String(seller?.mail || "Vendedor");
              return {
                value: String(seller?._id || ""),
                label,
                searchText: `${label} ${String(seller?.mail || "")}`.toLowerCase(),
              };
            })
            .filter((option: Option) => option.value),
        ]);

        setBranches([
          { value: "all", label: "Todas las sucursales" },
          ...branchRows
            .map((branch: any) => ({
              value: String(branch?._id || ""),
              label: String(branch?.nombre || "Sucursal"),
            }))
            .filter((option: Option) => option.value),
        ]);
      } catch (error) {
        console.error("Error cargando filtros de auditoria:", error);
        message.error("No se pudieron cargar los filtros de auditoría.");
      }
    };

    void loadFilterOptions();
  }, []);

  useEffect(() => {
    const loadAudit = async () => {
      setLoading(true);
      try {
        const response = await getInventoryAuditMovementsAPI({
          from: dateRange?.[0]?.startOf("day").toISOString(),
          to: dateRange?.[1]?.endOf("day").toISOString(),
          sellerId: selectedSellerId !== "all" ? selectedSellerId : undefined,
          branchId: selectedBranchId !== "all" ? selectedBranchId : undefined,
          eventType: selectedEventType !== "all" ? selectedEventType : undefined,
          direction: selectedDirection !== "all" ? selectedDirection : undefined,
          q: debouncedSearch || undefined,
          page,
          limit,
        });

        setRows(Array.isArray(response?.rows) ? response.rows : []);
        setSummary(response?.summary || {
          movementCount: 0,
          totalOut: 0,
          totalIn: 0,
          uniqueProducts: 0,
          byType: [],
          byActor: [],
          topProducts: [],
        });
        setTotal(Number(response?.total || 0));
      } catch (error) {
        console.error("Error cargando auditoria de stock:", error);
        message.error("No se pudo cargar la auditoría de stock.");
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    void loadAudit();
  }, [dateRange, selectedSellerId, selectedBranchId, selectedEventType, selectedDirection, debouncedSearch, page, limit, refreshTick]);

  const handleResetFilters = () => {
    setDateRange(null);
    setSelectedSellerId("all");
    setSelectedBranchId("all");
    setSelectedEventType("all");
    setSelectedDirection("all");
    setSearchText("");
    setDebouncedSearch("");
    setPage(1);
    setLimit(20);
  };

  const handleOpenDetail = async (eventId: string) => {
    if (!eventId) return;
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const response = await getInventoryAuditEventDetailAPI(eventId);
      if (response?.success === false) {
        message.error(response?.message || "No se pudo cargar el detalle.");
        setDetailData({});
        return;
      }
      setDetailData({
        event: response?.event,
        movements: Array.isArray(response?.movements) ? response.movements : [],
      });
    } catch (error) {
      console.error("Error obteniendo detalle de auditoria:", error);
      message.error("No se pudo cargar el detalle de auditoría.");
      setDetailData({});
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    const response = await downloadInventoryAuditXlsxAPI({
      from: dateRange?.[0]?.startOf("day").toISOString(),
      to: dateRange?.[1]?.endOf("day").toISOString(),
      sellerId: selectedSellerId !== "all" ? selectedSellerId : undefined,
      branchId: selectedBranchId !== "all" ? selectedBranchId : undefined,
      eventType: selectedEventType !== "all" ? selectedEventType : undefined,
      direction: selectedDirection !== "all" ? selectedDirection : undefined,
      q: debouncedSearch || undefined,
    });
    setExportLoading(false);
    if (response?.success === false) {
      message.error((response as any)?.message || "No se pudo exportar la auditoría.");
      return;
    }
    message.success("Reporte de auditoría generado.");
  };

  const columns: ColumnsType<AuditRow> = useMemo(
    () => [
      {
        title: "Fecha",
        dataIndex: "created_at",
        key: "created_at",
        width: 170,
        render: (value: string) => formatDateTime(value),
      },
      {
        title: "Producto",
        dataIndex: "product_name_snapshot",
        key: "product_name_snapshot",
        render: (_: string, record) => (
          <div className="inventory-audit-product-cell">
            <div className="inventory-audit-product-title">{record.product_name_snapshot || "Producto"}</div>
            <div className="inventory-audit-product-meta">{record.variant_label_snapshot || "Sin variante"}</div>
          </div>
        ),
      },
      {
        title: "Vendedor",
        dataIndex: "seller_name",
        key: "seller_name",
        width: 220,
        render: (value?: string) => value || "-",
      },
      {
        title: "Sucursal",
        dataIndex: "branch_name",
        key: "branch_name",
        width: 180,
        render: (value?: string) => value || "-",
      },
      {
        title: "Movimiento",
        key: "movement",
        width: 160,
        render: (_: unknown, record) => (
          <Space direction="vertical" size={4}>
            <Tag bordered={false} color={getDeltaTagColor(Number(record.stock_delta || 0))}>
              {Number(record.stock_delta || 0) > 0 ? `+${record.stock_delta}` : record.stock_delta}
            </Tag>
            <div className="inventory-audit-stock-flow">
              <span>{record.stock_before}</span>
              <span className="inventory-audit-stock-arrow">→</span>
              <span>{record.stock_after}</span>
            </div>
          </Space>
        ),
      },
      {
        title: "Tipo",
        dataIndex: "event_type",
        key: "event_type",
        width: 220,
        render: (value?: string) => {
          const meta = getEventTypeMeta(value);
          return <Tag color={meta.color}>{meta.label}</Tag>;
        },
      },
      {
        title: "Usuario",
        key: "user",
        width: 220,
        render: (_: unknown, record) => (
          <div>
            <div>{record.event_actor_name || "Sistema"}</div>
            <div className="inventory-audit-muted">{record.event_actor_role || "-"}</div>
          </div>
        ),
      },
      {
        title: "Acciones",
        key: "actions",
        width: 110,
        render: (_: unknown, record) => (
          <Button type="text" icon={<EyeOutlined />} onClick={() => void handleOpenDetail(record.event_id)}>
            Ver
          </Button>
        ),
      },
    ],
    []
  );

  const detailColumns: ColumnsType<any> = useMemo(
    () => [
      {
        title: "Producto",
        key: "product",
        render: (_: unknown, record: any) => (
          <div>
            <div>{record.product_name_snapshot || "Producto"}</div>
            <div className="inventory-audit-muted">{record.variant_label_snapshot || "Sin variante"}</div>
          </div>
        ),
      },
      {
        title: "Antes",
        dataIndex: "stock_before",
        key: "stock_before",
        width: 90,
      },
      {
        title: "Delta",
        dataIndex: "stock_delta",
        key: "stock_delta",
        width: 90,
        render: (value: number) => (
          <Tag bordered={false} color={getDeltaTagColor(Number(value || 0))}>
            {Number(value || 0) > 0 ? `+${value}` : value}
          </Tag>
        ),
      },
      {
        title: "Después",
        dataIndex: "stock_after",
        key: "stock_after",
        width: 90,
      },
      {
        title: "Sucursal",
        dataIndex: "branch_name",
        key: "branch_name",
        width: 160,
      },
    ],
    []
  );

  return (
    <div className="inventory-audit-page p-4">
      <div className="inventory-audit-header">
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            Auditoría de Stock
          </Typography.Title>
          <Typography.Paragraph className="inventory-audit-subtitle">
            Historial centralizado de movimientos reales de stock para revisión operativa e interna.
          </Typography.Paragraph>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={() => setRefreshTick((current) => current + 1)}>
            Actualizar
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} loading={exportLoading} onClick={() => void handleExport()}>
            Exportar Excel
          </Button>
        </Space>
      </div>

      <Card className="inventory-audit-filter-card">
        <div className="inventory-audit-filter-grid">
          <div>
            <div className="inventory-audit-filter-label">Rango</div>
            <RangePicker
              value={dateRange as any}
              onChange={(value) => {
                setDateRange(value ? [value[0], value[1]] : null);
                setPage(1);
              }}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <div className="inventory-audit-filter-label">Vendedor</div>
            <Select
              showSearch
              optionFilterProp="label"
              value={selectedSellerId}
              onChange={(value) => {
                setSelectedSellerId(value);
                setPage(1);
              }}
              options={sellers}
            />
          </div>
          <div>
            <div className="inventory-audit-filter-label">Sucursal</div>
            <Select
              value={selectedBranchId}
              onChange={(value) => {
                setSelectedBranchId(value);
                setPage(1);
              }}
              options={branches}
            />
          </div>
          <div>
            <div className="inventory-audit-filter-label">Tipo</div>
            <Select
              value={selectedEventType}
              onChange={(value) => {
                setSelectedEventType(value);
                setPage(1);
              }}
              options={EVENT_TYPE_OPTIONS}
            />
          </div>
          <div>
            <div className="inventory-audit-filter-label">Dirección</div>
            <Select
              value={selectedDirection}
              onChange={(value) => {
                setSelectedDirection(value);
                setPage(1);
              }}
              options={[
                { value: "all", label: "Todos" },
                { value: "out", label: "Solo salidas" },
                { value: "in", label: "Solo ingresos" },
                { value: "neutral", label: "Sin cambio neto" },
              ]}
            />
          </div>
          <div>
            <div className="inventory-audit-filter-label">Buscar</div>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Producto, variante, usuario, referencia..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>
        </div>
        <div className="inventory-audit-filter-actions">
          <Button onClick={handleResetFilters}>Limpiar filtros</Button>
        </div>
      </Card>

      <Tabs
        defaultActiveKey="operativa"
        items={[
          {
            key: "operativa",
            label: "Vista operativa",
            children: (
              <Card className="inventory-audit-table-card">
                <Table
                  rowKey="_id"
                  columns={columns}
                  dataSource={rows}
                  loading={loading}
                  scroll={{ x: 1320 }}
                  pagination={{
                    current: page,
                    pageSize: limit,
                    total,
                    showSizeChanger: true,
                    pageSizeOptions: ["20", "50", "100"],
                    onChange: (nextPage, nextLimit) => {
                      setPage(nextPage);
                      setLimit(nextLimit);
                    },
                  }}
                  locale={{
                    emptyText: loading ? "Cargando..." : <Empty description="No hay movimientos para los filtros seleccionados." />,
                  }}
                />
              </Card>
            ),
          },
          {
            key: "control",
            label: "Control interno",
            children: (
              <div className="inventory-audit-control-grid">
                <Card>
                  <Statistic title="Movimientos" value={summary.movementCount} />
                </Card>
                <Card>
                  <Statistic title="Ingresos de stock" value={summary.totalIn} />
                </Card>
                <Card>
                  <Statistic title="Salidas de stock" value={summary.totalOut} />
                </Card>
                <Card>
                  <Statistic title="Productos únicos" value={summary.uniqueProducts} />
                </Card>
                <Card title="Movimientos por tipo">
                  <List
                    dataSource={summary.byType}
                    locale={{ emptyText: "Sin datos" }}
                    renderItem={(item) => (
                      <List.Item>
                        <div>
                          <div>{getEventTypeMeta(item.eventType).label}</div>
                          <div className="inventory-audit-muted">Delta total: {item.totalDelta}</div>
                        </div>
                        <Tag>{item.count}</Tag>
                      </List.Item>
                    )}
                  />
                </Card>
                <Card title="Usuarios con más movimientos">
                  <List
                    dataSource={summary.byActor}
                    locale={{ emptyText: "Sin datos" }}
                    renderItem={(item) => (
                      <List.Item>
                        <div>
                          <div>{item.actorName}</div>
                          <div className="inventory-audit-muted">Salidas: {item.outUnits}</div>
                        </div>
                        <Tag>{item.count}</Tag>
                      </List.Item>
                    )}
                  />
                </Card>
                <Card title="Productos con más correcciones" className="inventory-audit-card-span-2">
                  <List
                    dataSource={summary.topProducts}
                    locale={{ emptyText: "Sin datos" }}
                    renderItem={(item) => (
                      <List.Item>
                        <div>
                          <div>{item.productName || "Producto"}</div>
                          <div className="inventory-audit-muted">{item.variantLabel || "Sin variante"}</div>
                        </div>
                        <Space>
                          <Tag>{item.count} mov.</Tag>
                          <Tag color="blue">Ajuste {item.totalAdjustment}</Tag>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              </div>
            ),
          },
        ]}
      />

      <Drawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={760}
        title="Detalle de operación"
      >
        {detailLoading ? (
          <Typography.Paragraph>Cargando detalle...</Typography.Paragraph>
        ) : !detailData?.event ? (
          <Empty description="No se pudo cargar el detalle de la operación." />
        ) : (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Tipo">
                <Tag color={getEventTypeMeta(detailData.event?.event_type).color}>
                  {getEventTypeMeta(detailData.event?.event_type).label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Fecha">{formatDateTime(detailData.event?.created_at)}</Descriptions.Item>
              <Descriptions.Item label="Usuario">
                {detailData.event?.actor_name || "Sistema"} {detailData.event?.actor_role ? `(${detailData.event.actor_role})` : ""}
              </Descriptions.Item>
              <Descriptions.Item label="Vendedor">{detailData.event?.seller_name || "-"}</Descriptions.Item>
              <Descriptions.Item label="Sucursal">{detailData.event?.branch_name || "-"}</Descriptions.Item>
              <Descriptions.Item label="Referencia">{detailData.event?.source_id || "-"}</Descriptions.Item>
              <Descriptions.Item label="Módulo">{detailData.event?.source_module || "-"}</Descriptions.Item>
              <Descriptions.Item label="Comentario">{detailData.event?.comment || "-"}</Descriptions.Item>
            </Descriptions>

            <Card title="Movimientos afectados">
              <Table
                rowKey="_id"
                columns={detailColumns}
                dataSource={Array.isArray(detailData?.movements) ? detailData.movements : []}
                pagination={false}
                locale={{ emptyText: "Sin movimientos asociados." }}
                scroll={{ x: 640 }}
              />
            </Card>
          </Space>
        )}
      </Drawer>
    </div>
  );
};

export default InventoryAuditPage;
