import TempProductModal from './TempProductModal';
import { useEffect, useState, useMemo } from 'react';
import {
    Modal, Card, Button, Form, Input, DatePicker, Row, Col, TimePicker,
    Radio, Select, InputNumber, message
} from 'antd';
import dayjs from 'dayjs';
import {
    deleteProductsByShippingAPI,
    registerSalesAPI,
    updateProductsByShippingAPI
} from '../../api/sales';
import EmptySalesTable from '../Sales/EmptySalesTable';
import useProducts from '../../hooks/useProducts';
import useEditableTable from '../../hooks/useEditableTable';
import {
    addTemporaryProductsToShippingAPI, updateShippingAPI, deleteShippingAPI
} from '../../api/shipping';
import {UserOutlined, PhoneOutlined, CommentOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useWatch } from 'antd/es/form/Form';
import EditProductsModal from './EditProductsModal';
import { updateSubvariantStockAPI } from '../../api/product';
import useRawProducts from "../../hooks/useRawProducts.tsx";
import {getSellersAPI} from "../../api/seller.ts";

const ShippingInfoModal = ({ visible, onClose, shipping, onSave, sucursals = [], isAdmin }: any) => {
    const [internalForm] = Form.useForm();
    const [products, setProducts, handleValueChange] = useEditableTable([]);
    const [originalProducts, setOriginalProducts] = useState<any[]>([]);
    const [deletedProducts, setDeletedProducts] = useState<string[]>([]);
    const [tempModalVisible, setTempModalVisible] = useState(false);
    const [totalAmount, setTotalAmount] = useState(0);
    const [adelantoVisible, setAdelantoVisible] = useState(false);
    //const [quienPaga, setQuienPaga] = useState<string | null>(null);
    const [montoDelivery, setMontoDelivery] = useState(0);
    const [costoDelivery, setCostoDelivery] = useState(0);
    //const [adelantoClienteInput, setAdelantoClienteInput] = useState<number>(0);
    const quienPagaDelivery = useWatch("quien_paga_delivery", internalForm);
    const [isDeliveryPlaceInput, setIsDeliveryPlaceInput] = useState(false);
    const [estadoPedido, setEstadoPedido] = useState<string | null>(null);
    const [tipoPago, setTipoPago] = useState<string | null>(null);
    const [qrInput, setQrInput] = useState<number>(0);
    const [efectivoInput, setEfectivoInput] = useState<number>(0);
    const [showWarning, setShowWarning] = useState(false);
    const [loading, setLoading] = useState(false);
    const { rawProducts: data } = useRawProducts();    const [editProductsModalVisible, setEditProductsModalVisible] = useState(false);
    const adelantoCliente = useWatch('adelanto_cliente', internalForm);
    const [estaPagado, setEstaPagado] = useState<string | null>(null);
    const [confirmDeleteAdelanto, setConfirmDeleteAdelanto] = useState(false);
    const [sellers, setSellers] = useState([]);
    const [clickedOnce, setClickedOnce] = useState(false);
    const cargoDelivery = useWatch('cargo_delivery', internalForm);
    const estadoPedidoForm = useWatch("estado_pedido", internalForm);

    useEffect(() => {
        if (visible && shipping) {
            const pagoEstado = shipping.esta_pagado || (shipping.adelanto_cliente ? "adelanto" : "no");
            setEstaPagado(pagoEstado);
            setAdelantoVisible(pagoEstado === "adelanto");
        }
    }, [visible, shipping]);

    const objetosIguales = (a: any, b: any) => {
        const aOrdenado = JSON.stringify(Object.fromEntries(Object.entries(a).sort()));
        const bOrdenado = JSON.stringify(Object.fromEntries(Object.entries(b).sort()));
        return aOrdenado === bOrdenado;
    };
    const construirNombreVariante = (nombreProducto: string, variantes: Record<string, string>) => {
        const valores = Object.values(variantes || {}).join(" / ");
        return `${nombreProducto} - ${valores}`;
    };

    const lugarEntrega = useWatch('lugar_entrega', internalForm);
    // Extraer nombre del lugar de origen desde el shipping usando el ID
    const origenNombre = useMemo(() => {
        const origenId = typeof shipping?.lugar_origen === 'object'
            ? shipping.lugar_origen.$oid || shipping.lugar_origen._id
            : shipping?.lugar_origen;

        const sucursal = sucursals.find((s: any) => String(s._id) === String(origenId));
        const nombre = sucursal?.nombre?.trim().toLowerCase() ?? null;

        return nombre;
    }, [shipping, sucursals]);

    const origenEsIgualADestino = useMemo(() => {
        const entrega = lugarEntrega?.trim().toLowerCase();
        const origen = origenNombre?.trim().toLowerCase();

        if (!entrega || !origen) return false;
        return entrega === origen;
    }, [lugarEntrega, origenNombre]);


    const saldoACobrar = useMemo(() => {
        const deliveryAdicional = internalForm.getFieldValue("quien_paga_delivery") === "comprador"
            ? (cargoDelivery ?? 0)
            : 0;

        const adelanto = adelantoCliente || 0;
        return parseFloat((totalAmount - adelanto + deliveryAdicional).toFixed(2));
    }, [totalAmount, adelantoCliente, cargoDelivery, quienPagaDelivery]);

    const handleDeleteProduct = (key: any) => {
        setProducts((prev: any) => {
            const toDelete = prev.find((p: any) => p.key === key);
            if (toDelete?.id_venta) setDeletedProducts((prevDels) => [...prevDels, toDelete.id_venta]);
            return prev.filter((p: any) => p.key !== key);
        });
    };
    // useEffect para cargarlos si no lo estás haciendo ya
    useEffect(() => {
        const fetchSellers = async () => {
            const res = await getSellersAPI();
            const hoy = new Date().setHours(0, 0, 0, 0);

            const vigentes = res.filter((v: any) => {
                if (!v.fecha_vigencia) return true;
                const fecha = new Date(v.fecha_vigencia).getTime();
                return fecha >= hoy;
            });

            setSellers(vigentes);
        };

        fetchSellers();
    }, []);
    useEffect(() => {
        if ((adelantoCliente ?? 0) < 0) {
            message.warning("El adelanto no puede ser negativo.");
            internalForm.setFieldValue("adelanto_cliente", 0);
        }
    }, [adelantoCliente]);

    useEffect(() => {
        if (tipoPago === '3') {
            internalForm.setFieldValue("adelanto_cliente", 0);
        }
    }, [tipoPago]);

    useEffect(() => {
        if (estadoPedidoForm === "Entregado") {
            internalForm.setFieldsValue({
                fecha_pedido: dayjs(),
                hora_entrega_acordada: dayjs()
            });
        }
    }, [estadoPedidoForm]);
    const tipoPagoTextoAValor: Record<string, string> = {
        'Transferencia o QR': '1',
        'Efectivo': '2',
        'Pagado al dueño': '3',
        'Efectivo + QR': '4',
    };

    useEffect(() => {
        if (!visible || !shipping) return;

        internalForm.resetFields();

        const esOtroLugar = !sucursals.find(s => s.nombre === shipping.lugar_entrega);
        const lugar_entrega = esOtroLugar ? 'otro' : shipping.lugar_entrega;
        const lugar_entrega_input = esOtroLugar ? shipping.lugar_entrega : '';
        const quienPagaDeVenta =
            shipping?.venta?.[0]?.quien_paga_delivery ||
            shipping?.quien_paga_delivery ||
            "comprador";

        internalForm.setFieldsValue({
            cliente: shipping.cliente,
            telefono_cliente: shipping.telefono_cliente,
            lugar_entrega,
            lugar_entrega_input,
            fecha_pedido: shipping.fecha_pedido ? dayjs(shipping.fecha_pedido) : null,
            hora_entrega_acordada: shipping.hora_entrega_acordada ? dayjs(shipping.hora_entrega_acordada): null,
            observaciones: shipping.observaciones,
            estado_pedido: shipping.estado_pedido,
            quien_paga_delivery: quienPagaDeVenta,
            cargo_delivery: shipping.cargo_delivery,
            costo_delivery: shipping.costo_delivery,
            adelanto_cliente: shipping.adelanto_cliente,
            tipo_de_pago: shipping.tipo_de_pago || null,
            subtotal_qr: shipping.subtotal_qr || 0,
            subtotal_efectivo: shipping.subtotal_efectivo || 0,
            esta_pagado: shipping.esta_pagado || (shipping.adelanto_cliente ? "adelanto" : "no"),
        });
        const tipoPagoRaw = shipping.tipo_de_pago;
        const tipoPagoId = tipoPagoTextoAValor[tipoPagoRaw] || tipoPagoRaw || null;
        setTipoPago(tipoPagoId);
        setEstadoPedido(shipping.estado_pedido || "En Espera");
        setIsDeliveryPlaceInput(esOtroLugar);
        if (!origenEsIgualADestino && !quienPagaDeVenta) {
            internalForm.setFieldValue('quien_paga_delivery', 'comprador');
        }
        const ventasNormales = (shipping.venta || []).map((p: any) => ({
            ...p,
            id_venta: p._id ?? null,
            key: p._id || `${p.id_producto}-${Object.values(p.variantes || {}).join("-") || "default"}`,
            esTemporal: p?.producto?.esTemporal || false, // ✅ nuevo
            producto: p.nombre_variante || p.nombre_producto || p.producto || "Sin nombre"
        }));

        setProducts(ventasNormales);

    }, [visible, shipping, sucursals]);

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
        internalForm.setFieldsValue({ subtotal_qr: saldoACobrar });
        setQrInput(saldoACobrar);
        setEfectivoInput(0);
    } else if (tipoPago === '2' || tipoPago === '3') {
        internalForm.setFieldsValue({ subtotal_efectivo: saldoACobrar });
        setQrInput(0);
        setEfectivoInput(saldoACobrar);
    } else if (tipoPago === '4') {
        const mitad = parseFloat((saldoACobrar / 2).toFixed(2));
        internalForm.setFieldsValue({
            subtotal_qr: mitad,
            subtotal_efectivo: saldoACobrar - mitad
        });
        setQrInput(mitad);
        setEfectivoInput(saldoACobrar - mitad);
    }
}, [tipoPago, saldoACobrar, internalForm]);
useEffect(() => {
    const recalculated = products.reduce((acc: number, p: any) => {
        return acc + (p.precio_unitario * p.cantidad);
    }, 0);
    setTotalAmount(parseFloat(recalculated.toFixed(2)));
}, [products]);
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

const restaurarStock = async (productos: any[]) => {
    const sucursalId = localStorage.getItem('sucursalId');
    if (!data || !Array.isArray(data) || data.length === 0) {
        console.warn("⚠️ data aún no está cargado o está vacío");
        return;
    }

    //console.log(" Raw data:", data);

    for (const prod of productos) {
        if (prod.esTemporal) continue;

        const id = prod.id_producto || prod.producto;
        const nombreVariante = prod.nombre_variante;
        if (!nombreVariante || !id) continue;


        const productoCompleto = data.find((p: any) =>
            String(p._id || p.id_producto) === String(id)
        );
        if (!productoCompleto) {
            console.warn("⚠️ Producto no encontrado en data:", id);
            continue;
        }
        if (!productoCompleto?.sucursales?.length) {
            console.warn("⚠️ Producto sin sucursales:", id);
            continue;
        }
        //console.log(" Raw data ver sucursales:", data);
        const sucursalData = productoCompleto.sucursales?.find((s: any) =>
            String(s.id_sucursal) === String(sucursalId)
        );
        if (!sucursalData?.combinaciones?.length) {
            console.warn("⚠️ Sin combinaciones en sucursal:", sucursalId);
            continue;
        }

        // Reconstruir variantes desde nombre_variante si no existen
        let variantes = prod.variantes;

// Siempre reconstruimos las variantes desde el nombre_variante (más seguro)
        const nombreBase = productoCompleto.nombre_producto;
        const target = nombreVariante?.normalize("NFD").toLowerCase();

        const combinacionExacta = sucursalData.combinaciones.find((c: any) => {
            const nombreCombinacion = construirNombreVariante(nombreBase, c.variantes).normalize("NFD").toLowerCase();
            return nombreCombinacion === target;
        });

        if (!combinacionExacta) {
            console.warn("❌ No se encontró combinación por nombre exacto:", nombreVariante);
            continue;
        }

        variantes = combinacionExacta.variantes;

        const combinacion = sucursalData.combinaciones.find((c: any) => {
            return objetosIguales(c.variantes, variantes);
        });
        if (!combinacion) {
            console.warn("❌ No se encontró combinación exacta para:", variantes);
            continue;
        }

        const nuevoStock = (combinacion.stock || 0) + prod.cantidad;

        try {
            const res = await updateSubvariantStockAPI({
                productId: id,
                sucursalId,
                variantes,
                stock: nuevoStock
            });

            if (!res.success) {
                message.error(`No se pudo restaurar stock de ${nombreVariante}`);
            } else {
                //console.log("✅ Stock restaurado:", nombreVariante, "→", nuevoStock);
            }
        } catch (err) {
            console.error("Error al restaurar stock:", err);
        }
    }
};
const handleCancelChanges = () => {
    internalForm.resetFields();
    setProducts(originalProducts);
    onClose();
};
const handleSave = async (values: any) => {
    setLoading(true);
    const newProducts = products.filter((p: any) => !p.id_venta);
    const existingProducts = products.filter((p: any) => p.id_venta);
    const sucursalId = localStorage.getItem('sucursalId');

    const formattedNewProducts = newProducts
        .filter((p: any) => p.id_producto?.length === 24) // ✅ incluye temporales ya registrados
        .map((p: any) => ({
            cantidad: p.cantidad,
            precio_unitario: p.precio_unitario,
            utilidad: p.utilidad,
            id_producto: p.id_producto,
            id_pedido: shipping._id,
            id_vendedor: p.id_vendedor,
            sucursal: sucursalId,
            deposito_realizado: false,
            nombre_variante: p.nombre_variante || p.producto,
        }));

    try {
        if (saldoACobrar <= 0) {
            message.error("El saldo a cobrar debe ser mayor a 0.");
            setLoading(false);
            return;
        }
        // Actualizar solo el campo quien_paga_delivery en ventas existentes
        const quienPagaActual = internalForm.getFieldValue("quien_paga_delivery");
        const updatedExisting = existingProducts.map((p: any) => ({
            _id: p.id_venta, // importante para identificar la venta en el backend
            quien_paga_delivery: quienPagaActual,
        }));
        //console.log("Updated existing products:", updatedExisting);
        if (updatedExisting.length > 0) {
            //await updateProductsByShippingAPI(shipping._id, updatedExisting);
        }
        //if (formattedNewProducts.length > 0) await registerSalesAPI(formattedNewProducts);
        //if (existingProducts.length > 0) await updateProductsByShippingAPI(shipping._id, existingProducts);
        //if (deletedProducts.length > 0) await deleteProductsByShippingAPI(shipping._id, deletedProducts);
        let horaEntrega = values.hora_entrega_acordada;

        if (values.estado_pedido === "Entregado") {
            horaEntrega = new Date(); // ⬅️ fuerza hora actual al marcar como entregado
        }
        console.log("🕒 Hora de entrega acordada:", horaEntrega);
        const updateShippingInfo: any = {
            ...values,
            lugar_entrega: values.lugar_entrega === 'otro' ? values.lugar_entrega_input : values.lugar_entrega,
            fecha_pedido: values.fecha_pedido?.format('YYYY-MM-DD HH:mm:ss'),
            hora_entrega_acordada: horaEntrega,
            pagado_al_vendedor: values.tipo_de_pago === '3',
            adelanto_cliente: ['si', 'no'].includes(values.esta_pagado) ? 0 : (values.adelanto_cliente || 0),
            quien_paga_delivery: values.quien_paga_delivery,
        };
        if (values.quien_paga_delivery === "tupunto") {
            updateShippingInfo.cargo_delivery = 0;
        }

// Forzar subtotales según el tipo de pago
        switch (values.tipo_de_pago) {
            case '1':
                updateShippingInfo.subtotal_qr = saldoACobrar;
                updateShippingInfo.subtotal_efectivo = 0;
                break;
            case '2':
                updateShippingInfo.subtotal_qr = 0;
                updateShippingInfo.subtotal_efectivo = saldoACobrar;
                break;
            case '3':
                updateShippingInfo.subtotal_qr = 0;
                updateShippingInfo.subtotal_efectivo = 0;
                break;
            case '4':
                updateShippingInfo.subtotal_qr = qrInput;
                updateShippingInfo.subtotal_efectivo = efectivoInput;
                break;
        }

        //console.log("📤 Datos enviados al backend:", updateShippingInfo);

        await updateShippingAPI(updateShippingInfo, shipping._id);
        message.success("Pedido actualizado con éxito");
        onSave();
        onClose();
    } catch (error) {
        message.error("Ocurrió un error al guardar los cambios");
    } finally {
        setLoading(false);
    }
};


//console.log("📦 enrichedProducts:", enrichedProducts);
const id_shipping = shipping?._id || '';
return (
    <Modal
        title={`Detalles del Pedido ${shipping?._id || ''}`}
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
                    onClick={() => {
                        Modal.confirm({
                            title: "¿Desea eliminar esta entrega?",
                            content: "Esta acción no se puede deshacer.",
                            okText: "Sí, eliminar",
                            okType: "danger",
                            cancelText: "Cancelar",
                            onOk: async () => {
                                try {
                                    // Restaurar stock antes de eliminar
                                    //console.log("Restaurando stock de productos antes de eliminar la entrega...",products);
                                    const enrichedForRestock = products.map((p) => {
                                        const nombreVariante = p.nombre_variante || p.producto || '';
                                        const productoCompleto = data.find(dp =>
                                            dp._id === p.id_producto || dp.nombre_producto === p.producto?.split(" - ")[0]
                                        );
                                        if (!productoCompleto) {
                                            console.warn("⚠️ Producto no encontrado en data:", p.producto);
                                            return p;
                                        }

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
                                    //console.log("♻️ Restaurando con datos:", enrichedForRestock);

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
        <Form
            form={internalForm}
            layout="vertical"
            onFinish={handleSave}
            disabled={!isAdmin}
        >
            {/* INFORMACIÓN DEL CLIENTE */}
            <Card title="Información del Cliente" bordered={false}>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="cliente" label="Nombre Cliente" rules={[{ required: true }]}>
                            <Input prefix={<UserOutlined />} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="telefono_cliente" label="Celular" >
                            <Input
                                prefix={<PhoneOutlined />}
                                onKeyDown={(e) => {
                                    if (!/[0-9]/.test(e.key) && !['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Enter'].includes(e.key)) {
                                        e.preventDefault();
                                    }
                                }}
                            />
                        </Form.Item>
                    </Col>
                </Row>
            </Card>
            {/* DATOS DEL PEDIDO */}
            <Card title="Datos del Pedido" bordered={false} style={{ marginTop: 16 }}>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name='fecha_pedido' label='Fecha de la Entrega' rules={[{ required: true }]}>
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="hora_entrega_acordada" label="Hora Entrega">
                            <TimePicker format='HH:mm' style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={24}>
                        <Form.Item name="lugar_entrega" label="Lugar de Entrega" rules={[{ required: true }]}>
                            {isDeliveryPlaceInput ? (
                                <div className='flex align-middle gap-2'>
                                    <Form.Item name="lugar_entrega_input" noStyle>
                                    <Input placeholder='Escriba el lugar de entrega' />
                                    </Form.Item>
                                    <Button
                                        onClick={() => {
                                            setIsDeliveryPlaceInput(false);
                                            internalForm.resetFields(['lugar_entrega']);
                                        }}
                                    >
                                        Volver a seleccionar
                                    </Button>
                                </div>
                            ) : (
                                <Select
                                    placeholder="Seleccione el lugar de entrega"
                                    allowClear
                                    style={{ width: '100%' }}
                                    onChange={(value) => {
                                        if (value === 'otro') setIsDeliveryPlaceInput(true);
                                    }}
                                    options={[
                                        ...sucursals.map((s: any) => ({
                                            value: s.nombre,
                                            label: s.nombre,
                                        })),
                                        { value: "otro", label: "Otro" }
                                    ]}
                                />
                            )}
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={24}>
                        <Form.Item name="observaciones" label="Observaciones">
                            <Input prefix={<CommentOutlined />} />
                        </Form.Item>
                    </Col>
                </Row>
            </Card>
            {/* PRODUCTOS */}
            <Card title="Productos del Pedido" bordered={false} style={{ marginTop: 16 }}
                  extra={
                      isAdmin && (
                          <Button
                              icon={<EditOutlined />}
                              onClick={() => {
                                  setOriginalProducts(JSON.parse(JSON.stringify(products))); // ⚠️ deep clone, para evitar que se compartan referencias
                                  setEditProductsModalVisible(true);
                              }}
                              type="link"
                          >
                              Editar Productos
                          </Button>
                      )
                  }
            >
                <EmptySalesTable
                    products={products}
                    onDeleteProduct={isAdmin ? handleDeleteProduct : undefined}
                    onUpdateTotalAmount={setTotalAmount}
                    handleValueChange={handleValueChange}
                    sellers={[]}
                    isAdmin={isAdmin}
                    readonly={true}
                />
            </Card>

            <TempProductModal
                visible={tempModalVisible}
                onCancel={() => setTempModalVisible(false)}
                onAddProduct={(tempProduct: any) => setProducts((prev: any) => [...prev, tempProduct])}
            />
            {/* DETALLES DEL PAGO */}
            <Card
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Detalles del Pago</span>
                        <span style={{ fontWeight: 'bold' }}>Monto total: Bs. {totalAmount.toFixed(2)}</span>
                    </div>
                }
                bordered={false}
                style={{ marginTop: 16 }}
            >
                {/* ¿Está ya pagado? */}
                <Row gutter={16}>
                    <Col span={24}>
                        <Form.Item name="esta_pagado" label="¿Está ya pagado?" rules={[{ required: true }]}>
                            <Radio.Group
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setEstaPagado(value);
                                    setAdelantoVisible(value === 'adelanto');

                                    if (value !== 'adelanto') {
                                        internalForm.setFieldsValue({ adelanto_cliente: 0 }); // << OBLIGATORIO para el form
                                    }

                                    if (value === 'si') {
                                        setTipoPago("3");
                                        internalForm.setFieldValue("tipo_de_pago", "3");
                                    }
                                }}
                            >
                            <Radio.Button value="si">Sí</Radio.Button>
                                <Radio.Button value="no">No</Radio.Button>
                                <Radio.Button value="adelanto">Pago Adelanto</Radio.Button>
                            </Radio.Group>
                        </Form.Item>
                    </Col>
                </Row>

                {adelantoVisible && (
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item name="adelanto_cliente" label="Monto del adelanto" rules={[{ required: true }]}>
                                <InputNumber
                                    prefix="Bs."
                                    min={0}
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                )}

                {/* Estado del Pedido */}
                <Row gutter={16}>
                    <Col span={24}>
                        <Form.Item name="estado_pedido" label="Estado del Pedido" rules={[{ required: true }]}>
                            <Radio.Group onChange={(e) => setEstadoPedido(e.target.value.toString())} value={estadoPedido || "En Espera"}>
                                <Radio.Button value="En Espera">En espera</Radio.Button>
                                <Radio.Button value="Entregado">Entregado</Radio.Button>
                            </Radio.Group>
                        </Form.Item>
                    </Col>
                </Row>

                {/* ¿Quién paga el delivery? */}
                {!origenEsIgualADestino && (
                    <>
                        <Row gutter={16}>
                            <Col span={24}>
                                <Form.Item
                                    name="quien_paga_delivery"
                                    label="¿Quién paga el delivery?"
                                    rules={[{ required: true, message: "Seleccione quién paga el delivery" }]}
                                >
                                    <Radio.Group
                                        value={quienPagaDelivery} //  esto lo hace controlado
                                        onChange={e => internalForm.setFieldValue("quien_paga_delivery", e.target.value)}
                                        disabled={!isAdmin}
                                    >
                                        <Radio.Button value="comprador">COMPRADOR</Radio.Button>
                                        <Radio.Button value="vendedor">VENDEDOR</Radio.Button>
                                        <Radio.Button value="tupunto">Tu Punto</Radio.Button>
                                    </Radio.Group>
                                </Form.Item>

                            </Col>
                        </Row>

                        <Row gutter={16}>
                            {quienPagaDelivery !== "tupunto" && (
                                <Col span={12}>
                                    <Form.Item
                                        name="cargo_delivery"
                                        label="Monto cobrado por el Delivery"
                                        rules={
                                            (!isAdmin && (quienPagaDelivery === 'vendedor' ||quienPagaDelivery === 'comprador') )
                                                ? []
                                                : [{ required: true, message: "Este campo es obligatorio" }]
                                        }
                                    >
                                        <InputNumber
                                            prefix="Bs."
                                            value={montoDelivery}
                                            onChange={val => setMontoDelivery(val ?? 0)}
                                            style={{ width: '100%' }}
                                        />
                                    </Form.Item>

                                </Col>
                            )}

                            <Col span={12}>
                                {isAdmin && (
                                    <Form.Item
                                        name="costo_delivery"
                                        label="Costo de realizar el Delivery"
                                        rules={[{ required: true }]}
                                    >
                                        <InputNumber
                                            prefix="Bs."
                                            value={costoDelivery}
                                            onChange={val => setCostoDelivery(val ?? 0)}
                                            style={{ width: '100%' }}
                                        />
                                    </Form.Item>
                                )}
                            </Col>
                        </Row>
                    </>
                )}

                {/* Saldo a cobrar */}
                <Row gutter={16}>
                    <Col span={24}>
                        <Form.Item label="Saldo a Cobrar">
                            <Input
                                prefix="Bs."
                                readOnly
                                value={saldoACobrar.toFixed(2)}
                                style={{ width: '100%', backgroundColor: '#fffbe6', fontWeight: 'bold' }}
                            />
                        </Form.Item>
                    </Col>
                </Row>

                {/* Tipo de pago */}
                {estadoPedido === "Entregado" && (
                    <>
                        <Row gutter={16}>
                            <Col span={24}>
                                <Form.Item name="tipo_de_pago" label="Tipo de pago" rules={[{ required: true }]}>
                                    <div style={{ position: 'relative' }}>
                                        <Radio.Group
                                            value={tipoPago}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (value !== "3") {
                                                    setTipoPago(value);
                                                    setClickedOnce(false); // reset si cambió a otro
                                                    internalForm.setFieldValue("tipo_de_pago", value);
                                                }
                                            }}
                                            disabled={!isAdmin || estaPagado === "si"}
                                        >
                                        <Radio.Button value="1">Transferencia o QR</Radio.Button>
                                            <Radio.Button value="2">Efectivo</Radio.Button>
                                            <Radio.Button
                                                value="3"
                                                onClick={() => {
                                                    if (tipoPago === "3") return; // ya está activo, ignorar

                                                    if (!clickedOnce) {
                                                        setClickedOnce(true);
                                                        setTimeout(() => setClickedOnce(false), 4000); // volver a permitir después de 4s
                                                    } else {
                                                        setTipoPago("3");
                                                        internalForm.setFieldValue("tipo_de_pago", "3");
                                                        internalForm.setFieldValue("adelanto_cliente", 0);
                                                        setClickedOnce(false);
                                                    }
                                                }}
                                            >
                                                Pagado al dueño
                                            </Radio.Button>

                                            <Radio.Button value="4">Efectivo + QR</Radio.Button>
                                        </Radio.Group>

                                        {clickedOnce && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    color: 'red',
                                                    fontSize: '12px',
                                                    marginTop: 4,
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                Haz clic de nuevo para confirmar el cambio. Se borrará el adelanto.
                                            </div>
                                        )}
                                    </div>
                                </Form.Item>

                            </Col>
                        </Row>

                        {["1", "2"].includes(tipoPago || "") && (
                            <Row gutter={16}>
                                <Col span={24}>
                                    <Form.Item label={tipoPago === "1" ? "Subtotal QR" : "Subtotal Efectivo"}>
                                        <InputNumber
                                            prefix="Bs."
                                            value={saldoACobrar}
                                            readOnly
                                            style={{ width: '100%', backgroundColor: '#fffbe6', fontWeight: 'bold' }}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        )}

                        {tipoPago === "4" && (
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item label="Subtotal QR" name="subtotal_qr">
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
                                                internalForm.setFieldValue('subtotal_efectivo', efectivo);
                                            }}
                                            style={{ width: '100%' }}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item label="Subtotal Efectivo" name="subtotal_efectivo">
                                        <InputNumber
                                            prefix="Bs."
                                            value={efectivoInput}
                                            readOnly
                                            style={{ width: '100%', backgroundColor: '#fffbe6', fontWeight: 'bold' }}
                                        />
                                    </Form.Item>
                                </Col>
                                {showWarning && (
                                    <Col span={24}>
                                        <div style={{ color: 'red', fontWeight: 'bold' }}>
                                            La suma de QR + Efectivo debe ser igual al saldo a cobrar.
                                        </div>
                                    </Col>
                                )}
                            </Row>
                        )}
                    </>
                )}
            </Card>

        </Form>
        {isAdmin && (
            <div style={{ marginTop: 24, textAlign: 'right' }}>
                <Button style={{ marginRight: 8 }} onClick={handleCancelChanges}>
                    Cancelar
                </Button>
                <Button type="primary" loading={loading} onClick={() => internalForm.submit()}>
                    Guardar Cambios
                </Button>
            </div>
        )}

        <EditProductsModal
            visible={editProductsModalVisible}
            onCancel={() => setEditProductsModalVisible(false)}
            products={products as any[]}
            setProducts={setProducts}
            allProducts={enrichedProducts}
            sellers={sellers}
            isAdmin={isAdmin}
            shippingId={id_shipping}
            sucursalId={localStorage.getItem("sucursalId")}
            onSave={() => {
                setEditProductsModalVisible(false); // cerrar modal hijo
                message.success("Cambios guardados"); // opcional
            }}
        />
    </Modal>
    );
}

export default ShippingInfoModal;