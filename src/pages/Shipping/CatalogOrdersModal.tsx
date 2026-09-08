import { Button, Modal, Spin, Table, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { getShippingDashboardListAPI, updateShippingAPI } from "../../api/shipping";
import { READY_FOR_PICKUP_STATUS } from "./shippingStatus";

type Props = {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
};

const pendingCatalogOrder = (order: any) =>
  order?.origen_pedido === "catalogo" && String(order?.estado_pedido || "").trim() === "En Espera";

const productSummary = (order: any) => {
  const products = Array.isArray(order?.productos_temporales) ? order.productos_temporales : [];
  if (!products.length) return "Sin productos";
  return products
    .map((product: any) => `${product?.cantidad || 1}× ${product?.producto || "Producto"}`)
    .join(", ");
};

const totalFor = (order: any) =>
  (Array.isArray(order?.productos_temporales) ? order.productos_temporales : []).reduce(
    (total: number, product: any) => total + Number(product?.cantidad || 1) * Number(product?.precio_unitario || 0),
    0,
  );

export default function CatalogOrdersModal({ open, onClose, onChanged }: Props) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getShippingDashboardListAPI({
        page: 1,
        limit: 100,
        tab: "todos",
        origin: "catalogo",
      });
      if (response?.success === false) throw new Error(response?.message || "No se pudieron cargar los pedidos");
      const rows = Array.isArray(response?.rows) ? response.rows : [];
      setOrders(rows.filter(pendingCatalogOrder));
    } catch (error: any) {
      message.error(error?.message || "No se pudieron cargar los pedidos de catálogo");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const markReady = (order: any) => {
    Modal.confirm({
      title: "Confirmar preparación",
      content: "El pedido quedará listo para recoger y el cliente será notificado en el catálogo.",
      okText: "Marcar listo para recoger",
      cancelText: "Cancelar",
      onOk: async () => {
        setUpdatingId(String(order._id));
        try {
          const result = await updateShippingAPI(
            {
              estado_pedido: READY_FOR_PICKUP_STATUS,
              public_tracking_ready_for_pickup_at: new Date().toISOString(),
            },
            String(order._id),
          );
          if (!result?.success) throw new Error(result?.msg || result?.message || "No se pudo actualizar el pedido");
          message.success("Pedido listo para recoger y notificado al catálogo");
          onChanged();
          await load();
        } catch (error: any) {
          message.error(error?.message || "No se pudo confirmar el pedido");
        } finally {
          setUpdatingId("");
        }
      },
    });
  };

  return (
    <Modal
      title="Pedidos creados desde catálogo"
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>Cerrar</Button>}
      width={1000}
    >
      <p className="mb-4 text-gray-600">
        Estos pedidos ya tienen stock reservado. Confírmalos únicamente cuando estén preparados.
      </p>
      {loading ? (
        <div className="flex justify-center py-10"><Spin /></div>
      ) : (
        <Table
          rowKey={(order) => String(order._id)}
          dataSource={orders}
          pagination={{ pageSize: 8, hideOnSinglePage: true }}
          scroll={{ x: 760 }}
          locale={{ emptyText: "No hay pedidos de catálogo pendientes de preparación" }}
          columns={[
            { title: "Cliente", dataIndex: "cliente", render: (value) => value || "Sin nombre" },
            { title: "Contacto", dataIndex: "telefono_cliente", render: (value) => value || "—" },
            { title: "Productos", render: (_, order) => <span className="max-w-72 block">{productSummary(order)}</span> },
            { title: "Total", align: "right", render: (_, order) => `Bs ${totalFor(order).toFixed(2)}` },
            {
              title: "Acción",
              render: (_, order) => (
                <Button
                  type="primary"
                  loading={updatingId === String(order._id)}
                  onClick={() => markReady(order)}
                >
                  Listo para recoger
                </Button>
              ),
            },
          ]}
        />
      )}
    </Modal>
  );
}
