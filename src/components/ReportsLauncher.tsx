// src/components/ReportsLauncher.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { BarChartOutlined, EyeOutlined, FileExcelOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import {
  downloadClientesActivos3MesesXlsx,
  downloadClientesStatusXlsx,
  downloadComisiones3MesesXlsx,
  downloadIngresos3MesesXlsx,
  downloadOperacionMensualXlsx,
  downloadStockProductosXlsx,
  downloadVentasQrXlsx,
  downloadVentasVendedores4mXlsx,
  getOperacionMensualAPI,
  getVentasQrAPI,
} from "../api/reports";
import { getAllSucursalsAPI } from "../api/sucursal";

type OperacionReportKey =
  | "topProductosPorSucursal"
  | "topGlobal"
  | "deliveryPromedioPorSucursal"
  | "costoEntregaPromedioPorSucursal"
  | "clientesPorHoraMensual"
  | "ticketPromedioClientesPorSucursal"
  | "clientesActivosPorSucursal"
  | "ventasMensualPorSucursal";

type ReportId =
  | OperacionReportKey
  | "stockProductos"
  | "comisiones3m"
  | "ingresos3m"
  | "clientesActivos3m"
  | "ventasVendedores4m"
  | "ventasQr"
  | "clientesStatus";

type ReportCategory = "Operacion mensual" | "Reportes adicionales";

type ReportDefinition = {
  id: ReportId;
  title: string;
  description: string;
  category: ReportCategory;
  previewMode: "operacion" | "ventasQr" | "none";
  requires: {
    meses?: boolean;
    mesFin?: boolean;
    sucursales?: boolean;
    sucursalId?: boolean;
    modoTop?: boolean;
    incluirDeuda?: boolean;
  };
  operacionKey?: OperacionReportKey;
};

type LauncherFormValues = {
  reportId?: ReportId;
  meses?: Dayjs[];
  mesFin?: Dayjs;
  sucursales?: string[];
  sucursalId?: string;
  modoTop?: "clientes" | "vendedores";
  incluirDeuda?: boolean;
};

const REPORTS: ReportDefinition[] = [
  {
    id: "topProductosPorSucursal",
    title: "Top 10 productos por sucursal",
    description: "Ranking de productos mas vendidos por sucursal.",
    category: "Operacion mensual",
    previewMode: "operacion",
    requires: { meses: true, sucursales: true },
    operacionKey: "topProductosPorSucursal",
  },
  {
    id: "topGlobal",
    title: "Top 10 global",
    description: "Top global por monto (clientes o vendedores).",
    category: "Operacion mensual",
    previewMode: "operacion",
    requires: { meses: true, sucursales: true, modoTop: true },
    operacionKey: "topGlobal",
  },
  {
    id: "deliveryPromedioPorSucursal",
    title: "Costo promedio delivery por sucursal",
    description: "Incluye resumen global automatico.",
    category: "Operacion mensual",
    previewMode: "operacion",
    requires: { meses: true, sucursales: true },
    operacionKey: "deliveryPromedioPorSucursal",
  },
  {
    id: "costoEntregaPromedioPorSucursal",
    title: "Costo por entrega promedio",
    description: "Costo operativo por entrega (sucursal y global).",
    category: "Operacion mensual",
    previewMode: "operacion",
    requires: { meses: true, sucursales: true },
    operacionKey: "costoEntregaPromedioPorSucursal",
  },
  {
    id: "clientesPorHoraMensual",
    title: "Clientes por hora (L-S)",
    description: "Clientes atendidos por hora y sucursal.",
    category: "Operacion mensual",
    previewMode: "operacion",
    requires: { meses: true, sucursales: true },
    operacionKey: "clientesPorHoraMensual",
  },
  {
    id: "ticketPromedioClientesPorSucursal",
    title: "Ticket promedio cliente",
    description: "Ticket promedio de clientes por sucursal y global.",
    category: "Operacion mensual",
    previewMode: "operacion",
    requires: { meses: true, sucursales: true },
    operacionKey: "ticketPromedioClientesPorSucursal",
  },
  {
    id: "clientesActivosPorSucursal",
    title: "Numero de clientes activos",
    description: "Clientes activos por sucursal y global.",
    category: "Operacion mensual",
    previewMode: "operacion",
    requires: { meses: true, sucursales: true },
    operacionKey: "clientesActivosPorSucursal",
  },
  {
    id: "ventasMensualPorSucursal",
    title: "Monto vendido mensual por sucursal",
    description: "Monto y cantidad de ventas por mes/sucursal.",
    category: "Operacion mensual",
    previewMode: "operacion",
    requires: { meses: true, sucursales: true },
    operacionKey: "ventasMensualPorSucursal",
  },
  {
    id: "stockProductos",
    title: "Stock productos por sucursal",
    description: "Solo descarga XLSX.",
    category: "Reportes adicionales",
    previewMode: "none",
    requires: { sucursalId: true },
  },
  {
    id: "comisiones3m",
    title: "Comisiones 3M",
    description: "Solo descarga XLSX.",
    category: "Reportes adicionales",
    previewMode: "none",
    requires: { mesFin: true, sucursales: true },
  },
  {
    id: "ingresos3m",
    title: "Ingresos 3M",
    description: "Solo descarga XLSX.",
    category: "Reportes adicionales",
    previewMode: "none",
    requires: { mesFin: true, incluirDeuda: true },
  },
  {
    id: "clientesActivos3m",
    title: "Clientes activos 3M",
    description: "Solo descarga XLSX.",
    category: "Reportes adicionales",
    previewMode: "none",
    requires: { mesFin: true },
  },
  {
    id: "ventasVendedores4m",
    title: "Ventas vendedores 4M",
    description: "Solo descarga XLSX.",
    category: "Reportes adicionales",
    previewMode: "none",
    requires: {},
  },
  {
    id: "ventasQr",
    title: "Ventas QR",
    description: "Vista previa y descarga XLSX.",
    category: "Reportes adicionales",
    previewMode: "ventasQr",
    requires: { meses: true, sucursales: true },
  },
  {
    id: "clientesStatus",
    title: "Clientes status",
    description: "Solo descarga XLSX.",
    category: "Reportes adicionales",
    previewMode: "none",
    requires: {},
  },
];

const { Title, Text } = Typography;

const columnsByOperacionKey: Record<OperacionReportKey, any[]> = {
  topProductosPorSucursal: [
    { title: "Sucursal", dataIndex: "sucursal" },
    { title: "Categoria", dataIndex: "categoria" },
    { title: "Producto", dataIndex: "nombre_producto" },
    { title: "Unidades", dataIndex: "unidades", width: 100 },
    { title: "Monto (Bs.)", dataIndex: "monto_bs", width: 130 },
    { title: "Rank", dataIndex: "rank", width: 90 },
  ],
  topGlobal: [
    {
      title: "Cliente/Vendedor",
      dataIndex: "cliente",
      render: (_: any, r: any) => r.cliente ?? r.vendedor ?? "-",
    },
    { title: "Pedidos", dataIndex: "pedidos", width: 100 },
    { title: "Monto (Bs.)", dataIndex: "monto_bs", width: 130 },
    { title: "Ticket Prom. (Bs.)", dataIndex: "ticket_promedio_bs", width: 160 },
  ],
  deliveryPromedioPorSucursal: [
    { title: "Sucursal", dataIndex: "sucursal" },
    { title: "Envios", dataIndex: "envios", width: 100 },
    { title: "Promedio (Bs.)", dataIndex: "promedio_bs", width: 140 },
    { title: "Promedio sin 0 (Bs.)", dataIndex: "promedio_sin_ceros_bs", width: 170 },
  ],
  costoEntregaPromedioPorSucursal: [
    { title: "Sucursal", dataIndex: "sucursal" },
    { title: "Costos operativos (Bs.)", dataIndex: "costos_operativos_bs", width: 170 },
    { title: "Entregas", dataIndex: "entregas", width: 100 },
    { title: "Costo/Entrega (Bs.)", dataIndex: "costo_entrega_promedio_bs", width: 160 },
  ],
  clientesPorHoraMensual: [
    { title: "Sucursal", dataIndex: "sucursal" },
    { title: "Hora", dataIndex: "hora", width: 100 },
    { title: "Clientes atendidos", dataIndex: "clientes_atendidos", width: 160 },
  ],
  ticketPromedioClientesPorSucursal: [
    { title: "Sucursal", dataIndex: "sucursal" },
    { title: "Pedidos", dataIndex: "pedidos", width: 100 },
    { title: "Monto total (Bs.)", dataIndex: "monto_total_bs", width: 150 },
    { title: "Ticket Prom. (Bs.)", dataIndex: "ticket_promedio_bs", width: 150 },
  ],
  clientesActivosPorSucursal: [
    { title: "Sucursal", dataIndex: "sucursal" },
    { title: "Clientes activos", dataIndex: "clientes_activos", width: 160 },
  ],
  ventasMensualPorSucursal: [
    { title: "Mes", dataIndex: "mes", width: 110 },
    { title: "Sucursal", dataIndex: "sucursal" },
    { title: "Ventas", dataIndex: "ventas", width: 100 },
    { title: "Monto (Bs.)", dataIndex: "monto_bs", width: 140 },
  ],
};

function formatBs(value: any) {
  const num = typeof value === "number" ? value : Number(value || 0);
  return `${Number.isFinite(num) ? num.toFixed(2) : "0.00"} Bs.`;
}

function buildColumnsFromRows(rows: any[]) {
  if (!rows.length) return [];
  return Object.keys(rows[0]).map((k) => ({ title: k, dataIndex: k, key: k }));
}

export default function ReportsLauncher() {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<LauncherFormValues>();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [sucursales, setSucursales] = useState<{ _id: string; nombre: string }[]>([]);
  const [loadingSucursales, setLoadingSucursales] = useState(false);

  const reportId = Form.useWatch("reportId", form) as ReportId | undefined;
  const selectedReport = useMemo(() => REPORTS.find((r) => r.id === reportId), [reportId]);

  useEffect(() => {
    setLoadingSucursales(true);
    getAllSucursalsAPI()
      .then((r: any) => setSucursales(r?.data ?? []))
      .catch(() => message.warning("No se pudo cargar la lista de sucursales"))
      .finally(() => setLoadingSucursales(false));
  }, []);

  useEffect(() => {
    form.setFieldsValue({
      reportId: "topProductosPorSucursal",
      meses: [],
      modoTop: "clientes",
      sucursales: [],
      incluirDeuda: false,
    });
  }, [form]);

  useEffect(() => {
    setPreview(null);
  }, [reportId]);

  const sucOptions = useMemo(
    () => sucursales.map((s) => ({ value: s._id, label: s.nombre })),
    [sucursales],
  );

  const reportSelectOptions = useMemo(() => {
    const categories: ReportCategory[] = ["Operacion mensual", "Reportes adicionales"];
    return categories.map((category) => ({
      label: category,
      options: REPORTS.filter((r) => r.category === category).map((r) => ({
        value: r.id,
        label: r.title,
      })),
    }));
  }, []);

  const validateInputs = async () => {
    const vals = (await form.validateFields()) as LauncherFormValues;
    if (!selectedReport) {
      message.error("Selecciona un reporte");
      return null;
    }

    const req = selectedReport.requires;
    if (req.meses && !(vals.meses && vals.meses.length)) {
      message.error("Este reporte requiere al menos un mes");
      return null;
    }
    if (req.mesFin && !vals.mesFin) {
      message.error("Este reporte requiere mes de cierre (YYYY-MM)");
      return null;
    }
    if (req.sucursalId && !vals.sucursalId) {
      message.error("Este reporte requiere seleccionar una sucursal");
      return null;
    }

    return vals;
  };

  const handlePreview = async () => {
    const vals = await validateInputs();
    if (!vals || !selectedReport) return;

    if (selectedReport.previewMode === "none") {
      message.info("Este reporte no tiene vista previa. Solo descarga XLSX.");
      return;
    }

    try {
      setLoading(true);

      if (selectedReport.previewMode === "operacion" && selectedReport.operacionKey) {
        const meses = (vals.meses || []).map((m) => m.format("YYYY-MM"));
        const data = await getOperacionMensualAPI({
          meses,
          sucursales: vals.sucursales,
          modoTop: vals.modoTop,
          reportes: [selectedReport.operacionKey],
        });

        setPreview({
          mode: "operacion",
          reportKey: selectedReport.operacionKey,
          rows: Array.isArray(data?.[selectedReport.operacionKey]) ? data[selectedReport.operacionKey] : [],
          data,
        });
        return;
      }

      if (selectedReport.previewMode === "ventasQr") {
        const meses = (vals.meses || []).map((m) => m.format("YYYY-MM"));
        const data = await getVentasQrAPI({
          meses,
          sucursales: vals.sucursales,
        });

        setPreview({
          mode: "ventasQr",
          data,
        });
      }
    } catch (error) {
      console.error(error);
      message.error("No se pudo generar la vista previa");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    const vals = await validateInputs();
    if (!vals || !selectedReport) return;

    try {
      setLoading(true);
      const mesFin = vals.mesFin?.format("YYYY-MM") || "";

      switch (selectedReport.id) {
        case "topProductosPorSucursal":
        case "topGlobal":
        case "deliveryPromedioPorSucursal":
        case "costoEntregaPromedioPorSucursal":
        case "clientesPorHoraMensual":
        case "ticketPromedioClientesPorSucursal":
        case "clientesActivosPorSucursal":
        case "ventasMensualPorSucursal": {
          const meses = (vals.meses || []).map((m) => m.format("YYYY-MM"));
          await downloadOperacionMensualXlsx({
            meses,
            sucursales: vals.sucursales,
            modoTop: vals.modoTop,
            reportes: [selectedReport.operacionKey as string],
          });
          break;
        }
        case "stockProductos":
          await downloadStockProductosXlsx(vals.sucursalId as string);
          break;
        case "comisiones3m":
          await downloadComisiones3MesesXlsx({ mesFin, sucursales: vals.sucursales });
          break;
        case "ingresos3m":
          await downloadIngresos3MesesXlsx(mesFin, !!vals.incluirDeuda);
          break;
        case "clientesActivos3m":
          await downloadClientesActivos3MesesXlsx(mesFin);
          break;
        case "ventasVendedores4m":
          await downloadVentasVendedores4mXlsx();
          break;
        case "ventasQr": {
          const meses = (vals.meses || []).map((m) => m.format("YYYY-MM"));
          await downloadVentasQrXlsx({ meses, sucursales: vals.sucursales });
          break;
        }
        case "clientesStatus":
          await downloadClientesStatusXlsx();
          break;
        default:
          break;
      }

      message.success("Descarga iniciada");
    } catch (error) {
      console.error(error);
      message.error("No se pudo iniciar la descarga");
    } finally {
      setLoading(false);
    }
  };

  const globalSummary = useMemo(() => {
    if (!preview || preview.mode !== "operacion") return [];

    const key = preview.reportKey as OperacionReportKey;
    const data = preview.data || {};

    if (key === "deliveryPromedioPorSucursal" && data.deliveryPromedioGlobal) {
      return [
        {
          title: "Delivery promedio global",
          value: formatBs(data.deliveryPromedioGlobal.promedio_bs),
          subtitle: `Envios: ${data.deliveryPromedioGlobal.envios ?? 0}`,
        },
      ];
    }

    if (key === "costoEntregaPromedioPorSucursal" && data.costoEntregaPromedioGlobal) {
      return [
        {
          title: "Costo entrega global",
          value: formatBs(data.costoEntregaPromedioGlobal.costo_entrega_promedio_bs),
          subtitle: `Entregas: ${data.costoEntregaPromedioGlobal.entregas ?? 0}`,
        },
      ];
    }

    if (key === "ticketPromedioClientesPorSucursal" && data.ticketPromedioClientesGlobal) {
      return [
        {
          title: "Ticket promedio global",
          value: formatBs(data.ticketPromedioClientesGlobal.ticket_promedio_bs),
          subtitle: `Pedidos: ${data.ticketPromedioClientesGlobal.pedidos ?? 0}`,
        },
      ];
    }

    if (key === "clientesActivosPorSucursal" && data.clientesActivosGlobal) {
      return [
        {
          title: "Clientes activos global",
          value: `${data.clientesActivosGlobal.clientes_activos ?? 0}`,
          subtitle: "Total unico del periodo",
        },
      ];
    }

    return [];
  }, [preview]);

  return (
    <>
      <Button type="primary" icon={<BarChartOutlined />} onClick={() => setOpen(true)}>
        Reportes
      </Button>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        width={980}
        title={
          <Space direction="vertical" size={0}>
            <Title level={4} style={{ margin: 0 }}>
              Centro de Reportes
            </Title>
            <Text type="secondary">Selecciona un reporte, completa solo sus datos y ejecuta.</Text>
          </Space>
        }
        footer={
          <Space>
            <Button
              icon={<EyeOutlined />}
              onClick={handlePreview}
              loading={loading}
              disabled={!selectedReport || selectedReport.previewMode === "none"}
            >
              Vista previa
            </Button>
            <Button type="primary" icon={<FileExcelOutlined />} onClick={handleDownload} loading={loading}>
              Descargar XLSX
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" className="w-full" size="middle">
          <Card size="small">
            <Form form={form} layout="vertical" initialValues={{ modoTop: "clientes", incluirDeuda: false }}>
              <Row gutter={[12, 12]}>
                <Col xs={24} md={14}>
                  <Form.Item name="reportId" label="Reporte" rules={[{ required: true, message: "Selecciona un reporte" }]}>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      options={reportSelectOptions}
                      placeholder="Selecciona un reporte"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={10}>
                  <Card size="small" style={{ height: "100%" }}>
                    <Space direction="vertical" size={3}>
                      <Text strong>{selectedReport?.title || "Sin reporte seleccionado"}</Text>
                      <Text type="secondary">{selectedReport?.description || ""}</Text>
                      {selectedReport && (
                        <Space size={6} wrap>
                          <Tag color="blue">{selectedReport.category}</Tag>
                          <Tag color={selectedReport.previewMode === "none" ? "default" : "green"}>
                            {selectedReport.previewMode === "none" ? "Solo XLSX" : "Vista previa + XLSX"}
                          </Tag>
                        </Space>
                      )}
                    </Space>
                  </Card>
                </Col>

                {selectedReport?.requires.meses && (
                  <Col xs={24} md={8}>
                    <Form.Item name="meses" label="Meses" rules={[{ required: true, message: "Selecciona al menos un mes" }]}>
                      <DatePicker picker="month" multiple format="YYYY-MM" style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                )}

                {selectedReport?.requires.mesFin && (
                  <Col xs={24} md={8}>
                    <Form.Item name="mesFin" label="Mes de cierre (mesFin)" rules={[{ required: true, message: "Selecciona mesFin" }]}>
                      <DatePicker picker="month" format="YYYY-MM" style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                )}

                {selectedReport?.requires.sucursales && (
                  <Col xs={24} md={8}>
                    <Form.Item name="sucursales" label="Sucursales (opcional)">
                      <Select
                        mode="multiple"
                        allowClear
                        loading={loadingSucursales}
                        options={sucOptions}
                        placeholder="Si no eliges, usa todas/default"
                      />
                    </Form.Item>
                  </Col>
                )}

                {selectedReport?.requires.sucursalId && (
                  <Col xs={24} md={8}>
                    <Form.Item name="sucursalId" label="Sucursal" rules={[{ required: true, message: "Selecciona sucursal" }]}>
                      <Select
                        allowClear
                        loading={loadingSucursales}
                        options={sucOptions}
                        placeholder="Selecciona sucursal"
                      />
                    </Form.Item>
                  </Col>
                )}

                {selectedReport?.requires.modoTop && (
                  <Col xs={24} md={8}>
                    <Form.Item name="modoTop" label="Top global" rules={[{ required: true }]}> 
                      <Radio.Group optionType="button" buttonStyle="solid">
                        <Radio.Button value="clientes">Clientes</Radio.Button>
                        <Radio.Button value="vendedores">Vendedores</Radio.Button>
                      </Radio.Group>
                    </Form.Item>
                  </Col>
                )}

                {selectedReport?.requires.incluirDeuda && (
                  <Col xs={24} md={8}>
                    <Form.Item name="incluirDeuda" label="Incluir deuda" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  </Col>
                )}
              </Row>
            </Form>
          </Card>

          {selectedReport?.previewMode === "none" && (
            <Alert
              type="info"
              showIcon
              message="Este reporte no tiene vista previa"
              description="Puedes descargarlo directamente en XLSX con el boton de la parte inferior."
            />
          )}

          <Spin spinning={loading}>
            {!preview ? (
              <Alert
                type="warning"
                showIcon
                message="Sin vista previa"
                description="Selecciona un reporte y usa Vista previa cuando aplique."
              />
            ) : preview.mode === "operacion" ? (
              <Space direction="vertical" className="w-full" size="middle">
                {globalSummary.length > 0 && (
                  <Row gutter={[12, 12]}>
                    {globalSummary.map((item) => (
                      <Col xs={24} md={8} key={item.title}>
                        <Card size="small">
                          <Text type="secondary">{item.title}</Text>
                          <Title level={4} style={{ margin: "6px 0" }}>
                            {item.value}
                          </Title>
                          <Text type="secondary">{item.subtitle}</Text>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}

                <Table
                  size="small"
                  rowKey={(_, i) => `row-${String(i)}`}
                  dataSource={preview.rows || []}
                  columns={columnsByOperacionKey[preview.reportKey] || []}
                  pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true,
                    pageSizeOptions: ["10", "20", "50", "100"],
                  }}
                  scroll={{ x: 900 }}
                />
              </Space>
            ) : (
              <Space direction="vertical" className="w-full" size="middle">
                <Card size="small" title="Ventas QR - Totales por Mes y Sucursal">
                  <Table
                    size="small"
                    rowKey={(_, i) => `qr-ms-${String(i)}`}
                    dataSource={preview?.data?.totalesPorMesYSucursal || []}
                    columns={buildColumnsFromRows(preview?.data?.totalesPorMesYSucursal || [])}
                    pagination={{
                      defaultPageSize: 10,
                      showSizeChanger: true,
                      pageSizeOptions: ["10", "20", "50", "100"],
                    }}
                    scroll={{ x: 900 }}
                  />
                </Card>
                <Card size="small" title="Ventas QR - Totales por Mes">
                  <Table
                    size="small"
                    rowKey={(_, i) => `qr-m-${String(i)}`}
                    dataSource={preview?.data?.totalesPorMes || []}
                    columns={buildColumnsFromRows(preview?.data?.totalesPorMes || [])}
                    pagination={{
                      defaultPageSize: 10,
                      showSizeChanger: true,
                      pageSizeOptions: ["10", "20", "50", "100"],
                    }}
                    scroll={{ x: 700 }}
                  />
                </Card>
              </Space>
            )}
          </Spin>
        </Space>
      </Modal>
    </>
  );
}
