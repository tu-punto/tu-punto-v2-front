import { Card, Empty, Spin, Statistic, Table, Tag, Typography } from "antd";
import { useContext, useEffect, useState } from "react";
import { UserContext } from "../../context/userContext";
import { getFarmerSummaryAPI } from "../../api/farmer";

const money = (value: unknown) => `Bs. ${Number(value || 0).toFixed(2)}`;
export default function FarmerProfilePage() {
  const { user }: any = useContext(UserContext); const [data, setData] = useState<any>(); const [loading, setLoading] = useState(true);
  useEffect(() => { const id = user?._id || user?.id; if (!id) return; getFarmerSummaryAPI(id).then(setData).catch(() => setData(null)).finally(() => setLoading(false)); }, [user]);
  if (loading) return <div className="grid min-h-[300px] place-items-center"><Spin size="large" /></div>;
  if (!data?.success) return <Empty description="No se pudo cargar tu perfil de granjero" />;
  const rows = data.data?.entregas || [];
  return <div className="space-y-4 p-4">
    <Card className="overflow-hidden border-0 shadow-lg" bodyStyle={{ padding: 0 }}>
      <div className="bg-slate-950 px-6 py-6 text-white"><Typography.Text className="text-white/70">MI PERFIL DE GRANJERO</Typography.Text><Typography.Title level={2} className="!mb-0 !mt-2 !text-white">Entregas y saldo pendiente</Typography.Title></div>
      <div className="grid gap-4 p-5 md:grid-cols-2"><Statistic title="Saldo pendiente por cobrar" value={Number(data.data?.saldo_pendiente || 0)} precision={2} prefix="Bs." valueStyle={{ color: "#0f766e", fontWeight: 700 }} /><div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Este saldo corresponde a tus entregas registradas: monto descontado menos monto para Tu Punto.</div></div>
    </Card>
    <Card title="Entregas registradas"><Table rowKey={(row) => String(row._id)} size="small" pagination={{ pageSize: 10 }} dataSource={rows} columns={[
      { title: "Fecha", dataIndex: "fecha_pedido", render: (v) => v ? new Date(v).toLocaleDateString("es-BO") : "-" },
      { title: "Estado", dataIndex: "estado_pedido", render: (v) => <Tag>{v || "-"}</Tag> },
      { title: "Cantidad", dataIndex: "cantidad" }, { title: "Precio", dataIndex: "precio_unitario", render: money },
      { title: "Tu saldo", dataIndex: "saldo_granjero", render: money }, { title: "Pago", dataIndex: "pagado_a_granjero", render: (v) => <Tag color={v ? "success" : "warning"}>{v ? "Pagado" : "Pendiente"}</Tag> },
    ]} /></Card>
  </div>;
}
