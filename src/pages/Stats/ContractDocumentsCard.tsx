import { Button, Card, Form, Input, Modal, Radio, Select, Space, Table, Tag, Upload, message } from "antd";
import { EditOutlined, LinkOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { activateContractDocumentAPI, createContractDocumentAPI, getContractDocumentsAPI } from "../../api/contractDocuments";

const managedTypes = [["contract_template", "Contrato Marco"], ["service_order_template", "Plantilla Orden de Servicio"], ["annex_4", "Anexo 4"], ["prohibited_products", "Productos prohibidos"]] as const;
const staticLinks = [
  { type: "policies", title: "Politicas Operativas", description: "Enlace compartido con vendedores y registrado en la Orden." },
  { type: "tariff", title: "Tarifario", description: "Enlace vigente de precios y condiciones comerciales." },
] as const;
const labels: Record<string, string> = Object.fromEntries([...managedTypes, ...staticLinks.map(({ type, title }) => [type, title])]);
const defaultVersion = () => `Actualizado ${new Date().toLocaleDateString("es-BO")}`;

export default function ContractDocumentsCard() {
  const [form] = Form.useForm(); const [linkForm] = Form.useForm();
  const [rows, setRows] = useState<any[]>([]); const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null); const [editingLink, setEditingLink] = useState<(typeof staticLinks)[number] | null>(null);
  const source = Form.useWatch("source", form) || "file";
  const currentLinks = useMemo(() => Object.fromEntries(staticLinks.map(({ type }) => [type, rows.find((row) => row.type === type && row.active)])), [rows]);
  const load = async () => { setLoading(true); try { setRows((await getContractDocumentsAPI())?.data || []); } catch { message.error("No se pudieron cargar los documentos contractuales"); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);

  const saveDocument = async (values: any) => {
    try {
      setSaving(true); const payload = new FormData();
      payload.append("type", values.type); payload.append("version", values.version); payload.append("name", labels[values.type] || values.type);
      if (values.source === "file") { if (!file) return message.warning("Selecciona un archivo"); payload.append("file", file); } else payload.append("url", values.url);
      await createContractDocumentAPI(payload); form.resetFields(); setFile(null); message.success("Nueva version publicada"); await load();
    } catch (error: any) { message.error(error?.response?.data?.message || "No se pudo publicar el documento"); } finally { setSaving(false); }
  };
  const openLinkEditor = (item: (typeof staticLinks)[number]) => { const current = currentLinks[item.type]; linkForm.setFieldsValue({ url: current?.url || "", version: current?.version || defaultVersion() }); setEditingLink(item); };
  const saveStaticLink = async () => {
    if (!editingLink) return;
    try {
      const values = await linkForm.validateFields(); setSaving(true); const payload = new FormData();
      payload.append("type", editingLink.type); payload.append("name", editingLink.title); payload.append("version", values.version); payload.append("url", values.url);
      await createContractDocumentAPI(payload); message.success(`${editingLink.title} actualizado`); setEditingLink(null); await load();
    } catch (error: any) { message.error(error?.response?.data?.message || "No se pudo guardar el enlace"); } finally { setSaving(false); }
  };

  return <Card className="service-announcement-card" title="Documentos contractuales" extra={<span className="text-xs text-slate-500">Historial automatico por version</span>}>
    <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="mb-3"><div className="text-sm font-semibold text-slate-800">Enlaces fijos para vendedores</div><p className="mb-0 text-xs text-slate-500">Configura una vez y edita solo cuando cambie el documento.</p></div><div className="grid gap-3 md:grid-cols-2">{staticLinks.map((item) => { const current = currentLinks[item.type]; return <Card key={item.type} size="small" className="border-slate-200" title={<Space><LinkOutlined className="text-orange-500" />{item.title}</Space>} extra={<Button type={current ? "default" : "primary"} size="small" icon={current ? <EditOutlined /> : <PlusOutlined />} onClick={() => openLinkEditor(item)}>{current ? "Editar" : "Agregar"}</Button>}><div className="text-xs text-slate-500">{item.description}</div>{current ? <div className="mt-2 flex items-center justify-between gap-2"><Tag color="green">{current.version}</Tag><a href={current.url} target="_blank" rel="noreferrer" className="truncate">Ver enlace</a></div> : <Tag className="mt-2" color="gold">Sin configurar</Tag>}</Card>; })}</div></div>
    <p className="mb-4 text-sm text-slate-600">Carga las plantillas y anexos. Las versiones anteriores se conservan como historial.</p>
    <Form form={form} layout="vertical" onFinish={saveDocument} initialValues={{ source: "file" }} className="grid gap-3 md:grid-cols-4 md:items-end"><Form.Item name="type" label="Documento" rules={[{ required: true }]}><Select options={managedTypes.map(([value, title]) => ({ value, label: title }))} /></Form.Item><Form.Item name="version" label="Version o fecha" rules={[{ required: true }]}><Input placeholder="Ej. v1.0 - 05/11/2026" /></Form.Item><Form.Item name="source" label="Origen"><Radio.Group options={[{ label: "Archivo", value: "file" }, { label: "Enlace", value: "link" }]} /></Form.Item>{source === "file" ? <Form.Item label="Archivo" required><Upload maxCount={1} beforeUpload={(next) => { setFile(next); return false; }} onRemove={() => setFile(null)}><Button icon={<UploadOutlined />}>Seleccionar</Button></Upload></Form.Item> : <Form.Item name="url" label="Enlace HTTPS" rules={[{ required: true, type: "url" }]}><Input placeholder="https://..." /></Form.Item>}<Form.Item><Button type="primary" htmlType="submit" loading={saving}>Publicar version</Button></Form.Item></Form>
    <Table className="mt-3" size="small" loading={loading} rowKey="_id" dataSource={rows} pagination={{ pageSize: 6 }} columns={[{ title: "Documento", dataIndex: "type", render: (value) => labels[value] || value }, { title: "Version", dataIndex: "version" }, { title: "Origen", dataIndex: "source" }, { title: "Estado", dataIndex: "active", render: (active) => <Tag color={active ? "green" : "default"}>{active ? "Vigente" : "Historico"}</Tag> }, { title: "", render: (_, row) => <>{row.url && <a className="mr-3" href={row.url} target="_blank" rel="noreferrer">Ver</a>}{!row.active && <Button type="link" onClick={async () => { await activateContractDocumentAPI(row._id); await load(); }}>Restaurar</Button>}</> }]} />
    <Modal open={Boolean(editingLink)} title={editingLink ? `Configurar ${editingLink.title}` : ""} okText="Guardar enlace" onCancel={() => setEditingLink(null)} onOk={saveStaticLink} confirmLoading={saving} destroyOnClose><p className="text-sm text-slate-500">Este enlace se mostrara al vendedor y se usara en nuevas Ordenes de Servicio.</p><Form form={linkForm} layout="vertical"><Form.Item name="url" label="Enlace HTTPS" rules={[{ required: true, type: "url", message: "Ingresa un enlace HTTPS valido" }]}><Input placeholder="https://..." /></Form.Item><Form.Item name="version" label="Version o fecha" rules={[{ required: true }]}><Input placeholder="Ej. v1.0 - noviembre 2026" /></Form.Item></Form></Modal>
  </Card>;
}
