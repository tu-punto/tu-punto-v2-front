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
    addTemporaryProductsToShippingAPI, updateShippingAPI
} from '../../api/shipping';
import { UserOutlined, PhoneOutlined, CommentOutlined } from "@ant-design/icons";
import { useWatch } from 'antd/es/form/Form';

const ShippingInfoModal = ({ visible, onClose, shipping, onSave, sucursals = [] , isAdmin}: any) => {
    const [internalForm] = Form.useForm();
    const [products, setProducts, handleValueChange] = useEditableTable([]);
    const [deletedProducts, setDeletedProducts] = useState<string[]>([]);
    const [totalAmount, setTotalAmount] = useState(0);
    const [adelantoVisible, setAdelantoVisible] = useState(false);
    const [tempModalVisible, setTempModalVisible] = useState(false);
    const [quienPaga, setQuienPaga] = useState<string | null>(null);
    const [montoDelivery, setMontoDelivery] = useState(0);
    const [costoDelivery, setCostoDelivery] = useState(0);
    const [adelantoClienteInput, setAdelantoClienteInput] = useState<number>(0);
    const [isDeliveryPlaceInput, setIsDeliveryPlaceInput] = useState(false);
    const { data } = useProducts();
    const [loading, setLoading] = useState(false);
    const [estadoPedido, setEstadoPedido] = useState('En Espera');
    const [tipoPago, setTipoPago] = useState<string | null>(null);
    const [qrInput, setQrInput] = useState<number>(0);
    const [efectivoInput, setEfectivoInput] = useState<number>(0);
    const [showWarning, setShowWarning] = useState(false);

    const selectedSucursal = sucursals[0]?.nombre?.trim().toLowerCase();
    const lugarEntrega = useWatch('lugar_entrega', internalForm);
    const origenEsIgualADestino = lugarEntrega?.trim()?.toLowerCase() === selectedSucursal;
    const adelantoCliente = useWatch('adelanto_cliente', internalForm) || 0;
    const pagadoAlVendedor = useWatch('pagado_al_vendedor', internalForm); // '3' = Pago Adelanto
    const cargoDelivery = useWatch('cargo_delivery', internalForm) || 0;
    const quienPagaDelivery = useWatch('quien_paga_delivery', internalForm);
    const hideDeliveryFields = quienPagaDelivery === 'tupunto';

    const adelantoValido = pagadoAlVendedor === '3' ? adelantoCliente : 0;
    const deliveryExtra = quienPagaDelivery === 'comprador' ? cargoDelivery : 0;
    const saldoACobrar = totalAmount - adelantoValido + deliveryExtra;


    useEffect(() => {
        if (!visible || !shipping) return;

        internalForm.resetFields();

        const lugar_entrega = sucursals.find(s => s.nombre === shipping.lugar_entrega)
            ? shipping.lugar_entrega
            : 'otro';

        const prefill = {
            cliente: shipping.cliente,
            telefono_cliente: shipping.telefono_cliente,
            lugar_entrega,
            lugar_entrega_input: lugar_entrega === 'otro' ? shipping.lugar_entrega : '',
            fecha_pedido: shipping.fecha_pedido ? dayjs(shipping.fecha_pedido) : null,
            hora_entrega_acordada: shipping.hora_entrega_acordada ? dayjs(shipping.hora_entrega_acordada, 'HH:mm') : null,
            observaciones: shipping.observaciones,
            estado_pedido: shipping.estado_pedido,
            quien_paga_delivery: shipping.quien_paga_delivery,
            cargo_delivery: shipping.cargo_delivery,
            costo_delivery: shipping.costo_delivery,
            adelanto_cliente: shipping.adelanto_cliente,
            pagado_al_vendedor: shipping.pagado_al_vendedor ? '3' : '2',
            tipo_de_pago: shipping.tipo_de_pago || null,
            subtotal_qr: shipping.subtotal_qr || 0,
            subtotal_efectivo: shipping.subtotal_efectivo || 0,
        };

        internalForm.setFieldsValue(prefill);
        setAdelantoVisible(!!shipping.adelanto_cliente);
        setEstadoPedido(shipping.estado_pedido);
        setTipoPago(shipping.tipo_de_pago || null);
        setQrInput(shipping.subtotal_qr || 0);
        setEfectivoInput(shipping.subtotal_efectivo || 0);
        setMontoDelivery(shipping.cargo_delivery || 0);
        setCostoDelivery(shipping.costo_delivery || 0);
        setQuienPaga(shipping.quien_paga_delivery || null);
        setIsDeliveryPlaceInput(lugar_entrega === 'otro');
        if (!origenEsIgualADestino && !shipping.quien_paga_delivery) {
            internalForm.setFieldValue('quien_paga_delivery', 'comprador');
            setQuienPaga('comprador');
        }
        const ventas = [...(shipping.venta || []), ...(shipping.productos_temporales || [])];
        const enriched = ventas.map((p: any) => ({
            ...p,
            key: p._id || `${p.id_producto}-${Object.values(p.variantes || {}).join("-") || "default"}`
        }));
        setProducts(enriched);
    }, [visible, shipping, sucursals]);
    useEffect(() => {
        const estado = shipping?.estado_pedido;
        const tipo = shipping?.tipo_de_pago;
        if (estado) setEstadoPedido(estado);
        if (tipo) setTipoPago(tipo);
    }, [shipping]);
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

    const handleProductSelect = (value: any) => {
        const selectedProduct = data.find((p: any) => p.key === value);
        if (selectedProduct) {
            const key = `${selectedProduct.id_producto}-${Object.values(selectedProduct.variantes || {}).join("-") || "default"}`;
            setProducts((prev: any) => {
                if (!prev.find((p: any) => p.key === key)) {
                    return [...prev, {
                        key,
                        producto: selectedProduct.producto,
                        cantidad: 1,
                        precio_unitario: selectedProduct.precio,
                        utilidad: 1,
                        id_producto: selectedProduct.id_producto,
                        id_vendedor: selectedProduct.id_vendedor,
                        variantes: selectedProduct.variantes,
                        nombre_variante: selectedProduct.producto,
                    }];
                }
                return prev;
            });
        }
    };

    const handleDeleteProduct = (key: any) => {
        setProducts((prev: any) => {
            const toDelete = prev.find((p: any) => p.key === key);
            if (toDelete?.id_venta) setDeletedProducts((prevDels) => [...prevDels, toDelete.id_venta]);
            return prev.filter((p: any) => p.key !== key);
        });
    };

    const handleSave = async (values: any) => {
        const newProducts = products.filter((p: any) => !p.id_venta);
        const existingProducts = products.filter((p: any) => p.id_venta);
        const productosTemporales = newProducts.filter((p: any) => p.esTemporal);
        const sucursalId = localStorage.getItem('sucursalId');
        console.log("🛂 sucursalId:", sucursalId);
        const formattedNewProducts = newProducts.filter((p: any) => !p.esTemporal && p.id_producto?.length === 24)
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
        console.log("🛒 formattedNewProducts:", formattedNewProducts);
        if (formattedNewProducts.length > 0) await registerSalesAPI(formattedNewProducts);
        if (productosTemporales.length > 0) await addTemporaryProductsToShippingAPI(shipping._id, productosTemporales);
        if (existingProducts.length > 0) await updateProductsByShippingAPI(shipping._id, existingProducts);
        if (deletedProducts.length > 0) await deleteProductsByShippingAPI(shipping._id, deletedProducts);

        const updateShippingInfo: any = {
            ...values,
            lugar_entrega: values.lugar_entrega === 'otro' ? values.lugar_entrega_input : values.lugar_entrega,
            fecha_pedido: values.fecha_pedido?.format('YYYY-MM-DD HH:mm:ss'),
            hora_entrega_acordada: values.hora_entrega_acordada
                ? dayjs(values.hora_entrega_acordada).toDate()
                : null,
            pagado_al_vendedor: values.pagado_al_vendedor === '3',
        };

        await updateShippingAPI(updateShippingInfo, shipping._id);
        message.success("Pedido actualizado con éxito");
        onSave();
        onClose();
    };
    //console.log("🛂 isAdmin:", isAdmin);
    useEffect(() => {
        const adelantoValido = pagadoAlVendedor === '3' ? adelantoCliente : 0;
        const deliveryExtra = quienPagaDelivery === 'comprador' ? cargoDelivery : 0;
        const saldo = totalAmount - adelantoValido + deliveryExtra;

        // Setear valores en el formulario visualmente
        internalForm.setFieldValue("saldo_cobrar", saldo);

        if (tipoPago === '1') {
            internalForm.setFieldsValue({ subtotal_qr: saldo });
            setQrInput(saldo);
            setEfectivoInput(0);
        } else if (tipoPago === '2' || tipoPago === '3') {
            internalForm.setFieldsValue({ subtotal_efectivo: saldo });
            setQrInput(0);
            setEfectivoInput(saldo);
        } else if (tipoPago === '4') {
            const mitad = parseFloat((saldo / 2).toFixed(2));
            internalForm.setFieldsValue({
                subtotal_qr: mitad,
                subtotal_efectivo: saldo - mitad
            });
            setQrInput(mitad);
            setEfectivoInput(saldo - mitad);
        }
    }, [totalAmount, pagadoAlVendedor, adelantoCliente, cargoDelivery, quienPagaDelivery, tipoPago]);

    return (
        <Modal
            title={`Detalles del Pedido ${shipping?._id || ''}`}
            open={visible}
            onCancel={onClose}
            footer={null}
            width={800}
        >
            <Form
                form={internalForm}
                layout="vertical"
                onFinish={handleSave}
                disabled={isAdmin === false}
            >
                <Card title="Información del Cliente" bordered={false}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="cliente" label="Nombre Cliente" rules={[{ required: true }]}>
                                <Input prefix={<UserOutlined />} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="telefono_cliente" label="Celular" rules={[{ required: true }]}>
                                <Input prefix={<PhoneOutlined />} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                <Card title="Datos del Pedido" bordered={false} style={{ marginTop: 16 }}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="fecha_pedido" label="Fecha Pedido" rules={[{ required: true }]}>
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="hora_entrega_acordada" label="Hora Entrega">
                                <TimePicker format="HH:mm" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item name="lugar_entrega" label="Lugar de Entrega" rules={[{ required: true }]}>
                                <Select onChange={(value) => setIsDeliveryPlaceInput(value === 'otro')} disabled={!isAdmin}>
                                    {[...sucursals.map(s => ({ value: s.nombre, label: s.nombre })), { value: 'otro', label: 'Otro' }]
                                        .map(opt => (
                                            <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                                        ))}
                                </Select>
                            </Form.Item>
                            {isDeliveryPlaceInput && (
                                <Form.Item
                                    name="lugar_entrega_input"
                                    label="Especifique Lugar de Entrega"
                                    rules={[{ required: true }]}
                                >
                                    <Input placeholder="Especifique Lugar de Entrega" />
                                </Form.Item>
                            )}
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

                <Card title="Productos del Pedido" bordered={false} style={{ marginTop: 16 }}>
                    <EmptySalesTable
                        products={products}
                        onDeleteProduct={isAdmin ? handleDeleteProduct : undefined}
                        onUpdateTotalAmount={setTotalAmount}
                        handleValueChange={handleValueChange}
                        sellers={[]}
                    />
                    {isAdmin && (
                        <div className="flex gap-2 mt-4">
                            <Form.Item name="productos_lista" label="Producto" className="flex-grow">
                                <Select
                                    onChange={handleProductSelect}
                                    placeholder="Selecciona un producto"
                                    showSearch
                                    filterOption={(input, option: any) =>
                                        option?.label?.toLowerCase().includes(input.toLowerCase())
                                    }
                                >
                                    {data.map((product: any) => (
                                        <Select.Option key={product.key} value={product.key} label={product.producto}>
                                            {product.producto}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Button onClick={() => setTempModalVisible(true)}>Agregar Temporal</Button>
                        </div>
                    )}
                </Card>

                <Card title="Detalles del Pago" bordered={false} style={{ marginTop: 16 }}>
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item name="pagado_al_vendedor" label="¿Está ya pagado?">
                                <Radio.Group onChange={(e) => setAdelantoVisible(e.target.value === '3')}>
                                    <Radio.Button value="1">Sí</Radio.Button>
                                    <Radio.Button value="2">No</Radio.Button>
                                    <Radio.Button value="3">Pago Adelanto</Radio.Button>
                                </Radio.Group>
                            </Form.Item>
                        </Col>
                    </Row>

                    {pagadoAlVendedor === '3' && (
                        <Row gutter={16}>
                            <Col span={24}>
                                <Form.Item name="adelanto_cliente" label="Monto Adelanto" rules={[{ required: true }]}>
                                    <InputNumber prefix="Bs." style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                        </Row>
                    )}

                    <Form.Item name="estado_pedido" label="Estado del Pedido" rules={[{ required: true }]}>
                        <Radio.Group value={estadoPedido} disabled>
                            <Radio.Button value="En Espera">En espera</Radio.Button>
                            <Radio.Button value="Entregado">Entregado</Radio.Button>
                        </Radio.Group>
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={24}>
                            {!origenEsIgualADestino && (
                                <Form.Item name="quien_paga_delivery" label="¿Quién paga el delivery?">
                                    <Radio.Group onChange={(e) => setQuienPaga(e.target.value)}>
                                        <Radio.Button value="comprador">Comprador</Radio.Button>
                                        <Radio.Button value="vendedor">Vendedor</Radio.Button>
                                        <Radio.Button value="tupunto">Tu Punto</Radio.Button>
                                    </Radio.Group>
                                </Form.Item>
                            )}

                        </Col>
                    </Row>

                    {quienPaga && (
                        <Row gutter={16}>
                            {!hideDeliveryFields && (
                                <Col span={12}>
                                    <Form.Item name="cargo_delivery" label="Monto cobrado por Delivery">
                                        <InputNumber
                                            prefix="Bs."
                                            value={montoDelivery}
                                            onChange={setMontoDelivery}
                                            style={{ width: '100%' }}
                                        />
                                    </Form.Item>
                                </Col>
                            )}
                            <Col span={12}>
                                <Form.Item name="costo_delivery" label="Costo de realizar el Delivery">
                                    <InputNumber
                                        prefix="Bs."
                                        value={costoDelivery}
                                        onChange={setCostoDelivery}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    )}

                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item label="Saldo a Cobrar">
                                <Input prefix="Bs." readOnly value={Number(internalForm.getFieldValue("saldo_cobrar") || 0).toFixed(2)} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>

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

                            {tipoPago === '1' && (
                                <Row gutter={16}>
                                    <Col span={24}>
                                        <Form.Item label="Subtotal QR" name="subtotal_qr">
                                            <InputNumber prefix="Bs." value={saldoACobrar} readOnly style={{ width: '100%' }} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            )}

                            {tipoPago === '2' && (
                                <Row gutter={16}>
                                    <Col span={24}>
                                        <Form.Item label="Subtotal Efectivo" name="subtotal_efectivo">
                                            <InputNumber prefix="Bs." value={saldoACobrar} readOnly style={{ width: '100%' }} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            )}

                            {tipoPago === '4' && (
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item
                                            label="Subtotal QR"
                                            name="subtotal_qr"
                                            rules={[
                                                { required: true, message: 'Debe ingresar un valor en QR' },
                                                {
                                                    validator: (_, value) =>
                                                        value <= 0
                                                            ? Promise.reject("El monto QR debe ser mayor a 0")
                                                            : value >= saldoACobrar
                                                                ? Promise.reject("El monto QR debe ser menor al total")
                                                                : Promise.resolve()
                                                }
                                            ]}
                                        >
                                            <InputNumber
                                                prefix="Bs."
                                                min={0.1}
                                                max={saldoACobrar - 0.01}
                                                value={qrInput}
                                                onChange={(val) => {
                                                    const qr = val ?? 0;
                                                    setQrInput(qr);
                                                    const efectivo = parseFloat((saldoACobrar - qr).toFixed(2));
                                                    setEfectivoInput(efectivo);
                                                    internalForm.setFieldValue('subtotal_efectivo', efectivo);
                                                }}
                                                style={{ width: '100%' }}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item label="Subtotal Efectivo" name="subtotal_efectivo">
                                            <InputNumber prefix="Bs." value={efectivoInput} readOnly style={{ width: '100%' }} />
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

                {isAdmin && (
                    <Form.Item style={{ marginTop: 16 }}>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            Guardar
                        </Button>
                    </Form.Item>
                )}

                <TempProductModal
                    visible={tempModalVisible}
                    onCancel={() => setTempModalVisible(false)}
                    onAddProduct={(tempProduct: any) => setProducts((prev: any) => [...prev, tempProduct])}
                />
            </Form>
        </Modal>
    );

};

export default ShippingInfoModal;
