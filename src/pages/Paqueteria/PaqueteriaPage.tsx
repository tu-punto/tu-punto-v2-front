import { Button, Card, Form, Input, Modal, Select, Table, Tag, message } from "antd";
import { useEffect, useState } from "react";
import { annulCourierOrderAPI, createCourierOrderAPI, getCourierOrdersAPI, getMyCourierAPI } from "../../api/paqueteriaPortal";

export default function PaqueteriaPage() {
  const [company, setCompany] = useState<any>(null); const [rows, setRows] = useState<any[]>([]); const [open, setOpen] = useState(false); const [loading, setLoading] = useState(false); const [form] = Form.useForm();
  const load = async () => { try { const [c, o] = await Promise.all([getMyCourierAPI(), getCourierOrdersAPI()]); setCompany(c.data); setRows(o.data || []); } catch { message.error("No se pudieron cargar los paquetes"); } };
  useEffect(() => { void load(); }, []);
  const create = async (values: any) => { setLoading(true); try { await createCourierOrderAPI(values); message.success("Paquete registrado"); setOpen(false); form.resetFields(); await load(); } catch (e: any) { message.error(e?.response?.data?.msg || "No se pudo registrar"); } finally { setLoading(false); } };
  const annul = async (row: any) => { try { await annulCourierOrderAPI(row._id); message.success("Pedido anulado"); await load(); } catch (e: any) { message.error(e?.response?.data?.msg || "No se pudo anular"); } };
  const primary = company?.color_primario || "#1677ff";
  return <div className="p-4 space-y-4" style={{ "--courier-primary": primary } as any}>
    <Card bordered={false} style={{ borderTop: `4px solid ${primary}` }} title={company?.nombre || "Paquetería"} extra={<Button type="primary" onClick={() => setOpen(true)}>Crear paquete</Button>}>
      <div>Tarifa por paquete: Bs. {Number(company?.tarifa_fija || 0).toFixed(2)} · Multa: Bs. {Number(company?.monto_multa || 0).toFixed(2)} cada {company?.multa_cada_dias || 0} días</div>
    </Card>
    <Card title="Historial de paquetes"><Table rowKey="_id" dataSource={rows} pagination={{ pageSize: 12 }} columns={[
      { title: "Guía", dataIndex: "numero_guia" }, { title: "Comprador", dataIndex: "comprador" }, { title: "Descripción", dataIndex: "descripcion_paquete" },
      { title: "Estado", dataIndex: "estado_pedido", render: (v) => <Tag>{v}</Tag> }, { title: "Total", render: (_, r) => `Bs. ${Number(r.total_a_cobrar || 0).toFixed(2)}` },
      { title: "", render: (_, r) => r.estado_pedido === "En Espera" && !r.anulado ? <Button danger size="small" onClick={() => void annul(r)}>Anular</Button> : null }
    ]} /></Card>
    <Modal open={open} title="Crear paquete" footer={null} onCancel={() => setOpen(false)} destroyOnClose><Form form={form} layout="vertical" onFinish={create} initialValues={{ esta_pagado: "no" }}>
      <Form.Item name="comprador" label="Comprador"><Input /></Form.Item><Form.Item name="telefono_comprador" label="Celular"><Input /></Form.Item>
      <Form.Item name="descripcion_paquete" label="Descripción" rules={[{ required: true }]}><Input.TextArea /></Form.Item>
      <Form.Item name="esta_pagado" label="Quién paga" rules={[{ required: true }]}><Select options={[{ value: "no", label: "Comprador" }, { value: "si", label: "Paquetería" }, { value: "mixto", label: "Ambos" }]} /></Form.Item>
      <Button htmlType="submit" type="primary" loading={loading}>Guardar</Button></Form></Modal>
  </div>;
}
