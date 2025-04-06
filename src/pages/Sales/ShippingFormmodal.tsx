import { Modal, Form, Input, InputNumber, Button, Radio, Col, Row, DatePicker, TimePicker, Card, message, Select } from 'antd';
import { UserOutlined, PhoneOutlined, CommentOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { registerShippingAPI } from '../../api/shipping';
import { Option } from 'antd/es/mentions';
import { sendMessageAPI } from '../../api/whatsapp';

function ShippingFormModal({ visible, onCancel, onSuccess, selectedProducts, totalAmount, handleSales, sucursals, handleDebt, clearSelectedProducts, isAdmin }: any) {
    const [loading, setLoading] = useState(false);
    const [montoCobradoDelivery, setMontoCobradoDelivery] = useState<number>(0);
    const [costoRealizarDelivery, setCostoRealizarDelivery] = useState<number>(0);
    const [qrInput, setQrInput] = useState<number>(0);
    const [efectivoInput, setEfectivoInput] = useState<number>(0);
    const [adelantoClienteInput, setAdelantoClienteInput] = useState<number>(0);
    const [adelantoVisible, setAdelantoVisible] = useState(false);
    const [mismoVendedor, setMismoVendedor] = useState(false);
    const [isDeliveryPlaceInput, setIsDeliveryPlaceInput] = useState(false);
    const [form] = Form.useForm();

    const handleFinish = async (shippingData: any) => {

        if (shippingData.lugar_entrega !== "Me Encargo") {

            const formattedDate = new Intl.DateTimeFormat('es-BO', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/La_Paz',
                hour12: false,
            }).format(shippingData.fecha_pedido);

            await sendMessageAPI("+59170186881", `Se creo una entrega para ${shippingData.cliente} en ${shippingData.lugar_entrega} para el dia ${formattedDate}`)
        }

        setLoading(true);

        const tipoPagoMap: any = {
            1: 'Transferencia o QR',
            2: 'Efectivo',
            3: 'Pagado al dueño'
        }

        const estadoPedidoMap: any = {
            1: 'En espera',
            2: 'Por entregar',
            3: 'Entregado'
        }

        const intTipoPago = parseInt(shippingData.tipo_de_pago)
        const intEstadoPedido = parseInt(shippingData.estado_pedido)

        const apiShippingData = {
            ...shippingData,
            "tipo_de_pago": tipoPagoMap[intTipoPago] || "Efectivo",
            "costo_delivery": parseInt(shippingData.costo_delivery) || 0,
            "cargo_delivery": parseInt(shippingData.cargo_delivery) || 0,
            "estado_pedido": estadoPedidoMap[intEstadoPedido] || "En espera",
            //"id_trabajador": 1,
            //TODO: Change the 3 when the new database is used for 1 or the one that is needed and check the shippingFormModal too
            "id_sucursal": parseInt(form.getFieldValue('sucursal')) || 3,
        }
        const response = await registerShippingAPI(apiShippingData);
        if (!response.status) {
            message.error('Error al registrar el pedido');
        }
        message.success('Entrega registrada con éxito');
        const parsedSelectedProducts = selectedProducts.map((product: any) => ({
            id_producto: product.key,
            ...product,
        }))
        await handleDebt(parsedSelectedProducts, response.newShipping.adelanto_cliente)
        await handleSales(response.newShipping, parsedSelectedProducts)
        clearSelectedProducts();
        resetForm();
        onSuccess();
        setLoading(false);
    };
    const resetForm = () => {
        form.resetFields();
        setMontoCobradoDelivery(0);
        setCostoRealizarDelivery(0);
        setQrInput(0);
        setEfectivoInput(0);
        setAdelantoClienteInput(0);
        setAdelantoVisible(false);
    };

    const handleIncrement = (setter: React.Dispatch<React.SetStateAction<number>>, value: number) => {
        setter(prevValue => parseFloat((prevValue + value).toFixed(2)));
    };

    const handleDecrement = (setter: React.Dispatch<React.SetStateAction<number>>, value: number) => {
        setter(prevValue => parseFloat((prevValue - value).toFixed(2)));
    };
    useEffect(() => {
        const montoTotal = totalAmount ? totalAmount.toFixed(2) : '0.00';
        const saldoCobrar = ((totalAmount) >= 0 ? (totalAmount + montoCobradoDelivery - adelantoClienteInput).toFixed(2) : '0.00');

        // Only update form fields if the values have changed
        if (form.getFieldValue('montoTotal') !== montoTotal || form.getFieldValue('saldoCobrar') !== saldoCobrar) {
            form.setFieldsValue({
                montoTotal: montoTotal,
                saldoCobrar: saldoCobrar,
            });
        }
    }, [totalAmount, qrInput, efectivoInput, adelantoClienteInput, montoCobradoDelivery]);

    useEffect(() => {
        if (selectedProducts.length > 0) {
            const vendedorIds = selectedProducts.map((product: any) => product.id_vendedor);
            const sonMismoVendedor = vendedorIds.every((vendedorId: any, _: any, arr: any) => vendedorId === arr[0]);
            setMismoVendedor(sonMismoVendedor);
        } else {
            setMismoVendedor(false);
        }
    }, [selectedProducts]);

    return (
        <Modal
            title="Pagos Form"
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={800}
        >
            <Form
                form={form}
                name="shippingForm"
                onFinish={handleFinish}
                layout="vertical"
            >
                <Card title="Información del Cliente" bordered={false}>
                    <Row gutter={16}>
                        <Col span={18}>
                            <Form.Item
                                name="cliente"
                                label="Nombre Cliente"
                                rules={[{ required: true, message: 'Este campo es obligatorio' }]}
                            >
                                <Input prefix={<UserOutlined />} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={18}>
                            <Form.Item
                                name="telefono_cliente"
                                label="Celular"
                                rules={[{ required: true, message: 'Este campo es obligatorio' }]}
                            >
                                <Input
                                    onKeyDown={(e) => {
                                        if (!/[0-9.]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Tab' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Delete' && e.key !== 'Enter') {
                                            e.preventDefault();
                                        }
                                    }}
                                    prefix={<PhoneOutlined />} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>
                <Card title="Datos del Pedido" bordered={false} style={{ marginTop: 16 }}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name='fecha_pedido'
                                label='Fecha de la Entrega'
                                rules={[{ required: true, message: 'Este campo es obligatorio' }]}
                            >
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="hora_entrega_acordada"
                                label="Hora Entrega"
                            >
                                <TimePicker
                                    format='HH:mm'
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item
                                name="lugar_entrega"
                                label="Lugar De Entrega"
                                rules={[{ required: true, message: 'Este campo es obligatorio' }]}
                            >
                                {isDeliveryPlaceInput ?
                                    <div className='flex align-middle gap-2'>
                                        <Input placeholder='Escriba el lugar de entrega' >
                                        </Input>
                                        <Button
                                            onClick={() => { setIsDeliveryPlaceInput(false); form.resetFields(['lugar_entrega']) }}
                                        >
                                            Volver a seleccionar
                                        </Button>
                                    </div> :
                                    <Select
                                        placeholder="Seleccione el lugar de entrega"
                                        allowClear
                                        style={{ width: '100%' }}
                                        onChange={(value) => {
                                            if (value === 'otro') {
                                                setIsDeliveryPlaceInput(true)
                                            }
                                        }}
                                        options={[
                                            ...sucursals.map((sucursal: any) => ({
                                                value: sucursal.nombre,
                                                label: sucursal.nombre,
                                            })),
                                            { value: "otro", label: "Otro" }
                                        ]
                                        }
                                    />
                                }

                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item
                                name="observaciones"
                                label="Observaciones"
                            >
                                <Input prefix={<CommentOutlined />} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>
                <Card title="Detalles del Pago" bordered={false} style={{ marginTop: 16 }}>
                    {isAdmin && (
                        <>
                            <Row gutter={16}>
                                <Col span={18}>
                                    <Form.Item
                                        name='tipo_de_pago'
                                        label='Tipo de pago'
                                        rules={[{ required: true, message: 'Este campo es obligatorio' }]}
                                    >
                                        <Radio.Group>
                                            <Radio.Button value='1'>Transferencia o QR</Radio.Button>
                                            <Radio.Button value='2'>Efectivo</Radio.Button>
                                            <Radio.Button value='3'>Pagado al dueño</Radio.Button>
                                        </Radio.Group>
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name='subtotal_qr'
                                        label='Subtotal QR'
                                    >
                                        <InputNumber
                                            prefix='Bs.'
                                            onChange={((e: any) => setQrInput(e))}
                                            style={{ width: '100%' }}
                                            defaultValue={0}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name='subtotal_efectivo'
                                        label='Subtotal Efectivo'
                                    >
                                        <InputNumber
                                            prefix='Bs'
                                            onChange={((e: any) => setEfectivoInput(e))}
                                            style={{ width: '100%' }}
                                            defaultValue={0}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row gutter={16}>
                                <Col span={18}>
                                    <Form.Item
                                        name='estado_pedido'
                                        label='Estado Pedido'
                                        rules={[{ required: true, message: 'Este campo es obligatorio' }]}
                                    >
                                        <Radio.Group>
                                            <Radio.Button value='1'>En espera</Radio.Button>
                                            <Radio.Button value='2'>Por entregar</Radio.Button>
                                            <Radio.Button value='3'>Entregado</Radio.Button>
                                        </Radio.Group>
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row gutter={16}>
                                <Col span={20}>
                                    <Form.Item
                                        name="costo_delivery"
                                        label="Costo de realizar el Delivery"
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <InputNumber
                                                className="no-spin-buttons"
                                                prefix='Bs.'
                                                value={costoRealizarDelivery}
                                                onKeyDown={(e) => {
                                                    if (!/[0-9.]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Tab' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Delete' && e.key !== 'Enter') {
                                                        e.preventDefault();
                                                    }
                                                }}
                                                min={0}
                                                precision={2}
                                                onChange={(value) => setCostoRealizarDelivery(value ?? 0)}
                                                style={{ flex: 1, marginRight: '8px', width: '80%' }}

                                                defaultValue={0}
                                            />
                                            <Button
                                                type="primary"
                                                icon={<PlusOutlined />}
                                                onClick={() => handleIncrement(setCostoRealizarDelivery, 0.01)}
                                                style={{ marginLeft: '8px' }}
                                            />
                                            <Button
                                                type="primary"
                                                icon={<MinusOutlined />}
                                                onClick={() => handleDecrement(setCostoRealizarDelivery, 0.01)}
                                                style={{ marginLeft: '8px' }}
                                            />
                                        </div>
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row gutter={16}>
                                <Col span={20}>
                                    <Form.Item
                                        name="cargo_delivery"
                                        label="Monto cobrado por el Delivery"
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <InputNumber
                                                className="no-spin-buttons"
                                                prefix='Bs.'
                                                value={montoCobradoDelivery}
                                                min={0}
                                                precision={2}
                                                onChange={(value) => setMontoCobradoDelivery(value ?? 0)}
                                                style={{ flex: 1, marginRight: '8px', width: '80%' }}
                                            />
                                            <Button
                                                type="primary"
                                                icon={<PlusOutlined />}
                                                onClick={() => handleIncrement(setMontoCobradoDelivery, 0.01)}
                                                style={{ marginLeft: '8px' }}
                                            />
                                            <Button
                                                type="primary"
                                                icon={<MinusOutlined />}
                                                onClick={() => handleDecrement(setMontoCobradoDelivery, 0.01)}
                                                style={{ marginLeft: '8px' }}
                                            />
                                        </div>
                                    </Form.Item>
                                </Col>
                            </Row>
                        </>
                    )}
                    <Row gutter={16}>
                        <Col span={18}>
                            <Form.Item
                                name='show_adelanto'
                                label='¿Está ya pagado?'
                                rules={[{ required: true, message: 'Este campo es obligatorio' }]}
                            >
                                <Radio.Group
                                    onChange={(e) => setAdelantoVisible(e.target.value === '3')}
                                >
                                    <Radio.Button value='1'>Si</Radio.Button>
                                    <Radio.Button value='2'>No</Radio.Button>
                                    {mismoVendedor && (
                                        <Radio.Button value='3'>Pago Adelanto</Radio.Button>
                                    )}
                                </Radio.Group>
                            </Form.Item>
                        </Col>
                    </Row>
                    {mismoVendedor && adelantoVisible && (
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name='adelanto_cliente'
                                    label='Adelanto Cliente'
                                >
                                    <InputNumber
                                        prefix='Bs.'
                                        defaultValue={0}
                                        onChange={((e: any) => setAdelantoClienteInput(e))}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    )}
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item
                                name="montoTotal"
                                label="Monto Total"
                            >
                                <Input
                                    prefix='Bs.'
                                    value={totalAmount ?? 0}
                                    readOnly
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item
                                name="saldoCobrar"
                                label="Saldo a Cobrar"
                            >
                                <Input
                                    prefix='Bs.'
                                    readOnly
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>
                {isAdmin && (
                    <Card title="Sucursal" bordered={false} style={{ marginTop: 16 }}>
                        <Row gutter={16}>
                            <Col span={18}>
                                <Form.Item
                                    name="sucursal"
                                    label="Sucursal"
                                    rules={[{ required: true, message: 'Este campo es obligatorio' }]}
                                >
                                    <Select
                                        placeholder="Seleccione una sucursal"
                                        allowClear
                                    >
                                        {sucursals.map((sucursal: any) => (
                                            <Option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
                                                {sucursal.nombre}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>
                )}
                <Form.Item style={{ marginTop: 16 }}>
                    <Button type="primary" htmlType="submit" loading={loading} className='text-mobile-sm xl:text-desktop-sm'>
                        Guardar
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ShippingFormModal;