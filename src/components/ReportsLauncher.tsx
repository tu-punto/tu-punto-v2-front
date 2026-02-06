// src/components/ReportsLauncher.tsx
import { useEffect, useMemo, useState } from "react";
import {
    Button, Modal, Form, DatePicker, Select, Radio, Space, Tabs, Table, Typography, Divider, message, Alert, Spin
} from "antd";
import { FileExcelOutlined, BarChartOutlined, EyeOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { getOperacionMensualAPI, downloadOperacionMensualXlsx } from "../api/reports";
import { getAllSucursalsAPI } from "../api/sucursal";
type ReportFormValues = {
    meses: Dayjs[];
    sucursales?: string[];
    modoTop: "clientes" | "vendedores";
    reportes?: string[];
};

const columnsByKey: Record<string, any[]> = {
    topProductosPorSucursal: [
        { title: "Sucursal", dataIndex: "sucursal" },
        { title: "CategorÃ­a", dataIndex: "categoria" },
        { title: "Producto", dataIndex: "nombre_producto" },
        { title: "Unid.", dataIndex: "unidades", width: 90 },
        { title: "Monto (Bs.)", dataIndex: "monto_bs", width: 120 },
        { title: "Rank", dataIndex: "rank", width: 80 }
    ],
    topGlobal: [
        { title: "Cliente/Vendedor", dataIndex: "cliente", render: (_:any, r:any)=> r.cliente ?? r.vendedor ?? "-" },
        { title: "Pedidos", dataIndex: "pedidos", width: 100 },
        { title: "Monto (Bs.)", dataIndex: "monto_bs", width: 120 },
        { title: "Ticket Prom. (Bs.)", dataIndex: "ticket_promedio_bs", width: 160 }
    ],
    deliveryPromedioPorSucursal: [
        { title: "Sucursal", dataIndex: "sucursal" },
        { title: "Envíos", dataIndex: "envios", width: 90 },
        { title: "Promedio (Bs.)", dataIndex: "promedio_bs", width: 140 },
        { title: "Prom. sin 0 (Bs.)", dataIndex: "promedio_sin_ceros_bs", width: 160 }
    ],
    costoEntregaPromedioPorSucursal: [
        { title: "Sucursal", dataIndex: "sucursal" },
        { title: "Costos operativos (Bs.)", dataIndex: "costos_operativos_bs", width: 170 },
        { title: "Entregas", dataIndex: "entregas", width: 100 },
        { title: "Costo/Entrega (Bs.)", dataIndex: "costo_entrega_promedio_bs", width: 160 }
    ],
    ticketPromedioPorSucursal: [
        { title: "Sucursal", dataIndex: "sucursal" },
        { title: "Ticket Prom. (Bs.)", dataIndex: "ticket_promedio_bs", width: 160 }
    ],
    ventasMensualPorSucursal: [
        { title: "Mes", dataIndex: "mes", width: 110 },
        { title: "Sucursal", dataIndex: "sucursal" },
        { title: "Ventas (ítems)", dataIndex: "ventas", width: 140 },
        { title: "Monto (Bs.)", dataIndex: "monto_bs", width: 140 }
    ],
    clientesActivosPorSucursal: [
        { title: "Sucursal", dataIndex: "sucursal" },
        { title: "Clientes activos", dataIndex: "clientes_activos", width: 160 }
    ],
    clientesPorHoraMensual: [
        { title: "Sucursal", dataIndex: "sucursal" },
        { title: "Hora", dataIndex: "hora", width: 80 },
        { title: "Atendidos", dataIndex: "clientes_atendidos", width: 120 }
    ]
};

const reportDefinitions = [
    { key: "topProductosPorSucursal", label: "Top Productos por Sucursal" },
    { key: "topGlobal", label: "Top Global" },
    { key: "deliveryPromedioPorSucursal", label: "Delivery Promedio" },
    { key: "costoEntregaPromedioPorSucursal", label: "Costo por Entrega Promedio" },
    { key: "ticketPromedioPorSucursal", label: "Ticket Promedio" },
    { key: "ventasMensualPorSucursal", label: "Ventas Mensual x Sucursal" },
    { key: "clientesActivosPorSucursal", label: "Clientes Activos" },
    { key: "clientesPorHoraMensual", label: "Clientes por Hora (Lâ€“S)" },
];

const { Title, Text } = Typography;

export default function ReportsLauncher() {
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm<ReportFormValues>();
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<any | null>(null);
    const [sucursales, setSucursales] = useState<{_id: string; nombre: string}[]>([]);
    const [loadingSucursales, setLoadingSucursales] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState<Record<string, string[]>>({});

    const reportesSeleccionadosRaw = Form.useWatch("reportes", form);
    const reportesSeleccionados = reportesSeleccionadosRaw || [];

    useEffect(() => {
        setLoadingSucursales(true);
        getAllSucursalsAPI()
            .then((r:any) => setSucursales(r?.data ?? [])) // según tu wrapper
            .catch(() => message.warning("No se pudo cargar la lista de sucursales"))
            .finally(() => setLoadingSucursales(false));
    }, []);

    useEffect(() => {
        // defaults del formulario
        form.setFieldsValue({
            meses: [],
            modoTop: "clientes",
            reportes: []
        });
    }, []);

    useEffect(() => {
        setSelectedColumns({});
    }, []);

    const sucOptions = useMemo(() =>
        sucursales.map(s => ({ value: s._id, label: s.nombre })), [sucursales]
    );
    const reportLabelByKey = useMemo(
        () => Object.fromEntries(reportDefinitions.map(r => [r.key, r.label])),
        []
    );

    const columnOptionsByKey = useMemo(() => {
        return Object.fromEntries(
            reportDefinitions.map((r) => [
                r.key,
                (columnsByKey[r.key] || []).map((c:any) => ({ value: c.dataIndex, label: c.title }))
            ])
        );
    }, []);

    const handlePreview = async () => {
        try {
            const vals = await form.validateFields();
            const meses = (vals.meses || []).map((m) => m.format("YYYY-MM"));
            if (!meses.length) return message.error("Selecciona al menos un mes");
            const reportes = vals.reportes || [];
            if (!reportes.length) return message.error("Selecciona al menos un reporte");
            setLoading(true);
            const data = await getOperacionMensualAPI({
                meses,
                sucursales: vals.sucursales,
                modoTop: vals.modoTop,
                reportes
            });
            setPreview(data);
        } catch (e:any) {
            console.error(e);
            message.error("No se pudo generar la vista previa");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        try {
            const vals = await form.validateFields();
            const meses = (vals.meses || []).map((m) => m.format("YYYY-MM"));
            if (!meses.length) return message.error("Selecciona al menos un mes");
            const reportes = vals.reportes || [];
            if (!reportes.length) return message.error("Selecciona al menos un reporte");
            const columnasFiltradas = Object.fromEntries(
                reportes.map((key) => [key, selectedColumns[key]])
            );
            downloadOperacionMensualXlsx({
                meses,
                sucursales: vals.sucursales,
                modoTop: vals.modoTop,
                reportes,
                columnas: columnasFiltradas
            });
        } catch (e:any) {
            console.error(e);
            message.error("No se pudo iniciar la descarga");
        }
    };

    const header = (
        <Space direction="vertical" className="w-full">
            <Title level={4} style={{ margin: 0 }}>
                Generador de Reportes
            </Title>
            <Text type="secondary">
                Elige uno o varios meses, sucursales, reportes y columnas. Puedes previsualizar o descargar en XLSX.
            </Text>
        </Space>
    );

    const getColumns = (key: string) => {
        const selected = selectedColumns[key];
        const base = columnsByKey[key] || [];
        if (!selected || !selected.length) return base;
        return base.filter((c:any) => selected.includes(c.dataIndex));
    };

    const tabItems = reportDefinitions
        .filter((r) => reportesSeleccionados.includes(r.key))
        .map((r) => ({
            key: r.key,
            label: r.label,
            children: (
                <Table
                    rowKey={(_, i) => String(i)}
                    size="small"
                    dataSource={preview?.[r.key] || []}
                    columns={getColumns(r.key)}
                    pagination={{ pageSize: 10 }}
                />
            )
        }));

    return (
        <>
            <Space>
                <Button
                    type="primary"
                    icon={<BarChartOutlined />}
                    onClick={() => setOpen(true)}
                >
                    Reportes
                </Button>
            </Space>

            <Modal
                open={open}
                onCancel={() => setOpen(false)}
                width={1000}
                title={header}
                footer={
                    <Space>
                        <Button icon={<EyeOutlined />} onClick={handlePreview} loading={loading}>
                            Vista previa
                        </Button>
                        <Button type="primary" icon={<FileExcelOutlined />} onClick={handleDownload}>
                            Descargar XLSX
                        </Button>
                    </Space>
                }
            >
                <Space direction="vertical" size="large" className="w-full">
                    <Form
                        layout="vertical"
                        form={form}
                        initialValues={{ modoTop: "clientes" }}
                    >
                        <Space size="large" wrap>
                            <Form.Item name="meses" label="Meses" rules={[{ required: true }]}>
                                <DatePicker picker="month" multiple format="YYYY-MM" />
                            </Form.Item>

                            <Form.Item name="sucursales" label="Sucursales (opcional)">
                                <Select
                                    mode="multiple"
                                    allowClear
                                    loading={loadingSucursales}
                                    options={sucOptions}
                                    placeholder="Selecciona una o más sucursales"
                                    style={{ minWidth: 360 }}
                                />
                            </Form.Item>

                            <Form.Item name="modoTop" label="Top 10 global" rules={[{ required: true }]}>
                                <Radio.Group>
                                    <Radio.Button value="clientes">Clientes</Radio.Button>
                                    <Radio.Button value="vendedores">Vendedores</Radio.Button>
                                </Radio.Group>
                            </Form.Item>

                            <Form.Item name="reportes" label="Reportes a incluir">
                                <Select
                                    mode="multiple"
                                    allowClear
                                    options={reportDefinitions.map((r) => ({ value: r.key, label: r.label }))}
                                    style={{ minWidth: 360 }}
                                />
                            </Form.Item>
                        </Space>
                    </Form>

                    <Alert
                        type="info"
                        showIcon
                        message="Consejo"
                        description="Usa Vista previa para validar datos antes de descargar el Excel."
                    />

                    {reportesSeleccionados.length > 0 && (
                        <Space direction="vertical" size="small" className="w-full">
                            <Text strong>Campos por reporte (opcional)</Text>
                            {reportesSeleccionados.map((key: string) => (
                                <div key={`cols-${key}`} className="w-full">
                                    <Text type="secondary">{`Campos: ${reportLabelByKey[key] || key}`}</Text>
                                    <Select
                                        mode="multiple"
                                        allowClear
                                        options={columnOptionsByKey[key] || []}
                                        value={selectedColumns[key]}
                                        onChange={(vals) =>
                                            setSelectedColumns((prev) => ({ ...prev, [key]: vals }))
                                        }
                                    />
                                </div>
                            ))}
                        </Space>
                    )}

                    <Divider style={{ margin: "8px 0" }} />

                    <Spin spinning={loading}>
                        {preview ? (
                            <Tabs
                                defaultActiveKey={tabItems[0]?.key}
                                items={tabItems}
                            />
                        ) : (
                            <Alert type="warning" showIcon message="Sin datos aún" description="Genera una vista previa para ver resultados aquí." />
                        )}
                    </Spin>
                </Space>
            </Modal>
        </>
    );
}


