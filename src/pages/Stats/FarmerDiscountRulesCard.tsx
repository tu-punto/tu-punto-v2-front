import { Button, Card, Form, InputNumber, Modal, Popconfirm, Table, message } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { createFarmerDiscountRuleAPI, deleteFarmerDiscountRuleAPI, getFarmerDiscountRulesAPI, updateFarmerDiscountRuleAPI } from "../../api/farmerDiscountRule";

const money = (value: unknown) => `Bs. ${Number(value || 0).toFixed(2)}`;
const RuleFields = () => <>
  <Form.Item name="limite_inferior" label="Límite inferior" rules={[{ required: true }]}><InputNumber min={0} prefix="Bs." className="w-full" /></Form.Item>
  <Form.Item name="limite_superior" label="Límite superior" rules={[{ required: true }]}><InputNumber min={0} prefix="Bs." className="w-full" /></Form.Item>
  <Form.Item name="monto_descontado" label="Monto descontado" rules={[{ required: true }]}><InputNumber min={0} prefix="Bs." className="w-full" /></Form.Item>
  <Form.Item name="monto_para_tu_punto" label="Monto para Tu Punto" rules={[{ required: true }]}><InputNumber min={0} prefix="Bs." className="w-full" /></Form.Item>
</>;
export default function FarmerDiscountRulesCard() {
  const [rows, setRows] = useState<any[]>([]); const [loading, setLoading] = useState(false); const [form] = Form.useForm(); const [editing, setEditing] = useState<any>(); const [editForm] = Form.useForm();
  const load = async () => { setLoading(true); try { const result = await getFarmerDiscountRulesAPI(); setRows(result?.data || []); } catch { message.error("No se pudieron cargar las reglas de granjero"); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const create = async (values: any) => { try { await createFarmerDiscountRuleAPI(values); message.success("Regla creada"); form.resetFields(); await load(); } catch (error: any) { message.error(error?.response?.data?.msg || "No se pudo crear la regla"); } };
  const remove = async (id: string) => { try { await deleteFarmerDiscountRuleAPI(id); message.success("Regla eliminada"); await load(); } catch { message.error("No se pudo eliminar la regla"); } };
  const saveEdit = async (values: any) => { try { await updateFarmerDiscountRuleAPI(editing._id, values); message.success("Regla actualizada"); setEditing(null); await load(); } catch (error: any) { message.error(error?.response?.data?.msg || "No se pudo actualizar la regla"); } };
  return <Card className="service-announcement-card" title="Reglas de descuento para granjeros" extra={<span className="text-xs text-slate-500">Aplicables a todas las sucursales</span>}>
    <p className="mb-4 text-sm text-slate-600">Define el descuento adicional por precio unitario. Los rangos no pueden cruzarse.</p>
    <Form form={form} layout="vertical" onFinish={create} className="grid gap-3 md:grid-cols-5 md:items-end"><RuleFields /><Form.Item><Button htmlType="submit" type="primary" icon={<PlusOutlined />}>Agregar</Button></Form.Item></Form>
    <Table loading={loading} rowKey="_id" size="small" pagination={false} dataSource={rows} className="mt-3" columns={[
      { title: "Precio desde", dataIndex: "limite_inferior", render: money }, { title: "Precio hasta", dataIndex: "limite_superior", render: money }, { title: "Monto descontado", dataIndex: "monto_descontado", render: money }, { title: "Para Tu Punto", dataIndex: "monto_para_tu_punto", render: money },
      { title: "", key: "actions", render: (_, row) => <><Button type="text" icon={<EditOutlined />} aria-label="Editar regla" onClick={() => { setEditing(row); editForm.setFieldsValue(row); }} /><Popconfirm title="¿Eliminar esta regla?" onConfirm={() => remove(row._id)}><Button danger type="text" icon={<DeleteOutlined />} aria-label="Eliminar regla" /></Popconfirm></> }
    ]} />
    <Modal open={Boolean(editing)} title="Editar regla de granjero" okText="Guardar" onCancel={() => setEditing(null)} onOk={() => editForm.submit()} destroyOnClose><Form form={editForm} layout="vertical" onFinish={saveEdit}><RuleFields /></Form></Modal>
  </Card>;
}
