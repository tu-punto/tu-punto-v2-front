import React, { useEffect, useState } from 'react';
import { Modal, Button, Form, Row, Col, TimePicker, Radio, InputNumber, message } from 'antd';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
import { updateShippingAPI } from '../../api/shipping';

const ShippingStateModal = ({ visible, onClose, onSave, shipping }: any) => {
    const [estadoPedido, setEstadoPedido] = useState(null);
    const [montoCobradoDelivery, setMontoCobradoDelivery] = useState<number>(0);
    const [costoRealizarDelivery, setCostoRealizarDelivery] = useState<number>(0);
    const [loading, setLoading] = useState(false)
    const [form] = Form.useForm();

    // TODO: use constants
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

    useEffect(() => {
        if (shipping) {
            form.setFieldsValue({
                ...shipping,
                fecha_pedido: shipping.fecha_pedido ? dayjs(shipping.fecha_pedido, 'YYYY-MM-DD HH:mm:ss.SSS') : null,
                hora_entrega_acordada: shipping.hora_entrega_acordada ? dayjs(shipping.hora_entrega_acordada, 'YYYY-MM-DD HH:mm:ss.SSS') : null,
                hora_entrega_real: shipping.hora_entrega_real ? dayjs(shipping.hora_entrega_real, 'YYYY-MM-DD HH:mm:ss.SSS') : null,
                hora_final: shipping.hora_final || '',
                observaciones: shipping.observaciones || '',
                telefono_cliente: shipping.telefono_cliente || '',
                monto_total: shipping.monto_total || '',
                pagado_al_vendedor: shipping.pagado_al_vendedor || '',
            });
        }
    }, [shipping, form]);

    const handleFinish = async (shippingStateData: any) => {
        setLoading(true)
        const intTipoPago = parseInt(shippingStateData.tipo_de_pago)
        const intEstadoPedido = parseInt(shippingStateData.estado_pedido)

        let updateShippingInfo = {}

        if (intEstadoPedido == 1) {
            updateShippingInfo = { tipo_de_pago: estadoPedidoMap(intEstadoPedido) }
        }

        if (intEstadoPedido == 2) {
            updateShippingInfo = {
                hora_entrega_acordada: shippingStateData.hora_entrega_acordada,
                estado_pedido: estadoPedidoMap[intEstadoPedido]
            }
        }

        if (intEstadoPedido == 3) {
            updateShippingInfo = {
                cargo_delivery: parseFloat(shippingStateData.cargo_delivery),
                costo_delivery: parseFloat(shippingStateData.costo_delivery),
                estado_pedido: estadoPedidoMap[intEstadoPedido],
                tipo_de_pago: tipoPagoMap[intTipoPago],
                hora_entrega_real: dayjs().utc().subtract(4, 'hours').format('YYYY-MM-DD HH:mm:ss')
            }
        }


        const res = await updateShippingAPI(updateShippingInfo, shipping.id_pedido)
        if (res) {
            message.success('Pedido actualizado')
            onSave()
        } else {
            message.error('Error al actualizar el pedido, inténtelo de nuevo')
        }
        setLoading(false)
    }

    const handleIncrement = (setter: React.Dispatch<React.SetStateAction<number>>, value: number) => {
        setter(prevValue => parseFloat((prevValue + value).toFixed(2)));
    };

    const handleDecrement = (setter: React.Dispatch<React.SetStateAction<number>>, value: number) => {
        setter(prevValue => parseFloat((prevValue - value).toFixed(2)));
    };

    const handleSave = (formData: any) => {
        form.validateFields()
            .then(values => {
                onSave({ ...shipping, ...values });
                onClose();
            })
            .catch(info => {
                console.error('Validate Failed:', info);
            });
    };
    const handleEstadoChange = (e:any) => {
        setEstadoPedido(e.target.value);
    };

    return (
        <Modal
            title={`Estado del pedido ${shipping ? shipping.id_pedido : ''}`}
            open={visible}
            onCancel={onClose}
            footer={[
                <Button key="back" onClick={onClose}>
                    Cancelar
                </Button>,
                <Button
                    key="submit"
                    type="primary"
                    loading={loading}
                    onClick={() => form.submit()}
                >
                    Guardar
                </Button>
            ]}
            centered
            width={500}
        >
            <Form
                form={form}
                layout="vertical"
                name="shipping_info_form"
                onFinish={handleFinish}
            >
                <Row gutter={16}>
                    <Col span={18}>
                        <Form.Item
                            name='estado_pedido'
                            label='Estado Pedido'
                            rules={[{ required: true, message: 'Este campo es obligatorio' }]}
                        >
                            <Radio.Group onChange={handleEstadoChange}>
                                <Radio.Button value='1'>En espera</Radio.Button>
                                <Radio.Button value='2'>Por entregar</Radio.Button>
                                <Radio.Button value='3'>Entregado</Radio.Button>
                            </Radio.Group>
                        </Form.Item>
                    </Col>
                </Row>
                {estadoPedido == '2' && (
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="hora_entrega_acordada"
                                label="Hora de entrega"
                            >
                                <TimePicker format="HH:mm" />
                            </Form.Item>
                        </Col>
                    </Row>
                )}

                {estadoPedido == '3' && (
                    <div>
                        <Row gutter={16}>
                            <Col span={12}>
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
                            <Col span={12}>
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
                                        />
                                        <Button
                                            type="primary"
                                            icon={<PlusOutlined />}
                                            onClick={() => handleIncrement(setCostoRealizarDelivery, 0.01)}
                                            style={{ marginLeft: '8px' }}
                                             className='text-mobile-sm xl:text-desktop-sm'
                                        />
                                        <Button
                                            type="primary"
                                            icon={<MinusOutlined />}
                                            onClick={() => handleDecrement(setCostoRealizarDelivery, 0.01)}
                                            style={{ marginLeft: '8px' }}
                                             className='text-mobile-sm xl:text-desktop-sm'
                                        />
                                    </div>
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={24}>
                                <Form.Item
                                    name='tipo_de_pago'
                                    label='Tipo de pago'
                                >
                                    <Radio.Group>
                                        <Radio.Button value='1'>Transferencia o QR</Radio.Button>
                                        <Radio.Button value='2'>Efectivo</Radio.Button>
                                        <Radio.Button value='3'>Pagado al dueño</Radio.Button>
                                    </Radio.Group>
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>
                )}
            </Form>
        </Modal>
    );
};

export default ShippingStateModal;
