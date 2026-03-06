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
  Tooltip,
  Typography,
  message,
} from "antd";
import { BarChartOutlined, EyeOutlined, FileExcelOutlined, InfoCircleOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import {
  downloadClientesActivos3MesesXlsx,
  downloadClientesStatusXlsx,
  downloadComisiones3MesesXlsx,
  downloadIngresos3MesesXlsx,
  getClientesActivosMesesAPI,
  getComisionesMesesAPI,
  getIngresosMesesAPI,
  downloadOperacionMensualXlsx,
  downloadStockProductosXlsx,
  downloadVentasQrXlsx,
  downloadVentasVendedores4mXlsx,
  getOperacionMensualAPI,
  getVentasVendedoresMesesAPI,
  getVentasQrAPI,
} from "../api/reports";
import { getAllSucursalsAPI } from "../api/sucursal";

type OperacionReportKey =
  | "topProductosPorSucursal"
  | "topGlobal"
  | "deliveryPromedioPorSucursal"
  | "costoEntregaPromedioPorSucursal"
  | "clientesPorHoraMensual"
  | "ticketPromedioPorSucursal"
  | "ticketPromedioClientesPorSucursal"
  | "clientesActivosPorSucursal"
  | "clientesNuevosPorSucursal"
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
  previewMode: "operacion" | "ventasQr" | "comisiones" | "ingresos" | "clientesActivosServicio" | "ventasVendedores" | "none";
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
    title: "Pago promedio de un cliente por compra",
    description: "Promedio pagado por compra, por sucursal y global.",
    category: "Operacion mensual",
    previewMode: "operacion",
    requires: { meses: true, sucursales: true },
    operacionKey: "ticketPromedioClientesPorSucursal",
  },
  {
    id: "ticketPromedioPorSucursal",
    title: "Ticket promedio por vendedor",
    description: "Promedio de servicios pagados por los vendedores activos.",
    category: "Operacion mensual",
    previewMode: "operacion",
    requires: { meses: true, sucursales: true },
    operacionKey: "ticketPromedioPorSucursal",
  },
  {
    id: "clientesActivosPorSucursal",
    title: "Numero de clientes activos",
    description: "Clientes de servicio activos por sucursal y global.",
    category: "Operacion mensual",
    previewMode: "operacion",
    requires: { meses: true, sucursales: true },
    operacionKey: "clientesActivosPorSucursal",
  },
  {
    id: "clientesNuevosPorSucursal",
    title: "Clientes nuevos",
    description: "Clientes de servicio que ingresaron por mes y sucursal.",
    category: "Operacion mensual",
    previewMode: "operacion",
    requires: { meses: true, sucursales: true },
    operacionKey: "clientesNuevosPorSucursal",
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
    title: "Comisiones por meses",
    description: "Vista previa y descarga XLSX.",
    category: "Reportes adicionales",
    previewMode: "comisiones",
    requires: { meses: true, sucursales: true },
  },
  {
    id: "ingresos3m",
    title: "Ingresos por meses",
    description: "Vista previa y descarga XLSX.",
    category: "Reportes adicionales",
    previewMode: "ingresos",
    requires: { meses: true, incluirDeuda: true },
  },
  {
    id: "clientesActivos3m",
    title: "Clientes activos por meses",
    description: "Clientes de servicio activos con vista previa y XLSX.",
    category: "Reportes adicionales",
    previewMode: "clientesActivosServicio",
    requires: { meses: true },
  },
  {
    id: "ventasVendedores4m",
    title: "Ventas vendedores por meses",
    description: "Vista previa y descarga XLSX.",
    category: "Reportes adicionales",
    previewMode: "ventasVendedores",
    requires: { meses: true },
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
    { title: "Cliente/Vendedor", dataIndex: "cliente" },
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
  ticketPromedioPorSucursal: [
    { title: "Mes", dataIndex: "mes", width: 110 },
    { title: "Sucursal", dataIndex: "sucursal" },
    { title: "Clientes activos", dataIndex: "vendedores_activos", width: 140 },
    { title: "Total servicios (Bs.)", dataIndex: "total_servicios_bs", width: 170 },
    { title: "Ticket Prom. (Bs.)", dataIndex: "ticket_promedio_bs", width: 150 },
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
  clientesNuevosPorSucursal: [
    { title: "Mes", dataIndex: "mes", width: 110 },
    { title: "Sucursal", dataIndex: "sucursal" },
    {
      title: "Tipo",
      dataIndex: "tipo",
      width: 130,
      render: (value: string) => (value === "ampliacion" ? "Ampliación" : "Nuevo"),
    },
    { title: "Clientes nuevos", dataIndex: "clientes_nuevos", width: 160 },
  ],
  ventasMensualPorSucursal: [
    { title: "Mes", dataIndex: "mes", width: 110 },
    { title: "Sucursal", dataIndex: "sucursal" },
    { title: "Ventas", dataIndex: "ventas", width: 100 },
    { title: "Monto (Bs.)", dataIndex: "monto_bs", width: 140 },
  ],
};

function getOperacionColumns(reportKey: OperacionReportKey, modoTop?: "clientes" | "vendedores") {
  if (reportKey !== "topGlobal") return columnsByOperacionKey[reportKey] || [];

  if (modoTop === "vendedores") {
    return [
      {
        title: "Vendedor",
        dataIndex: "vendedor",
        render: (_: any, r: any) => r.vendedor ?? r.cliente ?? "-",
      },
      { title: "Monto (Bs.)", dataIndex: "monto_bs", width: 130 },
    ];
  }

  return [
    {
      title: "Cliente",
      dataIndex: "cliente",
      render: (_: any, r: any) => r.cliente ?? "-",
    },
    { title: "Pedidos", dataIndex: "pedidos", width: 100 },
    { title: "Monto (Bs.)", dataIndex: "monto_bs", width: 130 },
    { title: "Ticket Prom. (Bs.)", dataIndex: "ticket_promedio_bs", width: 160 },
  ];
}

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

    const normalizedSucursales = req.sucursales
      ? ((vals.sucursales && vals.sucursales.length > 0)
          ? vals.sucursales
          : sucOptions.map((option) => String(option.value)))
      : vals.sucursales;

    if (req.sucursales && (!normalizedSucursales || normalizedSucursales.length === 0)) {
      message.error("No hay sucursales disponibles para este reporte");
      return null;
    }

    if (req.sucursales && (!vals.sucursales || vals.sucursales.length === 0)) {
      form.setFieldValue("sucursales", normalizedSucursales);
    }

    return {
      ...vals,
      sucursales: normalizedSucursales,
    };
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
          modoTop: vals.modoTop,
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
        return;
      }

      if (selectedReport.previewMode === "comisiones") {
        const meses = (vals.meses || []).map((m) => m.format("YYYY-MM"));
        const data = await getComisionesMesesAPI({ meses, sucursales: vals.sucursales });
        setPreview({ mode: "additional", reportId: selectedReport.id, data });
        return;
      }

      if (selectedReport.previewMode === "ingresos") {
        const meses = (vals.meses || []).map((m) => m.format("YYYY-MM"));
        const data = await getIngresosMesesAPI({ meses, incluirDeuda: !!vals.incluirDeuda });
        setPreview({ mode: "additional", reportId: selectedReport.id, data });
        return;
      }

      if (selectedReport.previewMode === "clientesActivosServicio") {
        const meses = (vals.meses || []).map((m) => m.format("YYYY-MM"));
        const data = await getClientesActivosMesesAPI({ meses });
        setPreview({ mode: "additional", reportId: selectedReport.id, data });
        return;
      }

      if (selectedReport.previewMode === "ventasVendedores") {
        const meses = (vals.meses || []).map((m) => m.format("YYYY-MM"));
        const data = await getVentasVendedoresMesesAPI({ meses });
        setPreview({ mode: "additional", reportId: selectedReport.id, data });
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
      const meses = (vals.meses || []).map((m) => m.format("YYYY-MM"));

      switch (selectedReport.id) {
        case "topProductosPorSucursal":
        case "topGlobal":
        case "deliveryPromedioPorSucursal":
        case "costoEntregaPromedioPorSucursal":
        case "clientesPorHoraMensual":
        case "ticketPromedioPorSucursal":
        case "ticketPromedioClientesPorSucursal":
        case "clientesActivosPorSucursal":
        case "clientesNuevosPorSucursal":
        case "ventasMensualPorSucursal": {
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
          await downloadComisiones3MesesXlsx({ meses, mesFin, sucursales: vals.sucursales });
          break;
        case "ingresos3m":
          await downloadIngresos3MesesXlsx({ meses, mesFin, incluirDeuda: !!vals.incluirDeuda });
          break;
        case "clientesActivos3m":
          await downloadClientesActivos3MesesXlsx({ meses, mesFin });
          break;
        case "ventasVendedores4m":
          await downloadVentasVendedores4mXlsx({ meses, mesFin });
          break;
        case "ventasQr": {
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
        {
          title: "Delivery promedio global sin 0",
          value: formatBs(data.deliveryPromedioGlobal.promedio_sin_ceros_bs),
          subtitle: "Solo considera costos mayores a 0 Bs.",
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

    if (key === "ticketPromedioPorSucursal" && data.ticketPromedioGlobal) {
      return [
        {
          title: "Ticket promedio global por vendedor",
          value: formatBs(data.ticketPromedioGlobal.ticket_promedio_bs),
          subtitle: `Sucursales: ${data.ticketPromedioGlobal.sucursales ?? 0}`,
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

    if (key === "clientesNuevosPorSucursal" && data.clientesNuevosGlobal) {
      return [
        {
          title: "Clientes nuevos global",
          value: `${data.clientesNuevosGlobal.clientes_nuevos ?? 0}`,
          subtitle: "Total unico del periodo",
        },
        {
          title: "Clientes que ampliaron",
          value: `${data.clientesNuevosGlobal.clientes_ampliaron ?? 0}`,
          subtitle: "Clientes antiguos que tomaron otra sucursal",
        },
      ];
    }

    return [];
  }, [preview]);

  const additionalPreview = useMemo(() => {
    if (!preview || preview.mode !== "additional") return null;

    const data = preview.data || {};

    if (preview.reportId === "comisiones3m") {
      return {
        cards: [
          {
            title: "Comision total",
            value: formatBs(data?.totalGeneral?.comision_bs),
            subtitle: `Sucursales: ${data?.totalGeneral?.sucursales ?? 0}`,
          },
        ],
        tables: [
          { title: "Comisiones por mes y sucursal", rows: data.rows || [] },
          { title: "Totales por mes", rows: data.totalesPorMes || [] },
        ],
      };
    }

    if (preview.reportId === "ingresos3m") {
      return {
        cards: [
          {
            title: "Ingresos totales",
            value: formatBs(data?.totalGlobal?.monto_bs),
            subtitle: `Movimientos: ${data?.totalGlobal?.movimientos ?? 0}`,
          },
        ],
        tables: [
          { title: "Totales por mes", rows: data.totalesPorMes || [] },
          { title: "Detalle", rows: data.detalle || [] },
        ],
      };
    }

    if (preview.reportId === "clientesActivos3m") {
      return {
        cards: [
          {
            title: "Clientes activos",
            value: `${data?.resumen?.clientes_activos ?? 0}`,
            subtitle: `Monto del periodo: ${formatBs(data?.resumen?.total_periodo_bs)}`,
          },
        ],
        tables: [{ title: "Detalle de clientes", rows: data.rows || [] }],
      };
    }

    if (preview.reportId === "ventasVendedores4m") {
      return {
        cards: [
          {
            title: "Vendedores en resumen",
            value: `${Array.isArray(data?.resumen) ? data.resumen.length : 0}`,
            subtitle: `Meses: ${Array.isArray(data?.meses) ? data.meses.length : 0}`,
          },
        ],
        tables: [
          { title: "Resumen por vendedor", rows: data.resumen || [] },
          { title: "Detalle", rows: data.detalle || [] },
        ],
      };
    }

    return null;
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
                        placeholder="Si no eliges, se usaran todas las sucursales activas"
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

                {preview.reportKey === "deliveryPromedioPorSucursal" && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "rgba(245, 158, 11, 0.08)",
                      border: "1px solid rgba(245, 158, 11, 0.18)",
                    }}
                  >
                    <Tooltip title="Sin 0 excluye envios cuyo costo delivery fue 0 Bs. para mostrar un promedio mas representativo cuando hubo costo real.">
                      <InfoCircleOutlined style={{ color: "#c2410c" }} />
                    </Tooltip>
                    <Text type="secondary" style={{ margin: 0 }}>
                      "Sin 0" excluye los deliveries con costo 0 Bs. del promedio.
                    </Text>
                  </div>
                )}

                <Table
                  size="small"
                  rowKey={(_, i) => `row-${String(i)}`}
                  dataSource={preview.rows || []}
                  columns={getOperacionColumns(preview.reportKey, preview.modoTop)}
                  pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true,
                    pageSizeOptions: ["10", "20", "50", "100"],
                  }}
                  scroll={{ x: 900 }}
                />
              </Space>
            ) : preview.mode === "additional" ? (
              <Space direction="vertical" className="w-full" size="middle">
                {additionalPreview?.cards?.length ? (
                  <Row gutter={[12, 12]}>
                    {additionalPreview.cards.map((item) => (
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
                ) : null}

                {(additionalPreview?.tables || []).map((table) => (
                  <Card size="small" key={table.title} title={table.title}>
                    <Table
                      size="small"
                      rowKey={(_, i) => `${table.title}-${String(i)}`}
                      dataSource={table.rows || []}
                      columns={buildColumnsFromRows(table.rows || [])}
                      pagination={{
                        defaultPageSize: 10,
                        showSizeChanger: true,
                        pageSizeOptions: ["10", "20", "50", "100"],
                      }}
                      scroll={{ x: 900 }}
                    />
                  </Card>
                ))}
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
