// src/components/ReportsLauncher.tsx
import { useEffect, useMemo, useState } from "react";
import {
    Button, Modal, Form, DatePicker, Select, Radio, Space, Tabs, Table, Typography, Divider, message, Alert, Spin
} from "antd";
import { FileExcelOutlined, BarChartOutlined, EyeOutlined, DownloadOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { getOperacionMensualAPI, downloadOperacionMensualXlsx } from "../api/reports";
import { getAllSucursalsAPI } from "../api/sucursal";
type ReportFormValues = {
    mes: Dayjs;
    sucursales?: string[];
    modoTop: "clientes" | "vendedores";
};

const columnsByKey: Record<string, any[]> = {
    topProductosPorSucursal: [
        { title: "Sucursal", dataIndex: "sucursal" },
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
    ticketPromedioPorSucursal: [
        { title: "Sucursal", dataIndex: "sucursal" },
        { title: "Pedidos", dataIndex: "pedidos", width: 100 },
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

const { Title, Text } = Typography;

export default function ReportsLauncher() {
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm<ReportFormValues>();
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<any | null>(null);
    const [sucursales, setSucursales] = useState<{_id: string; nombre: string}[]>([]);
    const [loadingSucursales, setLoadingSucursales] = useState(false);

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
            mes: dayjs().startOf("month"),
            modoTop: "clientes"
        });
    }, []);

    const sucOptions = useMemo(() =>
        sucursales.map(s => ({ value: s._id, label: s.nombre })), [sucursales]
    );

    const handlePreview = async () => {
        try {
            const vals = await form.validateFields();
            const mes = vals.mes?.format("YYYY-MM");
            if (!mes) return message.error("Selecciona el mes");
            setLoading(true);
            const data = await getOperacionMensualAPI({
                mes,
                sucursales: vals.sucursales,
                modoTop: vals.modoTop
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
            const mes = vals.mes?.format("YYYY-MM");
            if (!mes) return message.error("Selecciona el mes");
            downloadOperacionMensualXlsx({
                mes,
                sucursales: vals.sucursales,
                modoTop: vals.modoTop
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
                Elige el mes, las sucursales y el tipo de Top 10 (clientes o vendedores). Puedes previsualizar o descargar en XLSX.
            </Text>
        </Space>
    );

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
                            <Form.Item name="mes" label="Mes" rules={[{ required: true }]}>
                                <DatePicker picker="month" format="YYYY-MM" />
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
                        </Space>
                    </Form>

                    <Alert
                        type="info"
                        showIcon
                        message="Consejo"
                        description="Usa Vista previa para validar datos del mes antes de descargar el Excel con las 7 hojas."
                    />

                    <Divider style={{ margin: "8px 0" }} />

                    <Spin spinning={loading}>
                        {preview ? (
                            <Tabs
                                defaultActiveKey="topProductosPorSucursal"
                                items={[
                                    { key: "topProductosPorSucursal", label: "Top Productos por Sucursal",
                                        children: <Table rowKey={(_,i)=>String(i)} size="small" dataSource={preview.topProductosPorSucursal || []} columns={columnsByKey.topProductosPorSucursal} pagination={{ pageSize: 10 }} /> },
                                    { key: "topGlobal", label: "Top Global",
                                        children: <Table rowKey={(_,i)=>String(i)} size="small" dataSource={preview.topGlobal || []} columns={columnsByKey.topGlobal} pagination={{ pageSize: 10 }} /> },
                                    { key: "deliveryPromedioPorSucursal", label: "Delivery Promedio",
                                        children: <Table rowKey={(_,i)=>String(i)} size="small" dataSource={preview.deliveryPromedioPorSucursal || []} columns={columnsByKey.deliveryPromedioPorSucursal} pagination={{ pageSize: 10 }} /> },
                                    { key: "ticketPromedioPorSucursal", label: "Ticket Promedio",
                                        children: <Table rowKey={(_,i)=>String(i)} size="small" dataSource={preview.ticketPromedioPorSucursal || []} columns={columnsByKey.ticketPromedioPorSucursal} pagination={{ pageSize: 10 }} /> },
                                    { key: "ventasMensualPorSucursal", label: "Ventas Mensual x Sucursal",
                                        children: <Table rowKey={(_,i)=>String(i)} size="small" dataSource={preview.ventasMensualPorSucursal || []} columns={columnsByKey.ventasMensualPorSucursal} pagination={{ pageSize: 10 }} /> },
                                    { key: "clientesActivosPorSucursal", label: "Clientes Activos",
                                        children: <Table rowKey={(_,i)=>String(i)} size="small" dataSource={preview.clientesActivosPorSucursal || []} columns={columnsByKey.clientesActivosPorSucursal} pagination={{ pageSize: 10 }} /> },
                                    { key: "clientesPorHoraMensual", label: "Clientes por Hora (L–S)",
                                        children: <Table rowKey={(_,i)=>String(i)} size="small" dataSource={preview.clientesPorHoraMensual || []} columns={columnsByKey.clientesPorHoraMensual} pagination={{ pageSize: 12 }} /> }
                                ]}
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
