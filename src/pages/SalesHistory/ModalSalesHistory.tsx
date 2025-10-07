import { useEffect, useState, useMemo } from 'react';
import { Modal, Button, message, Table, Form, Tag, InputNumber, Radio, Card, Row, Col, Input } from 'antd';
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
  const [loading, setLoading] = useState(false);
  const [deletedProducts, setDeletedProducts] = useState<string[]>([]);
  const [tipoPago, setTipoPago] = useState<string | null>(null);
  const [qrInput, setQrInput] = useState<number>(0);
  const [efectivoInput, setEfectivoInput] = useState<number>(0);
  const [showWarning, setShowWarning] = useState(false);
  const [estaPagado, setEstaPagado] = useState<string | null>(null);
  const [adelantoVisible, setAdelantoVisible] = useState(false);
  const [adelantoCliente, setAdelantoCliente] = useState<number>(0);

  const enrichedProducts = useMemo(() => {
    const sucursalId = localStorage.getItem("sucursalId");
    if (!data) return [];

    return data.flatMap((p: any) => {
      const sucursal = p.sucursales?.find((s: any) => String(s.id_sucursal) === String(sucursalId));
      if (!sucursal) return [];

      return sucursal.combinaciones.map((combo: any, index: number) => {
        const varianteNombre = Object.values(combo.variantes || {}).join(" / ");
        return {
          ...p,
          key: `${p._id}-${index}`,
          producto: `${p.nombre_producto} - ${varianteNombre}`,
          nombre_variante: `${p.nombre_producto} - ${varianteNombre}`,
          precio: combo.precio,
          stockActual: combo.stock,
          variantes: combo.variantes,
          sucursalId,
        };
      });
    });
  }, [data]);

  const normalizarTipoPago = (valor: string): string | null => {
    const mapping: Record<string, string> = {
      'transferencia o qr': '1',
      'efectivo': '2',
      'pagado al dueño': '3',
      'efectivo + qr': '4',
      '1': '1',
      '2': '2',
      '3': '3',
      '4': '4',
    };

    const clave = valor.trim().toLowerCase();
    return mapping[clave] || null;
  };

  const montoTotal = products.reduce(
    (acc, item) => acc + (item.precio_unitario || 0) * (item.cantidad || 0),
    0
  );

  const saldoACobrar = useMemo(() => {
    if (estaPagado === 'si') return 0;
    return parseFloat((montoTotal - adelantoCliente).toFixed(2));
  }, [montoTotal, adelantoCliente, estaPagado]);

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
    setOriginalProducts(JSON.parse(JSON.stringify(ventasNormales)));

    // Inicializar estado de pago
    const pagoEstado = shipping.esta_pagado || (shipping.adelanto_cliente ? "adelanto" : "no");
    setEstaPagado(pagoEstado);
    setAdelantoVisible(pagoEstado === "adelanto");
    setAdelantoCliente(shipping.adelanto_cliente || 0);

    // Inicializar tipo de pago
    if (shipping?.tipo_de_pago) {
      const tipoPagoId = normalizarTipoPago(shipping.tipo_de_pago);
      setTipoPago(tipoPagoId);
    }
  }, [visible, shipping]);

  useEffect(() => {
    const monto = saldoACobrar || 0;
    const suma = (qrInput || 0) + (efectivoInput || 0);
    if (tipoPago === '4') {
      setShowWarning(suma !== monto);
    } else {
      setShowWarning(false);
    }
  }, [qrInput, efectivoInput, tipoPago, saldoACobrar]);

  useEffect(() => {
    if (tipoPago === '1') {
      setQrInput(saldoACobrar);
      setEfectivoInput(0);
    } else if (tipoPago === '2' || tipoPago === '3') {
      setQrInput(0);
      setEfectivoInput(saldoACobrar);
    } else if (tipoPago === '4') {
      const mitad = parseFloat((saldoACobrar / 2).toFixed(2));
      setQrInput(mitad);
      setEfectivoInput(saldoACobrar - mitad);
    }
  }, [tipoPago, saldoACobrar]);

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
      // Preparar datos para actualizar
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
        })),
        tipo_de_pago: tipoPago,
        esta_pagado: estaPagado,
        adelanto_cliente: ['si', 'no'].includes(estaPagado) ? 0 : adelantoCliente,
        subtotal_qr: tipoPago === '1' || tipoPago === '4' ? qrInput : 0,
        subtotal_efectivo: tipoPago === '2' || tipoPago === '4' ? efectivoInput : 0,
      };

      const res = await updateShippingAPI(updateData, shipping._id);

      if (!res.success) {
        throw new Error("Error al actualizar el pedido");
      }

      // Actualizar el stock si hay cambios en productos
      const sucursalId = localStorage.getItem('sucursalId');
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

      {/* SECCIÓN DE TIPO DE PAGO - Similar a ShippingInfoModal */}
      {isAdmin && (
        <Card title="Detalles del Pago" bordered={false} style={{ marginTop: 16 }}>

          {adelantoVisible && (
            <Row gutter={16}>
              <Col span={24}>
                <div style={{ marginBottom: 16 }}>
                  <span style={{ display: 'block', marginBottom: 8 }}>Monto del adelanto</span>
                  <InputNumber
                    prefix="Bs."
                    min={0}
                    value={adelantoCliente}
                    onChange={(val) => setAdelantoCliente(val || 0)}
                    style={{ width: '100%' }}
                  />
                </div>
              </Col>
            </Row>
          )}

          {/* Saldo a cobrar */}
          <Row gutter={16}>
            <Col span={24}>
              <div style={{ marginBottom: 16 }}>
                <span style={{ display: 'block', marginBottom: 8 }}>Saldo a Cobrar</span>
                <Input
                  prefix="Bs."
                  readOnly
                  value={saldoACobrar.toFixed(2)}
                  style={{ width: '100%', backgroundColor: '#fffbe6', fontWeight: 'bold' }}
                />
              </div>
            </Col>
          </Row>

          {/* Tipo de pago */}
          <Row gutter={16}>
            <Col span={24}>
              <div style={{ marginBottom: 16 }}>
                <span style={{ display: 'block', marginBottom: 8 }}>Tipo de pago</span>
                <Radio.Group
                  value={tipoPago}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTipoPago(value);
                  }}
                  disabled={estaPagado === "si"}
                >
                  <Radio.Button value="1">Transferencia o QR</Radio.Button>
                  <Radio.Button value="2">Efectivo</Radio.Button>
                  <Radio.Button value="3">Pagado al dueño</Radio.Button>
                  <Radio.Button value="4">Efectivo + QR</Radio.Button>
                </Radio.Group>
              </div>
            </Col>
          </Row>

          {["1", "2"].includes(tipoPago || "") && (
            <Row gutter={16}>
              <Col span={24}>
                <div style={{ marginBottom: 16 }}>
                  <span style={{ display: 'block', marginBottom: 8 }}>
                    {tipoPago === "1" ? "Subtotal QR" : "Subtotal Efectivo"}
                  </span>
                  <InputNumber
                    prefix="Bs."
                    value={saldoACobrar}
                    readOnly
                    style={{ width: '100%', backgroundColor: '#fffbe6', fontWeight: 'bold' }}
                  />
                </div>
              </Col>
            </Row>
          )}

          {tipoPago === "4" && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ display: 'block', marginBottom: 8 }}>Subtotal QR</span>
                    <InputNumber
                      prefix="Bs."
                      min={0.01}
                      max={saldoACobrar - 0.01}
                      value={qrInput}
                      onChange={(val) => {
                        const qr = val ?? 0;
                        const efectivo = parseFloat((saldoACobrar - qr).toFixed(2));
                        setQrInput(qr);
                        setEfectivoInput(efectivo);
                      }}
                      style={{ width: '100%' }}
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ display: 'block', marginBottom: 8 }}>Subtotal Efectivo</span>
                    <InputNumber
                      prefix="Bs."
                      value={efectivoInput}
                      readOnly
                      style={{ width: '100%', backgroundColor: '#fffbe6', fontWeight: 'bold' }}
                    />
                  </div>
                </Col>
              </Row>
              {showWarning && (
                <Row gutter={16}>
                  <Col span={24}>
                    <div style={{ color: 'red', fontWeight: 'bold' }}>
                      La suma de QR + Efectivo debe ser igual al saldo a cobrar.
                    </div>
                  </Col>
                </Row>
              )}
            </>
          )}
        </Card>
      )}

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
        products={products as any[]}
        setProducts={setProducts}
        allProducts={enrichedProducts} // Ahora enrichedProducts está definido
        sellers={[]}
        isAdmin={isAdmin}
        shippingId={id_shipping}
        sucursalId={localStorage.getItem("sucursalId")}
        allowAddProducts={false} // NO permitir agregar productos en historial
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