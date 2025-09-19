import { useEffect, useState } from 'react';
import { Modal, Button, message, Table } from 'antd';
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import EditProductsModal from '../Shipping/EditProductsModal';
import useRawProducts from "../../hooks/useRawProducts.tsx";
import { deleteShippingAPI } from '../../api/shipping';
import { updateSubvariantStockAPI } from '../../api/product';
import dayjs from "dayjs";

const ModalSalesHistory = ({ visible, onClose, shipping, onSave, isAdmin }: any) => {
  const [products, setProducts] = useState<any[]>([]);
  const [originalProducts, setOriginalProducts] = useState<any[]>([]);
  const [editProductsModalVisible, setEditProductsModalVisible] = useState(false);
  const { rawProducts: data } = useRawProducts();
  const pedidoFecha = shipping?.fecha_pedido
    ? dayjs(shipping.fecha_pedido).add(4, "hour").format("DD/MM/YYYY")
    : "";
  const hoy = dayjs().add(4, "hour").format("DD/MM/YYYY");
  const esHoy = pedidoFecha === hoy;
  useEffect(() => {
    if (!visible || !shipping) return;
    const ventasNormales = (shipping.venta || []).map((p: any) => ({
      ...p,
      key: p._id || `${p.id_producto}-${Object.values(p.variantes || {}).join("-") || "default"}`,
      producto: p.nombre_variante || p.nombre_producto || p.producto || "Sin nombre"
    }));
    setProducts(ventasNormales);
  }, [visible, shipping]);

  // Función para comparar variantes
  const objetosIguales = (a: any, b: any) => {
    const aOrdenado = JSON.stringify(Object.fromEntries(Object.entries(a).sort()));
    const bOrdenado = JSON.stringify(Object.fromEntries(Object.entries(b).sort()));
    return aOrdenado === bOrdenado;
  };

  // Reconstruye el nombre de variante
  const construirNombreVariante = (nombreProducto: string, variantes: Record<string, string>) => {
    const valores = Object.values(variantes || {}).join(" / ");
    return `${nombreProducto} - ${valores}`;
  };

  // Restaurar stock de productos
  const restaurarStock = async (productos: any[]) => {
    const sucursalId = localStorage.getItem('sucursalId');
    if (!data || !Array.isArray(data) || data.length === 0) return;

    for (const prod of productos) {
      const id = prod.id_producto || prod.producto;
      const nombreVariante = prod.nombre_variante;
      if (!nombreVariante || !id) continue;

      const productoCompleto = data.find((p: any) =>
        String(p._id || p.id_producto) === String(id)
      );
      if (!productoCompleto?.sucursales?.length) continue;

      const sucursalData = productoCompleto.sucursales?.find((s: any) =>
        String(s.id_sucursal) === String(sucursalId)
      );
      if (!sucursalData?.combinaciones?.length) continue;

      let variantes = prod.variantes;
      const nombreBase = productoCompleto.nombre_producto;
      const target = nombreVariante?.normalize("NFD").toLowerCase();

      const combinacionExacta = sucursalData.combinaciones.find((c: any) => {
        const nombreCombinacion = construirNombreVariante(nombreBase, c.variantes).normalize("NFD").toLowerCase();
        return nombreCombinacion === target;
      });

      if (!combinacionExacta) continue;
      variantes = combinacionExacta.variantes;

      const combinacion = sucursalData.combinaciones.find((c: any) => objetosIguales(c.variantes, variantes));
      if (!combinacion) continue;

      const nuevoStock = (combinacion.stock || 0) + prod.cantidad;

      try {
        await updateSubvariantStockAPI({
          productId: id,
          sucursalId,
          variantes,
          stock: nuevoStock
        });
      } catch (err) {
        console.error("Error al restaurar stock:", err);
      }
    }
  };

  const id_shipping = shipping?._id || '';

  return (
    <Modal
      title="Detalles de Venta"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      closable={false}
    >
      {isAdmin && (
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
          <Button
            danger
            shape="circle"
            icon={<DeleteOutlined />}
            disabled={!esHoy || !shipping?.fecha_pedido}
            onClick={() => {
              Modal.confirm({
                title: "¿Desea eliminar esta entrega?",
                content: "Esta acción no se puede deshacer.",
                okText: "Sí, eliminar",
                okType: "danger",
                cancelText: "Cancelar",
                onOk: async () => {
                  try {
                    // Enriquecer productos para restaurar stock
                    const enrichedForRestock = products.map((p) => {
                      const productoCompleto = data.find(dp =>
                        dp._id === p.id_producto || dp.nombre_producto === p.producto?.split(" - ")[0]
                      );
                      if (!productoCompleto) return p;
                      const variantes = p.variantes && Object.keys(p.variantes).length > 0
                        ? p.variantes
                        : (() => {
                          const partes = p.producto.split(" - ");
                          const atributos = partes[1]?.split(" / ") || [];
                          const ejemploComb = productoCompleto?.sucursales?.[0]?.combinaciones?.[0];
                          const claves = Object.keys(ejemploComb?.variantes || {});
                          const reconstruidas: Record<string, string> = {};
                          claves.forEach((k, i) => {
                            reconstruidas[k] = atributos[i] || '';
                          });
                          return reconstruidas;
                        })();
                      return {
                        ...p,
                        id_producto: p.id_producto || productoCompleto._id,
                        variantes,
                      };
                    });
                    await restaurarStock(enrichedForRestock);

                    const response = await deleteShippingAPI(shipping._id);
                    if (response.success) {
                      message.success("Entrega eliminada correctamente");
                      onSave();
                      onClose();
                    } else {
                      message.error("No se pudo eliminar la entrega");
                    }
                  } catch (err) {
                    message.error("Error al eliminar la entrega");
                    console.error("❌ Error en eliminación:", err);
                  }
                }
              });
            }}
          />
        </div>
      )}
      {isAdmin && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <Button
            icon={<EditOutlined />}
            disabled={!esHoy || !shipping?.fecha_pedido}
            onClick={() => {
              setOriginalProducts(JSON.parse(JSON.stringify(products)));
              setEditProductsModalVisible(true);
            }}
            type="link"
          >
            Editar Productos
          </Button>
        </div>
      )}
      <Table
        dataSource={products}
        rowKey={(record) => record.key || record.id_producto || record._id}
        pagination={false}
        columns={[
          {
            title: "Producto",
            dataIndex: "nombre_variante",
            key: "nombre_variante",
          },
          {
            title: "Cantidad",
            dataIndex: "cantidad",
            key: "cantidad",
          },
          {
            title: "Precio Unitario",
            dataIndex: "precio_unitario",
            key: "precio_unitario",
            render: (value) => `Bs ${value}`,
          },
          {
            title: "Subtotal",
            key: "subtotal",
            render: (_, record) => `Bs ${record.cantidad * record.precio_unitario}`,
          },
        ]}
      />
      <EditProductsModal
        visible={editProductsModalVisible}
        onCancel={() => setEditProductsModalVisible(false)}
        products={products as any[]}
        setProducts={setProducts}
        allProducts={[]} // Si no usas enrichedProducts, déjalo vacío
        sellers={[]}     // Si no usas sellers, déjalo vacío
        isAdmin={isAdmin}
        shippingId={id_shipping}
        sucursalId={localStorage.getItem("sucursalId")}
        onSave={() => {
          setEditProductsModalVisible(false);
          message.success("Cambios guardados");
        }}
      />
    </Modal>
  );
};

export default ModalSalesHistory;