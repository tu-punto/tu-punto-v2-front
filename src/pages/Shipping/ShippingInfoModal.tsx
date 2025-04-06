import { useEffect, useState } from 'react';
import { Modal, Button, Form, Input, DatePicker, Row, Col, TimePicker, Radio, Select, InputNumber } from 'antd';
import dayjs from 'dayjs';
import { deleteProductsByShippingAPI, getProductByShippingAPI, registerSalesAPI, updateProductsByShippingAPI } from '../../api/sales';
import EmptySalesTable from '../Sales/EmptySalesTable';
import useProducts from '../../hooks/useProducts';
import useEditableTable from '../../hooks/useEditableTable';
import { updateShippingAPI } from '../../api/shipping';

const ShippingInfoModal = ({ visible, onClose, shipping, onSave }: any) => {
    const [adelantoVisible, setAdelantoVisible] = useState(false);
    const [adelantoClienteInput, setAdelantoClienteInput] = useState<number>(0);
    const [cargoDeliveryInput, setCargoDeliveryInput] = useState<number>(0);
    const [products, setProducts, handleValueChange] = useEditableTable([])
    const [totalAmount, setTotalAmount] = useState<number>(0);
    const [deletedProducts, setDeletedProducts] = useState<number[]>([]);
    const [loading, setLoading] = useState(false)

    const { data } = useProducts();
    const [form] = Form.useForm();

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
                // cargo_delivery : shipping.cargo_delivery || '',
                // pagado_al_vendedor: shipping.pagado_al_vendedor || '',
                // adelanto_cliente: shipping.adelanto_cliente || '',
            });
            setCargoDeliveryInput(shipping.cargo_delivery)
            setAdelantoClienteInput(shipping.adelanto_cliente)
            setAdelantoVisible(false)
            if (shipping.adelanto_cliente > 0 || shipping.adelanto_cliente < 0) { setAdelantoVisible(true) }
        }
        if (shipping && shipping.id_pedido) {
            getProductByShippingAPI(shipping.id_pedido).then((data: any[]) => {
                // Asegúrate de que `data` sea un array
                if (Array.isArray(data)) {
                    setProducts(data);
                } else {
                    setProducts([]);
                    console.error('Expected data to be an array', data);
                }
            });
        }
    }, [shipping, form]);
    useEffect(() => {
        const total = totalAmount || 0;
        const adelanto = adelantoClienteInput || 0;
        const delivery = cargoDeliveryInput || 0;
        const saldo_cobrar = (total - adelanto + delivery).toFixed(2);
        if (form.getFieldValue('saldo_cobrar') !== saldo_cobrar) {
            form.setFieldsValue({
                saldo_cobrar: saldo_cobrar,
            });
        }
    }, [totalAmount, adelantoClienteInput, cargoDeliveryInput])

    const handleSave = (shippingInfoData: any) => {
        setLoading(true)
        form.validateFields()
            .then(values => {
                const newProducts = products.filter((product: any) => !product.id_venta);
                const existingProducts = products.filter((product: any) => product.id_venta);

                const formattedExistingProducts = existingProducts.map((product: any) => ({
                    id_venta: product.id_venta,
                    id_producto: product.id_producto,
                    cantidad: product.cantidad,
                    precio_unitario: product.precio_unitario,
                    utilidad: product.utilidad
                }));
                const formattedNewProducts = newProducts.map((product: any) => ({
                    cantidad: product.cantidad,
                    precio_unitario: product.precio_unitario,
                    utilidad: product.utilidad,
                    id_producto: product.key,
                    id_pedido: shipping.id_pedido,
                    id_vendedor: product.id_vendedor,
                    deposito_realizado: false
                }));

                // Actualizar productos existentes
                if (existingProducts.length > 0) {
                    updateProductsByShippingAPI(shipping.id_pedido, formattedExistingProducts).catch((error: any) => {
                        console.error("Error updating products:", error);
                    });
                }
                // Insertar nuevos productos
                if (newProducts.length > 0) {

                    registerSalesAPI(formattedNewProducts).catch((error: any) => {
                        console.error("Error adding new products:", error);
                    });
                }

                // Eliminar productos eliminados
                if (deletedProducts.length > 0) {
                    deleteProductsByShippingAPI(shipping.id_pedido, deletedProducts).catch((error: any) => {
                        console.error("Error deleting products:", error);
                    });
                }
                let updateShippingInfo = {
                    fecha_pedido: (shippingInfoData.fecha_pedido).format('YYYY-MM-DD HH:mm:ss.SSS'),
                    hora_entrega_acordada: (shippingInfoData.hora_entrega_acordada).format('YYYY-MM-DD HH:mm:ss'),
                    observaciones: shippingInfoData.observaciones,
                    telefono_cliente: shippingInfoData.telefono_cliente,
                    lugar_entrega: shippingInfoData.lugar_entrega,
                    pagado_al_vendedor: shipping.pagado_al_vendedor,
                    adelanto_cliente: shipping.adelanto_cliente,
                    cargo_delivery: shippingInfoData.cargo_delivery,
                };
                if (adelantoVisible) {
                    updateShippingInfo.adelanto_cliente = shippingInfoData.adelanto_cliente;
                } if (shippingInfoData.pagado_al_vendedor === '1') {
                    updateShippingInfo.pagado_al_vendedor = true;
                } else { updateShippingInfo.pagado_al_vendedor = false }
                updateShippingAPI(updateShippingInfo, shipping.id_pedido)
                onSave({ ...shipping, ...values });
                onClose();
                setLoading(false)
            })
            .catch(info => {
                console.error('Validate Failed:', info);
            });
    };
    const handleProductSelect = (value: any) => {
        const selectedProduct = data.find((product: any) => product.key === value);
        if (selectedProduct) {
            setProducts((prevProducts: any) => {
                const exists = prevProducts.find((p: any) => p.key === selectedProduct.key);
                if (!exists) {
                    return [...prevProducts, {
                        key: selectedProduct.key, // Usa id_producto como clave única
                        producto: selectedProduct.producto,
                        cantidad: 1,
                        precio_unitario: selectedProduct.precio,
                        utilidad: 1,
                        id_venta: null,
                        id_vendedor: selectedProduct.id_vendedor,
                    }];
                }
                return prevProducts;
            });
        }
    };
    const handleDeleteProduct = (key: any) => {
        setProducts((prevProducts: any) => {
            const updatedProducts = prevProducts.filter((product: any) => product.key !== key);
            const deletedProduct = prevProducts.find((product: any) => product.key === key);
            if (deletedProduct && deletedProduct.id_venta) {
                setDeletedProducts((prevDeleted: any) => [...prevDeleted,
                {
                    id_venta: deletedProduct.id_venta,
                    id_producto: deletedProduct.id_producto

                }
                ]);
            }
            return updatedProducts;
        });
    };
    const updateTotalAmount = (amount: number) => {
        setTotalAmount(amount);
    };

    return (
        <Modal
            title={`Detalles del Pedido ${shipping ? shipping.id_pedido : ''}`}
            open={visible}
            onCancel={onClose}
            footer={[
                <Button key="back" onClick={onClose} className='text-mobile-base xl:text-desktop-base'>
                    Cancelar
                </Button>,
                <Button
                    key="submit"
                    type="primary"
                    loading={loading}
                    onClick={() => form.submit()}
                    className='text-mobile-base xl:text-desktop-base'
                >
                    Guardar
                </Button>
            ]}
            centered
            width={800}
        >
            <Form
                form={form}
                layout="vertical"
                name="shipping_info_form"
                onFinish={handleSave}
            >
                <Row gutter={16}>
                    <Col span={6}>
                        <Form.Item
                            name="fecha_pedido"
                            label="Fecha de la entrega"
                        >
                            <DatePicker format="DD/MM/YYYY" />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item
                            name="hora_entrega_acordada"
                            label="Hora de entrega"
                        >
                            <TimePicker format="HH:mm" />

                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item
                    name="observaciones"
                    label="Comentarios"
                >
                    <Input />
                </Form.Item>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="telefono_cliente"
                            label="Celular"
                        >
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="lugar_entrega"
                            label="Lugar de entrega"
                        >
                            <Input />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={18}>
                        <Form.Item
                            name='pagado_al_vendedor'
                            label='¿Está ya pagado?'
                        >
                            <Radio.Group
                                onChange={(e) => setAdelantoVisible(e.target.value === '3')}
                            >
                                <Radio.Button value='1'>Si</Radio.Button>
                                <Radio.Button value='2'>No</Radio.Button>
                                <Radio.Button value='3'>Pago Adelanto</Radio.Button>
                            </Radio.Group>
                        </Form.Item>
                    </Col>
                </Row>
                {adelantoVisible && (
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name='adelanto_cliente'
                                label='Adelanto Cliente'
                            //initialValue={shipping.adelanto_cliente}
                            >
                                <InputNumber
                                    prefix='Bs.'
                                    onChange={((e: any) => setAdelantoClienteInput(e))}
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                )}
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name='cargo_delivery'
                            label='Cargo Delivery'
                        //initialValue={shipping.cargo_delivery}
                        >
                            <InputNumber
                                prefix='Bs.'
                                onChange={((e: any) => setCargoDeliveryInput(e))}
                                style={{ width: '100%' }}
                            />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item>
                    <EmptySalesTable
                        products={products}
                        onDeleteProduct={handleDeleteProduct}
                        onUpdateTotalAmount={updateTotalAmount}
                        handleValueChange={handleValueChange}
                    />
                </Form.Item>
                <Form.Item
                    name="productos_lista"
                    label="Producto"
                >
                    <Select
                        onChange={(value) => { handleProductSelect(value) }}
                        placeholder="Selecciona un producto"
                        showSearch
                        filterOption={(input, option: any) =>
                            option?.label?.toLowerCase().includes(input.toLowerCase())
                        }
                    >
                        {data.map((product: any) => (
                            <Select.Option key={product.id_producto} value={product.key} label={product.producto}>
                                {product.producto}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item
                    name="saldo_cobrar"
                    label="Saldo a cobrar"
                >
                    <Input
                        prefix='Bs.'
                        readOnly
                        style={{ width: '100%' }}
                    />
                </Form.Item>
            </Form>
        </Modal >
    );
};

export default ShippingInfoModal;
