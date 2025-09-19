import { useEffect, useState } from 'react';
import { Modal, Button, message, Table, Form, Tag, InputNumber } from 'antd';
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import EditProductsModal from '../Shipping/EditProductsModal';
import useRawProducts from "../../hooks/useRawProducts.tsx";
import { deleteShippingAPI, updateShippingAPI } from '../../api/shipping';
import { updateSubvariantStockAPI } from '../../api/product';
import dayjs from "dayjs";

const ModalSalesHistory = ({ visible, onClose, shipping, onSave, isAdmin }: any) => {
  const [products, setProducts] = useState<any[]>([]);
  const [originalProducts, setOriginalProducts] = useState<any[]>([]);
  const [editProductsModalVisible, setEditProductsModalVisible] = useState(false);
  const { rawProducts: data } = useRawProducts();
  const [internalForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [deletedProducts, setDeletedProducts] = useState<string[]>([]);

  const montoTotal = products.reduce(
    (acc, item) => acc + (item.precio_unitario || 0) * (item.cantidad || 0),
    0
  );
  const pedidoFecha = shipping?.fecha_pedido
    ? dayjs(shipping.fecha_pedido).add(4, "hour").format("DD/MM/YYYY")
    : "";
  const hoy = dayjs().add(4, "hour").format("DD/MM/YYYY");
  const esHoy = pedidoFecha === hoy;
  useEffect(() => {
    if (!visible || !shipping) return;
    const ventasNormales = (shipping.venta || []).map((p: any) => ({
      ...p,
      id_venta: p._id ?? null,
      key: p._id || `${p.id_producto}-${Object.values(p.variantes || {}).join("-") || "default"}`,
      producto: p.nombre_variante || p.nombre_producto || p.producto || "Sin nombre"
    }));
    setProducts(ventasNormales);
    setOriginalProducts(JSON.parse(JSON.stringify(ventasNormales))); // Backup profundo
  }, [visible, shipping]);

  // Función para comparar variantes
  const objetosIguales = (a: any, b: any) => {
    if (!a || !b) return false;
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
      if (prod.esTemporal) continue;

      const id = prod.id_producto || prod.producto;
      const nombreVariante = prod.nombre_variante;
      if (!nombreVariante || !id) continue;

      const productoCompleto = data.find((p: any) =>
        String(p._id || p.id_producto) === String(id)
      );
      if (!productoCompleto) continue;

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

  const handleDeleteProduct = (key: any) => {
    const toDelete = products.find((p: any) => p.key === key);
    if (toDelete?.id_venta) {
      setDeletedProducts((prevDels) => [...prevDels, toDelete.id_venta]);
    }
    setProducts((prev: any) => prev.filter((p: any) => p.key !== key));
  };

  const handleValueChange = (key: string, field: string, value: any) => {
    setProducts((prev: any[]) =>
      prev.map((p) => {
        if (p.key !== key) return p;
        return { ...p, [field]: value };
      })
    );
  };

  const handleCancelChanges = () => {
    setProducts(originalProducts);
    setDeletedProducts([]);
    onClose();
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Actualizar el pedido en el backend
      const updateData = {
        ...shipping,
        venta: products.map(p => ({
          _id: p.id_venta,
          id_producto: p.id_producto,
          cantidad: p.cantidad,
          precio_unitario: p.precio_unitario,
          utilidad: p.utilidad,
          nombre_variante: p.nombre_variante || p.producto,
          variantes: p.variantes
        }))
      };

      const res = await updateShippingAPI(updateData, shipping._id);

      if (!res.success) {
        throw new Error("Error al actualizar el pedido");
      }

      // 2. Actualizar el stock
      const sucursalId = localStorage.getItem('sucursalId');

      // Crear mapa de productos originales para comparación
      const originalMap = new Map();
      originalProducts.forEach(p => {
        originalMap.set(p.key, p);
      });

      // Procesar cambios en el stock
      for (const currentProduct of products) {
        const originalProduct = originalMap.get(currentProduct.key);

        if (!originalProduct) {
          // Producto nuevo - restar stock
          await updateProductStock(currentProduct, -currentProduct.cantidad, sucursalId);
        } else if (currentProduct.cantidad !== originalProduct.cantidad) {
          // Cantidad modificada - ajustar stock
          const diferencia = originalProduct.cantidad - currentProduct.cantidad;
          await updateProductStock(currentProduct, diferencia, sucursalId);
        }
      }

      // Procesar productos eliminados
      for (const deletedId of deletedProducts) {
        const deletedProduct = originalProducts.find(p => p.id_venta === deletedId);
        if (deletedProduct) {
          await updateProductStock(deletedProduct, deletedProduct.cantidad, sucursalId);
        }
      }

      message.success("Pedido y stock actualizados con éxito");
      onSave();
      onClose();
    } catch (error) {
      console.error("Error al guardar:", error);
      message.error("Ocurrió un error al guardar los cambios");
    } finally {
      setLoading(false);
    }
  };

  const updateProductStock = async (product: any, cantidadCambio: number, sucursalId: string) => {
    if (!product.id_producto || product.esTemporal) return;

    const productoCompleto = data.find((p: any) =>
      String(p._id || p.id_producto) === String(product.id_producto)
    );

    if (!productoCompleto) return;

    const sucursalData = productoCompleto.sucursales?.find((s: any) =>
      String(s.id_sucursal) === String(sucursalId)
    );

    if (!sucursalData?.combinaciones?.length) return;

    let variantes = product.variantes;
    const nombreBase = productoCompleto.nombre_producto;
    const target = (product.nombre_variante || product.producto)?.normalize("NFD").toLowerCase();

    // Encontrar la combinación exacta
    const combinacionExacta = sucursalData.combinaciones.find((c: any) => {
      const nombreCombinacion = construirNombreVariante(nombreBase, c.variantes).normalize("NFD").toLowerCase();
      return nombreCombinacion === target;
    });

    if (!combinacionExacta) return;

    variantes = combinacionExacta.variantes;
    const combinacion = sucursalData.combinaciones.find((c: any) =>
      objetosIguales(c.variantes, variantes)
    );

    if (!combinacion) return;

    const nuevoStock = (combinacion.stock || 0) + cantidadCambio;

    try {
      await updateSubvariantStockAPI({
        productId: product.id_producto,
        sucursalId,
        variantes,
        stock: nuevoStock
      });
    } catch (err) {
      console.error("Error al actualizar stock:", err);
      throw err;
    }
  };

  const EmptySalesTable = ({ products, monto = 0, handleValueChange, isAdmin }: any) => {
    if (products.length === 0) {
      return (
        <div style={{ textAlign: "center", padding: 32 }}>
          <p>No hay productos en esta venta.</p>
          <p>Monto total: <b>Bs {monto.toFixed(2)}</b></p>
        </div>
      );
    }

    return (
      <Table
        dataSource={products}
        pagination={false}
        rowKey="key"
        columns={[
          {
            title: "Producto",
            dataIndex: "nombre_variante",
            key: "nombre_variante",
            render: (text, record) => (
              <div>
                {text}
                {record.esTemporal && <Tag color="orange" style={{ marginLeft: 8 }}>Temporal</Tag>}
              </div>
            )
          },
          {
            title: "Cantidad",
            dataIndex: "cantidad",
            key: "cantidad",
            render: (value) => value
          },
          {
            title: "Precio Unitario",
            dataIndex: "precio_unitario",
            key: "precio_unitario",
            render: (value) => `Bs ${value}`
          },
          {
            title: "Subtotal",
            key: "subtotal",
            render: (_, record) => `Bs ${(record.cantidad * record.precio_unitario).toFixed(2)}`,
          }
        ]}
      />
    );
  };

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
            onClick={() => {
              setEditProductsModalVisible(true);
            }}
            type="link"
          >
            Editar Productos
          </Button>
        </div>
      )}

      <EmptySalesTable
        products={products}
        monto={montoTotal}
        onDeleteProduct={isAdmin ? handleDeleteProduct : undefined}
        handleValueChange={isAdmin ? handleValueChange : undefined}
        isAdmin={isAdmin}
      />

      {isAdmin && (
        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Button style={{ marginRight: 8 }} onClick={handleCancelChanges}>
            Cancelar
          </Button>
          <Button type="primary" loading={loading} onClick={handleSave}>
            Guardar Cambios
          </Button>
        </div>
      )}
      <EditProductsModal
        visible={editProductsModalVisible}
        onCancel={() => setEditProductsModalVisible(false)}
        products={products}
        setProducts={setProducts}
        allProducts={data ? data.flatMap((p: any) => {
          const sucursalId = localStorage.getItem("sucursalId");
          const sucursal = p.sucursales?.find((s: any) => String(s.id_sucursal) === String(sucursalId));
          if (!sucursal) return [];
          return sucursal.combinaciones.map((combo: any, index: number) => ({
            ...p,
            key: `${p._id}-${index}`,
            producto: `${p.nombre_producto} - ${Object.values(combo.variantes || {}).join(" / ")}`,
            nombre_variante: `${p.nombre_producto} - ${Object.values(combo.variantes || {}).join(" / ")}`,
            precio: combo.precio,
            stockActual: combo.stock,
            variantes: combo.variantes,
            sucursalId,
          }));
        }) : []}
        sellers={[]}
        isAdmin={isAdmin}
        shippingId={id_shipping}
        sucursalId={localStorage.getItem("sucursalId")}
        onSave={() => {
          setEditProductsModalVisible(false);
          message.success("Cambios guardados");
          onSave();
        }}
      />
    </Modal>
  );
};

export default ModalSalesHistory;