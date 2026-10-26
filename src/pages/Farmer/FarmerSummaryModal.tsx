import { Button, Descriptions, Modal, Popconfirm, Statistic, Table, Tag, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { getFarmerSummaryAPI, settleFarmerBalanceAPI } from "../../api/farmer";

const money = (value: unknown) => `Bs. ${Number(value || 0).toFixed(2)}`;
export default function FarmerSummaryModal({ farmer, open, onClose }: { farmer?: any; open: boolean; onClose: () => void }) {
  const [data, setData] = useState<any>(); const [loading, setLoading] = useState(false); const [settling, setSettling] = useState(false);
  const load = useCallback(async () => { if (!farmer?._id) return; setLoading(true); try { setData(await getFarmerSummaryAPI(farmer._id)); } catch { message.error("No se pudo cargar el resumen del granjero"); } finally { setLoading(false); } }, [farmer?._id]);
  useEffect(() => { if (open) void load(); }, [open, load]);
  const settle = async () => { try { setSettling(true); await settleFarmerBalanceAPI(farmer._id); message.success("Pago registrado en pagos pendientes"); await load(); } catch (error: any) { message.error(error?.response?.data?.msg || "No se pudo registrar el pago"); } finally { setSettling(false); } };
  const body = data?.data;
  return <Modal open={open} onCancel={onClose} footer={<Button onClick={onClose}>Cerrar</Button>} width={1000} title="Perfil y pagos del granjero">
    <Descriptions size="small" column={2} bordered className="mb-4"><Descriptions.Item label="Email">{farmer?.email}</Descriptions.Item><Descriptions.Item label="Sucursal">{farmer?.sucursal?.nombre || "-"}</Descriptions.Item></Descriptions>
    <div className="mb-4 flex items-center justify-between rounded-lg bg-slate-50 p-4"><Statistic title="Pago pendiente" value={Number(body?.pago_pendiente || 0)} precision={2} prefix="Bs." /><Popconfirm title="¿Registrar el pago de todas las entregas pendientes?" description="Las entregas incluidas quedarán liquidadas y se conservará el historial." onConfirm={settle} okText="Registrar pago" cancelText="Cancelar"><Button type="primary" disabled={!Number(body?.pago_pendiente || 0)} loading={settling}>Marcar como pagado</Button></Popconfirm></div>
    <Table loading={loading} size="small" rowKey={(row) => String(row._id)} pagination={{ pageSize: 7 }} dataSource={body?.entregas || []} columns={[
      { title: "Fecha", dataIndex: "fecha_pedido", render: (v) => v ? new Date(v).toLocaleDateString("es-BO") : "-" }, { title: "Estado", dataIndex: "estado_pedido", render: (v) => <Tag>{v || "-"}</Tag> },
      { title: "Saldo", dataIndex: "saldo_granjero", render: (v, row) => String(row?.estado_pedido || "").toLowerCase() === "entregado" ? money(v) : "Disponible al entregar" },
      { title: "Pago", dataIndex: "pagado_a_granjero", render: (v, row) => String(row?.estado_pedido || "").toLowerCase() !== "entregado" ? <Tag>En espera de entrega</Tag> : <Tag color={v ? "success" : "warning"}>{v ? "Pagado" : "Pendiente"}</Tag> }
    ]} />
  </Modal>;
}
