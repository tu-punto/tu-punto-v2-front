import { Modal, Form, Input, InputNumber, Button, Radio, Col, Row, DatePicker, TimePicker, Card, message, Select } from 'antd';
import { UserOutlined, PhoneOutlined, CommentOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { registerShippingAPI } from '../../api/shipping';
import { sendMessageAPI } from '../../api/whatsapp';

function ShippingFormModal({
                               visible, onCancel, onSuccess, selectedProducts,
                               totalAmount, handleSales, sucursals,
                               handleDebt, clearSelectedProducts, isAdmin
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

    const handleFinish = async (shippingData: any) => {
        setLoading(true);

        const tipoPagoMap: any = {
            1: 'Transferencia o QR',
            2: 'Efectivo',
            3: 'Pagado al dueño',
            4: 'Efectivo + QR'
        };

        const estadoPedidoMap: any = {
            1: 'En espera',
            3: 'Entregado'
        };

        const apiShippingData = {
            ...shippingData,
            tipo_de_pago: tipoPagoMap[shippingData.tipo_de_pago],
            estado_pedido: estadoPedidoMap[shippingData.estado_pedido],
            id_sucursal: parseInt(localStorage.getItem("sucursalId") || "3"),
        };

        const response = await registerShippingAPI(apiShippingData);
        if (!response.status) {
            message.error('Error al registrar el pedido');
        }

        const parsedProducts = selectedProducts.map((product: any) => ({
            id_producto: product.key,
            ...product,
        }));

        await handleDebt(parsedProducts, response.newShipping.adelanto_cliente);
        await handleSales(response.newShipping, parsedProducts);
        clearSelectedProducts();
        form.resetFields();
        setEstadoPedido(null);
        setTipoPago(null);
        setAdelantoVisible(false);
        setLoading(false);
        onSuccess();
    };

    const handleIncrement = (setter: React.Dispatch<React.SetStateAction<number>>, value: number) => {
        setter(prev => parseFloat((prev + value).toFixed(2)));
    };

    const handleDecrement = (setter: React.Dispatch<React.SetStateAction<number>>, value: number) => {
        setter(prev => parseFloat((prev - value).toFixed(2)));
    };

    useEffect(() => {
        const monto = parseFloat(totalAmount || 0);
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
            form.setFieldsValue({ subtotal_qr: totalAmount });
        } else if (tipoPago === '2' || tipoPago === '3') {
            form.setFieldsValue({ subtotal_efectivo: totalAmount });
        }
    }, [tipoPago, totalAmount, form]);

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
                    {isAdmin && (
                        <>
                            {/* Estado del Pedido */}
                            <Row gutter={16}>
                                <Col span={24}>
                                    <Form.Item name="estado_pedido" label="Estado del Pedido" rules={[{ required: true }]}>
                                        <Radio.Group onChange={(e) => setEstadoPedido(e.target.value.toString())}>
                                            <Radio.Button value="1">En espera</Radio.Button>
                                            <Radio.Button value="3">Entregado</Radio.Button>
                                        </Radio.Group>
                                    </Form.Item>
                                </Col>
                            </Row>

                            {/* Condicional Entregado */}
                            {estadoPedido === '3' && (
                                <>
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Form.Item name="cargo_delivery" label="Monto cobrado por el Delivery">
                                                <InputNumber
                                                    prefix="Bs."
                                                    value={montoCobradoDelivery}
                                                    onChange={value => setMontoCobradoDelivery(value ?? 0)}
                                                    style={{ width: '100%' }}
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item name="costo_delivery" label="Costo de realizar el Delivery">
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

                            {/* ¿Está ya pagado? */}
                            {(estadoPedido === '1' || estadoPedido === '3') && (
                                <>
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
                                                        value={adelantoClienteInput}
                                                        onChange={value => setAdelantoClienteInput(value ?? 0)}
                                                        style={{ width: '100%' }}
                                                    />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                    )}
                                </>
                            )}

                            {/* Tipo de pago */}
                            {estadoPedido === '3' && (
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
                                                        value={totalAmount}
                                                        readOnly
                                                        style={{ width: '100%', backgroundColor: '#fffbe6', color: '#000', fontWeight: 'bold' }}
                                                    />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                    )}

                                    {["2", "3"].includes(tipoPago || "") && (
                                        <Row gutter={16}>
                                            <Col span={24}>
                                                <Form.Item label="Subtotal Efectivo" name="subtotal_efectivo">
                                                    <InputNumber
                                                        prefix="Bs."
                                                        value={totalAmount}
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
                                                <Form.Item label="Subtotal QR" name="subtotal_qr">
                                                    <InputNumber
                                                        prefix="Bs."
                                                        min={0}
                                                        value={qrInput}
                                                        onChange={setQrInput}
                                                        style={{ width: '100%' }}
                                                    />
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item label="Subtotal Efectivo" name="subtotal_efectivo">
                                                    <InputNumber
                                                        prefix="Bs."
                                                        min={0}
                                                        value={efectivoInput}
                                                        onChange={setEfectivoInput}
                                                        style={{ width: '100%' }}
                                                    />
                                                </Form.Item>
                                            </Col>
                                            {showWarning && (
                                                <Col span={24}>
                                                    <div style={{ color: 'red', fontWeight: 'bold' }}>
                                                        La suma de QR + Efectivo debe ser igual al monto total.
                                                    </div>
                                                </Col>
                                            )}
                                        </Row>
                                    )}
                                </>
                            )}

                            {/* Saldo a Cobrar */}
                            <Row gutter={16}>
                                <Col span={24}>
                                    <Form.Item label="Saldo a Cobrar">
                                        <Input
                                            prefix="Bs."
                                            readOnly
                                            value={(totalAmount + montoCobradoDelivery - adelantoClienteInput).toFixed(2)}
                                            style={{ width: '100%', backgroundColor: '#fffbe6', color: '#000', fontWeight: 'bold' }}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
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
