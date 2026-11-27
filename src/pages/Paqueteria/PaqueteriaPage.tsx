import { Button, Card, Form, Input, InputNumber, Modal, Select, Table, Tag, message } from "antd";
import { useEffect, useState } from "react";
import { annulCourierOrderAPI, createCourierOrderAPI, getCourierOrdersAPI, getCourierRoutesAPI, getMyCourierAPI, updateCourierOrderAPI } from "../../api/paqueteriaPortal";
import PaqueteriaExternaPortal from "./PaqueteriaExternaPortal";

export default function PaqueteriaPage() {
  const [company, setCompany] = useState<any>(null); const [rows, setRows] = useState<any[]>([]); const [routes, setRoutes] = useState<any[]>([]); const [open, setOpen] = useState(false); const [editing, setEditing] = useState<any>(null); const [loading, setLoading] = useState(false); const [form] = Form.useForm();
  const load = async () => { try { const c = await getMyCourierAPI(); setCompany(c.data); if (c.data?.tipo === "externa") return; const [o, r] = await Promise.all([getCourierOrdersAPI(), getCourierRoutesAPI()]); setRows(o.data || []); setRoutes(r.data || []); } catch { message.error("No se pudieron cargar los paquetes"); } };
  useEffect(() => { void load(); }, []);
  const save = async (values: any) => { setLoading(true); try { if (editing?._id) await updateCourierOrderAPI(editing._id, values); else await createCourierOrderAPI(values); message.success(editing ? "Paquete actualizado" : "Paquete registrado"); setOpen(false); setEditing(null); form.resetFields(); await load(); } catch (e: any) { message.error(e?.response?.data?.msg || "No se pudo guardar"); } finally { setLoading(false); } };
  const showCreate = () => { setEditing(null); form.resetFields(); form.setFieldsValue({ esta_pagado: "no" }); setOpen(true); };
  const showEdit = (row: any) => { setEditing(row); form.setFieldsValue(row); setOpen(true); };
  const annul = async (row: any) => { try { await annulCourierOrderAPI(row._id); message.success("Pedido anulado"); await load(); } catch (e: any) { message.error(e?.response?.data?.msg || "No se pudo anular"); } };
  const paymentMode = Form.useWatch("esta_pagado", form);
  const primary = company?.color_primario || "#1677ff";
  if (company?.tipo === "externa") return <PaqueteriaExternaPortal company={company} />;
  return <div className="p-4 space-y-4" style={{ "--courier-primary": primary } as any}>
    <Card bordered={false} style={{ borderTop: `4px solid ${primary}` }} title={<span className="flex items-center gap-3">{company?.logo_url ? <img src={company.logo_url} alt="" className="w-8 h-8 object-contain" /> : null}<span>{company?.nombre || "Paquetería"}</span></span>} extra={<Button type="primary" style={{ background: primary, borderColor: primary }} onClick={showCreate}>Crear paquete</Button>}>
      <div>Tarifa por paquete: Bs. {Number(company?.tarifa_fija || 0).toFixed(2)} · Multa: Bs. {Number(company?.monto_multa || 0).toFixed(2)} cada {company?.multa_cada_dias || 0} días</div>
    </Card>
    <Card title="Historial de paquetes"><Table rowKey="_id" dataSource={rows} pagination={{ pageSize: 12 }} columns={[
      { title: "Guía", dataIndex: "numero_guia" }, { title: "Comprador", dataIndex: "comprador" }, { title: "Descripción", dataIndex: "descripcion_paquete" },
      { title: "Estado", dataIndex: "estado_pedido", render: (v, r) => <Tag color={r.anulado ? "default" : undefined}>{r.anulado ? "Anulado" : v}</Tag> }, { title: "Total", render: (_, r) => `Bs. ${Number(r.total_a_cobrar || 0).toFixed(2)}` },
      { title: "", render: (_, r) => r.creado_por_paqueteria && ["En Espera", "PARA ENVIAR A OTRA SUCURSAL", "En camino"].includes(r.estado_pedido) && !r.anulado ? <span className="flex gap-2"><Button size="small" onClick={() => showEdit(r)}>Editar</Button><Button danger size="small" onClick={() => void annul(r)}>Anular</Button></span> : null }
    ]} /></Card>
    <Modal open={open} title={editing ? "Editar paquete" : "Crear paquete"} footer={null} onCancel={() => { setOpen(false); setEditing(null); }} destroyOnClose><Form form={form} layout="vertical" onFinish={save} initialValues={{ esta_pagado: "no" }}>
      {!editing && <Form.Item name="origen_sucursal_id" label="Sucursal de origen" rules={[{ required: true, message: "Selecciona una ruta habilitada" }]} extra={!routes.length ? "No hay rutas habilitadas. Contacta a Tu Punto para configurar una." : undefined}><Select placeholder="Selecciona una sucursal" options={routes.map((route: any) => ({ value: String(route.origen_sucursal._id), label: String(route.origen_sucursal.nombre) }))} /></Form.Item>}
      <Form.Item name="comprador" label="Comprador" dependencies={["telefono_comprador"]} rules={[{ validator: async (_, value) => { if (String(value || "").trim() || String(form.getFieldValue("telefono_comprador") || "").trim()) return; throw new Error("Ingresa comprador o celular"); } }]}><Input /></Form.Item><Form.Item name="telefono_comprador" label="Celular" dependencies={["comprador"]} rules={[{ validator: async (_, value) => { if (String(value || "").trim() || String(form.getFieldValue("comprador") || "").trim()) return; throw new Error("Ingresa comprador o celular"); } }]}><Input /></Form.Item>
      <Form.Item name="descripcion_paquete" label="Descripción" rules={[{ required: true }]}><Input.TextArea /></Form.Item>
      {!editing && <><Form.Item name="esta_pagado" label="Quién paga" rules={[{ required: true }]}><Select options={[{ value: "no", label: "Comprador" }, { value: "si", label: "Paquetería" }, { value: "mixto", label: "Ambos" }]} /></Form.Item>
      {paymentMode === "mixto" && <Form.Item name="monto_paga_vendedor" label="Aporta la paquetería (Bs.)" rules={[{ required: true }]}><InputNumber min={0.01} precision={2} style={{ width: "100%" }} /></Form.Item>}</>}
      <Button htmlType="submit" type="primary" style={{ background: primary, borderColor: primary }} loading={loading}>Guardar</Button></Form></Modal>
  </div>;
}
