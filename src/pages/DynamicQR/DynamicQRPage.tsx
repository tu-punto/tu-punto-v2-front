import { CopyOutlined, DownloadOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";
import { createDynamicQRAPI, downloadDynamicQRAPI, getDynamicQRsAPI, updateDynamicQRAPI } from "../../api/dynamicQR";

type QRRow = { id: string; code: string; name: string; destinationUrl: string; publicUrl: string; active: boolean; createdAt: string };
type QRForm = { name: string; destinationUrl: string; active: boolean };

const DynamicQRPage = () => {
  const [form] = Form.useForm<QRForm>();
  const [messageApi, contextHolder] = message.useMessage();
  const [rows, setRows] = useState<QRRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QRRow | null>(null);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | undefined>("true");

  const load = async () => {
    setLoading(true);
    const response = await getDynamicQRsAPI({ q: query || undefined, active: activeFilter === undefined ? undefined : activeFilter === "true", limit: 100 });
    setRows(response.rows || []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [activeFilter]);

  const openCreate = () => { setEditing(null); form.setFieldsValue({ name: "", destinationUrl: "", active: true }); setOpen(true); };
  const openEdit = (row: QRRow) => { setEditing(row); form.setFieldsValue(row); setOpen(true); };
  const save = async () => {
    const values = await form.validateFields();
    const result = editing ? await updateDynamicQRAPI(editing.id, values) : await createDynamicQRAPI(values);
    if (!result.success) return messageApi.error(result.message || "No se pudo guardar el QR");
    messageApi.success(editing ? "QR actualizado" : "QR creado"); setOpen(false); void load();
  };
  const changeState = async (row: QRRow, active: boolean) => {
    const result = await updateDynamicQRAPI(row.id, { active });
    if (!result.success) return messageApi.error(result.message || "No se pudo cambiar el estado");
    messageApi.success(active ? "QR activado" : "QR desactivado"); void load();
  };
  const copy = async (value: string) => { await navigator.clipboard.writeText(value); messageApi.success("Enlace copiado"); };
  const download = async (row: QRRow) => {
    try { const blob = await downloadDynamicQRAPI(row.code); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `tu-punto-qr-${row.code}.png`; anchor.click(); URL.revokeObjectURL(url); }
    catch { messageApi.error("No se pudo descargar el QR"); }
  };
  const columns: ColumnsType<QRRow> = [
    { title: "QR", key: "qr", render: (_, row) => <Space direction="vertical" size={0}><Typography.Text strong>{row.name}</Typography.Text><Typography.Text type="secondary" copyable={{ text: row.publicUrl }}>{row.code}</Typography.Text></Space> },
    { title: "Destino actual", dataIndex: "destinationUrl", ellipsis: true, render: (value) => <Typography.Link href={value} target="_blank">{value}</Typography.Link> },
    { title: "Estado", key: "active", render: (_, row) => <Tag color={row.active ? "success" : "default"}>{row.active ? "Activo" : "Inactivo"}</Tag> },
    { title: "Creado", dataIndex: "createdAt", render: (value) => new Date(value).toLocaleDateString("es-BO") },
    { title: "Acciones", key: "actions", render: (_, row) => <Space wrap><Button icon={<CopyOutlined />} onClick={() => void copy(row.publicUrl)}>Copiar</Button><Button icon={<DownloadOutlined />} onClick={() => void download(row)}>PNG</Button><Button icon={<EditOutlined />} onClick={() => openEdit(row)} /><Popconfirm title={row.active ? "Desactivar este QR?" : "Activar este QR?"} onConfirm={() => void changeState(row, !row.active)}><Button>{row.active ? "Desactivar" : "Activar"}</Button></Popconfirm></Space> },
  ];
  return <div style={{ padding: 16 }}>{contextHolder}<Card style={{ borderRadius: 24, background: "linear-gradient(135deg, #eff6ff, #fff)" }}><Typography.Title level={2} style={{ margin: 0 }}>QR promocionales</Typography.Title><Typography.Paragraph type="secondary">Imprime una vez y cambia el destino cuando necesites. Cada QR usa una URL publica fija de Tu Punto.</Typography.Paragraph><Space wrap><Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Nuevo QR</Button><Button icon={<ReloadOutlined />} onClick={() => void load()}>Recargar</Button></Space></Card><Card style={{ marginTop: 16, borderRadius: 24 }}><Space wrap style={{ marginBottom: 16 }}><Input.Search placeholder="Buscar por nombre o codigo" onSearch={(value) => { setQuery(value); void load(); }} allowClear style={{ width: 280 }} /><Select value={activeFilter} onChange={setActiveFilter} options={[{ value: "true", label: "Activos" }, { value: "false", label: "Inactivos" }, { value: undefined, label: "Todos" }]} style={{ width: 130 }} /></Space><Table rowKey="id" loading={loading} columns={columns} dataSource={rows} pagination={{ pageSize: 20 }} /></Card><Modal open={open} title={editing ? "Editar QR" : "Nuevo QR promocional"} okText={editing ? "Guardar cambios" : "Crear QR"} onOk={() => void save()} onCancel={() => setOpen(false)}><Form form={form} layout="vertical"><Form.Item name="name" label="Nombre interno" rules={[{ required: true, message: "Escribe un nombre" }]}><Input maxLength={120} placeholder="Ej. Promocion feria octubre" /></Form.Item><Form.Item name="destinationUrl" label="Destino" extra="Pega una URL HTTPS o una ruta interna como /catalog." rules={[{ required: true, message: "Indica un destino" }]}><Input placeholder="https://... o /catalog" /></Form.Item><Form.Item name="active" label="Activo" valuePropName="checked"><Switch /></Form.Item></Form></Modal></div>;
};

export default DynamicQRPage;
