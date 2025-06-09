import { Modal, Form, Input, InputNumber, Button, Radio, Col, Row, DatePicker, TimePicker, Card, message, Select } from 'antd';
import { UserOutlined, PhoneOutlined, CommentOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import {useEffect, useMemo, useState} from 'react';
import { registerShippingAPI, updateShippingAPI  } from '../../api/shipping';
import { sendMessageAPI } from '../../api/whatsapp';
import { updateSubvariantStockAPI } from '../../api/product';
import { useWatch } from 'antd/es/form/Form';


function ShippingFormModal({
                               visible, onCancel, onSuccess, selectedProducts,
                               totalAmount, handleSales, sucursals,
                               //handleDebt,
                               clearSelectedProducts, isAdmin,sellers
                           }: any) {
    const [loading, setLoading] = useState(false);
    const [qrInput, setQrInput] = useState<number>(0);
    const [efectivoInput, setEfectivoInput] = useState<number>(0);
    const [adelantoClienteInput, setAdelantoClienteInput] = useState<number>(0);
    const [adelantoVisible, setAdelantoVisible] = useState(false);
    const [isDeliveryPlaceInput, setIsDeliveryPlaceInput] = useState(false);
    const [montoCobradoDelivery, setMontoCobradoDelivery] = useState<number>(0);
    const [costoRealizarDelivery, setCostoRealizarDelivery] = useState<number>(0);
    const [estadoPedido, setEstadoPedido] = useState<string | null>(null);
    const [tipoPago, setTipoPago] = useState<string | null>(null);
    const [form] = Form.useForm();
    const [showWarning, setShowWarning] = useState(false);
    const [quienPaga, setQuienPaga] = useState<string | null>(null);

    const saldoACobrar = useMemo(() => {
        return totalAmount +
            (form.getFieldValue("quien_paga_delivery") === "comprador" ? montoCobradoDelivery : 0) -
            adelantoClienteInput;
    }, [totalAmount, montoCobradoDelivery, adelantoClienteInput, form]);
    const hayMultiplesVendedores = useMemo(() => {
        const vendedores = selectedProducts.map((p: any) => p.id_vendedor);
        const unicos = [...new Set(vendedores)];
        return unicos.length > 1;
    }, [selectedProducts]);
    const lugarEntrega = useWatch('lugar_entrega', form);

    const origenEsIgualADestino = useMemo(() => {
        const origen = sucursals?.[0]?.nombre?.trim().toLowerCase();
        const destino = lugarEntrega?.trim()?.toLowerCase();
        return origen && destino ? origen === destino : true;
    }, [lugarEntrega, sucursals]);


    const handleFinish = async (values: any) => {
        //console.log(" selectedProducts:", selectedProducts);

        const sucursalId = sucursals?.[0]?._id || null;
        setLoading(true);
        const lugarOrigen = sucursals?.[0]?._id || null;
        try {
            const response = await registerShippingAPI({
                ...values,
                id_sucursal: sucursalId,
                lugar_origen: lugarOrigen,
            });

            if (!response.success) {
                message.error("Error al registrar el pedido");
                setLoading(false);
                return;
            }

            const productosTemporales = selectedProducts.filter((p: any) => p.esTemporal);
            const productosNormales = selectedProducts.filter((p: any) => !p.esTemporal);

            const ventas = productosNormales.map((p: any) => {
                const vendedor = p.id_vendedor || p.vendedor;
                const comision = sellers?.find((s: any) => s._id === vendedor)?.comision_porcentual || 0;
                const utilidad = parseFloat(p.utilidad);
                const utilidadCalculada = parseFloat(((p.precio_unitario * p.cantidad * comision) / 100).toFixed(2));

                return {
                    id_producto: p.key.split("-")[0],
                    producto: p.key.split("-")[0],
                    id_vendedor: vendedor,
                    vendedor,
                    id_pedido: response.newShipping._id,
                    sucursal: sucursalId,
                    cantidad: p.cantidad,
                    precio_unitario: p.precio_unitario,
                    utilidad: isNaN(utilidad) || utilidad === 1 ? utilidadCalculada : utilidad,
                    deposito_realizado: false,
                    variantes: p.variantes,
                    nombre_variante: `${p.producto}`,
                    stockActual: p.stockActual,
                };
            });

            if (ventas.length > 0) {
                //await handleDebt(ventas, response.newShipping.adelanto_cliente);
                await handleSales(response.newShipping, ventas);

                // RESTAR STOCK si el estado es "Entregado"
                if (values.estado_pedido === "Entregado") {

                    await actualizarStock(ventas);
                }
            }

            if (productosTemporales.length > 0) {
                const productosTemporalesData = productosTemporales.map((p: any) => ({
                    producto: p.producto,
                    cantidad: p.cantidad,
                    precio_unitario: p.precio_unitario,
                    utilidad: p.utilidad,
                    id_vendedor: p.id_vendedor
                }));

                await updateShippingAPI(
                    { productos_temporales: productosTemporalesData },
                    response.newShipping._id
                );
            }

            clearSelectedProducts();
            form.resetFields();
            setTipoPago(null);
            setQrInput(0);
            setEfectivoInput(0);
            onSuccess();
        } catch (error) {
            console.error("Error en handleFinish:", error);
            message.error("Error al procesar la entrega");
        }

        setLoading(false);
    };

    const handleIncrement = (setter: React.Dispatch<React.SetStateAction<number>>, value: number) => {
        setter(prev => parseFloat((prev + value).toFixed(2)));
    };

    const handleDecrement = (setter: React.Dispatch<React.SetStateAction<number>>, value: number) => {
        setter(prev => parseFloat((prev - value).toFixed(2)));
    };
    const actualizarStock = async (productos: any[]) => {
        const sucursalId = sucursals?.[0]?._id || null;
        for (const prod of productos) {
            if (prod.esTemporal) continue;

            const { id_producto, cantidad, stockActual, variantes } = prod;

            if (!variantes || typeof variantes !== 'object') {
                console.warn("Sin variantes válidas para:", prod);
                continue;
            }

            const nuevoStock = stockActual - cantidad;
            if (nuevoStock < 0) continue;

            try {

                const res = await updateSubvariantStockAPI({
                    productId: id_producto,
                    sucursalId,
                    variantes,
                    stock: nuevoStock
                });

                if (!res.success) {
                    message.error(`Error actualizando stock de ${id_producto}`);
                }
            } catch (err) {
                console.error("Error al actualizar stock:", err);
            }
        }
    };
    useEffect(() => {
        const monto = saldoACobrar || 0;
        const suma = (qrInput || 0) + (efectivoInput || 0);
        if (tipoPago === '4') {
            setShowWarning(suma !== monto);
        } else {
            setShowWarning(false);
        }
    }, [qrInput, efectivoInput, tipoPago, totalAmount]);
    useEffect(() => {
        const estado = form.getFieldValue('estado_pedido');
        const pago = form.getFieldValue('tipo_de_pago');
        if (estado !== undefined) setEstadoPedido(estado?.toString());
        if (pago !== undefined) setTipoPago(pago?.toString());
    }, [form]);
    useEffect(() => {
        if (tipoPago === '1') {
            form.setFieldsValue({ subtotal_qr: saldoACobrar });
            setQrInput(saldoACobrar);
            setEfectivoInput(0);
        } else if (tipoPago === '2' || tipoPago === '3') {
            form.setFieldsValue({ subtotal_efectivo: saldoACobrar });
            setQrInput(0);
            setEfectivoInput(saldoACobrar);
        } else if (tipoPago === '4') {
            const mitad = parseFloat((saldoACobrar / 2).toFixed(2));
            form.setFieldsValue({
                subtotal_qr: mitad,
                subtotal_efectivo: saldoACobrar - mitad
            });
            setQrInput(mitad);
            setEfectivoInput(saldoACobrar - mitad);
        }
    }, [tipoPago, saldoACobrar, form]);

    return (
        <Modal title="Realizar Entrega" open={visible} onCancel={onCancel} footer={null} width={800}>
            <Form form={form} name="shippingForm" onFinish={handleFinish} layout="vertical">
                {/* INFORMACIÓN DEL CLIENTE */}
                <Card title="Información del Cliente" bordered={false}>
                    <Row gutter={16}>
                        <Col span={18}>
                            <Form.Item name="cliente" label="Nombre Cliente" rules={[{ required: true }]}>
                                <Input prefix={<UserOutlined />} />
                            </Form.Item>
                        </Col>
                        <Col span={18}>
                            <Form.Item name="telefono_cliente" label="Celular" rules={[{ required: true }]}>
                                <Input
                                    prefix={<PhoneOutlined />}
                                    onKeyDown={(e) => {
                                        if (!/[0-9.]/.test(e.key) && !['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Enter'].includes(e.key)) {
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
                            <Form.Item name="lugar_entrega" label="Lugar De Entrega" rules={[{ required: true }]}>
                                {isDeliveryPlaceInput ? (
                                    <div className='flex align-middle gap-2'>
                                        <Input placeholder='Escriba el lugar de entrega' />
                                        <Button onClick={() => { setIsDeliveryPlaceInput(false); form.resetFields(['lugar_entrega']) }}>
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
                                        setAdelantoVisible(e.target.value === 'adelanto');
                                        if (e.target.value !== 'adelanto') {
                                            setAdelantoClienteInput(0);
                                        }
                                    }}
                                >
                                    <Radio.Button value="si">Sí</Radio.Button>
                                    <Radio.Button value="no">No</Radio.Button>
                                    <Radio.Button value="adelanto" disabled={hayMultiplesVendedores}>
                                        Pago Adelanto
                                    </Radio.Button>
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
                                        value={adelantoClienteInput}
                                        onChange={value => setAdelantoClienteInput(value ?? 0)}
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
                                <Radio.Group
                                    onChange={(e) => setEstadoPedido(e.target.value.toString())}
                                    value={estadoPedido || "En Espera"}
                                >
                                    <Radio.Button value="En Espera">En espera</Radio.Button>
                                    {isAdmin && <Radio.Button value="Entregado">Entregado</Radio.Button>}
                                </Radio.Group>
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* ¿Quién paga delivery? */}
                    {estadoPedido === 'Entregado' && !origenEsIgualADestino && (
                        <>
                            <Row gutter={16}>
                                <Col span={24}>
                                    <Form.Item
                                        name="quien_paga_delivery"
                                        label="¿Quién paga el delivery?"
                                        rules={[{ required: true, message: "Selecciona quién paga el delivery" }]}
                                    >
                                        <Radio.Group
                                            onChange={(e) => {
                                                setQuienPaga(e.target.value);
                                                form.setFieldValue("quien_paga_delivery", e.target.value);
                                            }}
                                        >
                                            <Radio.Button value="comprador" disabled={hayMultiplesVendedores}>
                                                COMPRADOR
                                            </Radio.Button>
                                            <Radio.Button value="vendedor">VENDEDOR</Radio.Button>
                                            <Radio.Button value="tupunto">Tu Punto</Radio.Button>
                                        </Radio.Group>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col span={12}>
                                    {["comprador", "vendedor"].includes(quienPaga || "") && (
                                        <Form.Item
                                            name="cargo_delivery"
                                            label="Monto cobrado por el Delivery"
                                            rules={[{ required: true, message: "Campo obligatorio" }]}
                                        >
                                            <InputNumber
                                                prefix="Bs."
                                                value={montoCobradoDelivery}
                                                onChange={value => setMontoCobradoDelivery(value ?? 0)}
                                                style={{ width: '100%' }}
                                            />
                                        </Form.Item>
                                    )}
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="costo_delivery"
                                        label="Costo de realizar el Delivery"
                                        rules={[{ required: true, message: "Campo obligatorio" }]}
                                    >
                                        <InputNumber
                                            prefix="Bs."
                                            value={costoRealizarDelivery}
                                            onChange={value => setCostoRealizarDelivery(value ?? 0)}
                                            style={{ width: '100%' }}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </>
                    )}

                    {/* Saldo a Cobrar */}
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item label="Saldo a Cobrar">
                                <Input
                                    prefix="Bs."
                                    readOnly
                                    value={saldoACobrar.toFixed(2)}
                                    style={{ width: '100%', backgroundColor: '#fffbe6', color: '#000', fontWeight: 'bold' }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* Tipo de pago */}
                    {estadoPedido === 'Entregado' && (
                        <>
                            <Row gutter={16}>
                                <Col span={24}>
                                    <Form.Item name="tipo_de_pago" label="Tipo de pago" rules={[{ required: true }]}>
                                        <Radio.Group onChange={(e) => setTipoPago(e.target.value.toString())}>
                                            <Radio.Button value="1">Transferencia o QR</Radio.Button>
                                            <Radio.Button value="2">Efectivo</Radio.Button>
                                            <Radio.Button value="3">Pagado al dueño</Radio.Button>
                                            <Radio.Button value="4">Efectivo + QR</Radio.Button>
                                        </Radio.Group>
                                    </Form.Item>
                                </Col>
                            </Row>

                            {/* Campos según tipo de pago */}
                            {["1"].includes(tipoPago || "") && (
                                <Row gutter={16}>
                                    <Col span={24}>
                                        <Form.Item label="Subtotal QR" name="subtotal_qr">
                                            <InputNumber
                                                prefix="Bs."
                                                value={saldoACobrar}
                                                readOnly
                                                style={{ width: '100%', backgroundColor: '#fffbe6', color: '#000', fontWeight: 'bold' }}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            )}

                            {["2"].includes(tipoPago || "") && (
                                <Row gutter={16}>
                                    <Col span={24}>
                                        <Form.Item label="Subtotal Efectivo" name="subtotal_efectivo">
                                            <InputNumber
                                                prefix="Bs."
                                                value={saldoACobrar}
                                                readOnly
                                                style={{ width: '100%', backgroundColor: '#fffbe6', color: '#000', fontWeight: 'bold' }}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            )}

                            {tipoPago === '4' && (
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item label="Subtotal QR" name="subtotal_qr" rules={[
                                            { required: true, message: 'Debe ingresar un valor en QR' },
                                            {
                                                validator: (_, value) => {
                                                    if (value <= 0) return Promise.reject("El monto QR debe ser mayor a 0");
                                                    if (value >= saldoACobrar) return Promise.reject("El monto QR debe ser menor al total");
                                                    return Promise.resolve();
                                                }
                                            }
                                        ]}>
                                            <InputNumber
                                                prefix="Bs."
                                                min={0.10}
                                                max={saldoACobrar - 0.01}
                                                value={qrInput}
                                                onChange={(val) => {
                                                    const qr = val ?? 0;
                                                    setQrInput(qr);
                                                    const efectivo = parseFloat((saldoACobrar - qr).toFixed(2));
                                                    setEfectivoInput(efectivo);
                                                    form.setFieldsValue({ subtotal_efectivo: efectivo });
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

                <Form.Item style={{ marginTop: 16 }}>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        Guardar
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    );
}

export default ShippingFormModal;
