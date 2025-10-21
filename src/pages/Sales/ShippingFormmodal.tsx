import { Modal, Form, Input, InputNumber, Button, Radio, Col, Row, DatePicker, TimePicker, Card, message, Select, Switch } from 'antd';
import { UserOutlined, PhoneOutlined, CommentOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import {useEffect, useMemo, useState} from 'react';
import { registerShippingAPI, updateShippingAPI  } from '../../api/shipping';
import { sendMessageAPI } from '../../api/whatsapp';
import { updateSubvariantStockAPI } from '../../api/product';
import { useWatch } from 'antd/es/form/Form';
import { getSucursalsAPI } from "../../api/sucursal";
import { COUNTRY_CODES } from '../../constants/countryCodes';
import ReactCountryFlag from "react-country-flag";
import moment from "moment-timezone";
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import dayjs from 'dayjs';
dayjs.extend(utc);
dayjs.extend(timezone);


function ShippingFormModal({
                               visible, onCancel, onSuccess, selectedProducts,
                               totalAmount, handleSales, sucursals,
                               //handleDebt,
                               clearSelectedProducts, isAdmin,sellers, suc
                           }: any) {
    const branchIdFromProps = suc || localStorage.getItem("sucursalId");
    const [loading, setLoading] = useState(false);
    const [qrInput, setQrInput] = useState<number>(0);
    const [efectivoInput, setEfectivoInput] = useState<number>(0);
    const [adelantoClienteInput, setAdelantoClienteInput] = useState<number>(0);
    const [adelantoVisible, setAdelantoVisible] = useState(false);
    const [isDeliveryPlaceInput, setIsDeliveryPlaceInput] = useState(false);
    const [montoCobradoDelivery, setMontoCobradoDelivery] = useState<number>(0);
    const [costoRealizarDelivery, setCostoRealizarDelivery] = useState<number>(0);
    const [codigoCelular, setCodigoCelular] = useState<number | null>()
    const [estadoPedido, setEstadoPedido] = useState<string | null>(null);
    const [tipoPago, setTipoPago] = useState<string | null>(null);
    const [form] = Form.useForm();
    const [showWarning, setShowWarning] = useState(false);
    const [quienPaga, setQuienPaga] = useState<string | null>(null);
    const [estaPagado, setEstaPagado] = useState<string | null>(null);
    const [isRangeHour, setIsRangeHour] = useState(false);
    const [allSucursals, setAllSucursals] = useState([]);
    const sucursalId = localStorage.getItem('sucursalId');
    const sucursalLogueada = allSucursals.find((s: any) => s._id === sucursalId);
    const sucursalSeleccionada = sucursals.find((s: any) =>
        isAdmin
            ? s._id === localStorage.getItem("sucursalId")
            : s._id === branchIdFromProps
    );
    const nombreSucursal = sucursalSeleccionada?.nombre || '';

    useEffect(() => {
        const fetchSucursals = async () => {
            const res = await getSucursalsAPI();
            if (res.success) setAllSucursals(res.sucursals);
        };
        fetchSucursals();
    }, []);

    const saldoACobrar = useMemo(() => {
        if (estaPagado === "si") return 0;

        const deliveryAdicional = quienPaga === "comprador" ? montoCobradoDelivery : 0;
        return parseFloat((totalAmount - adelantoClienteInput + deliveryAdicional).toFixed(2));
    }, [estaPagado, totalAmount, adelantoClienteInput, montoCobradoDelivery, quienPaga]);
    useEffect(() => {
        if (estaPagado === "si") {
            setQrInput(0);
            setEfectivoInput(0);
            form.setFieldsValue({
                subtotal_qr: 0,
                subtotal_efectivo: 0,
            });
        }
    }, [estaPagado]);

    useEffect(() => {
        if (adelantoClienteInput < 0) {
            message.warning("El adelanto no puede ser negativo.");
            setAdelantoClienteInput(0);
        }

        if (saldoACobrar <= 0) {
            //message.warning("El saldo a cobrar debe ser mayor a 0.");
        }
    }, [adelantoClienteInput, saldoACobrar]);

    useEffect(() => {
        if (tipoPago === '3') {
            setAdelantoClienteInput(0);
            form.setFieldValue("adelanto_cliente", 0);
        }
    }, [tipoPago]);

    useEffect(() => {
        const estado = form.getFieldValue("estado_pedido");

        if (estado === "Entregado") {
            const now = dayjs().tz("America/La_Paz");

            form.setFieldsValue({
                fecha_pedido: now,
                hora_entrega_acordada: now,
            });
        }
    }, [estadoPedido]);

    const hideDeliveryCosts = !isAdmin;
    const hayMultiplesVendedores = useMemo(() => {
        const vendedores = selectedProducts.map((p: any) => p.id_vendedor);
        const unicos = [...new Set(vendedores)];
        return unicos.length > 1;
    }, [selectedProducts]);
    const lugarEntrega = useWatch('lugar_entrega', form);

    const origenEsIgualADestino = useMemo(() => {
        if (!lugarEntrega || !nombreSucursal) return false;

        return lugarEntrega.trim().toLowerCase() === nombreSucursal.trim().toLowerCase();
    }, [lugarEntrega, nombreSucursal]);

    const handleFinish = async (values: any) => {
        //console.log(" selectedProducts:", selectedProducts);
        if (saldoACobrar < 0) {
            message.error("El saldo a cobrar no puede ser menor a 0.");
            setLoading(false);
            return;
        }
        const sucursalId = localStorage.getItem('sucursalId');
        setLoading(true);
        const lugarOrigen = sucursals?.[0]?._id || null;
        const tipoPagoMap: Record<number, string> = {
            1: 'Transferencia o QR',
            2: 'Efectivo',
            3: 'Pagado al dueño',
            4: 'Efectivo + QR'
        };
        try {
            const fechaSeleccionada = values.fecha_pedido?.format("YYYY-MM-DD") || moment().tz("America/La_Paz").format("YYYY-MM-DD");
            const horaSeleccionada = values.hora_entrega_acordada?.format("HH:mm:ss") || "00:00:00";

            const fechaPedido = moment.tz("America/La_Paz").toDate();
            const horaEntregaAcordada = moment.tz(`${fechaSeleccionada} ${horaSeleccionada}`, "America/La_Paz").toDate();
            const horaEntregaReal = moment.tz("America/La_Paz").toDate(); // si querés registrar el momento actual

            const response = await registerShippingAPI({
                ...values,
                telefono_cliente: (codigoCelular) ? codigoCelular + values.telefono_cliente : "",
                fecha_pedido: fechaPedido,
                hora_entrega_acordada: horaEntregaAcordada,
                hora_entrega_real: horaEntregaReal,
                tipo_de_pago: tipoPagoMap[parseInt(values.tipo_de_pago)],
                pagado_al_vendedor: values.esta_pagado === "si" || values.tipo_de_pago === "3",
                id_sucursal: branchIdFromProps,
                lugar_origen: branchIdFromProps,
            });

            if (!response.success) {
                message.error("Error al registrar el pedido");
                setLoading(false);
                return;
            }

            const ventas = selectedProducts.map((p: any) => {
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
                    sucursal: suc || localStorage.getItem("sucursalId"),
                    cantidad: p.cantidad,
                    precio_unitario: p.precio_unitario,
                    utilidad: isNaN(utilidad) || utilidad === 1 ? utilidadCalculada : utilidad,
                    deposito_realizado: false,
                    variantes: p.variantes,
                    nombre_variante: `${p.producto}`,
                    stockActual: p.stockActual,
                    quien_paga_delivery: form.getFieldValue("quien_paga_delivery") || "comprador" // ✅ agregar esto

                };
            });

            if (ventas.length > 0) {
                //await handleDebt(ventas, response.newShipping.adelanto_cliente);
                await handleSales(response.newShipping, ventas);

                // RESTAR STOCK si el estado es "Entregado"
                if (["Entregado", "En Espera"].includes(values.estado_pedido)) {
                    await actualizarStock(ventas);
                }
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
        const sucursalId =  localStorage.getItem('sucursalId');

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
                //console.log("Actualizando stock para:", id_producto, "en sucursal:", sucursalId," variantes ", variantes, "con stock:", nuevoStock);
                const res = await updateSubvariantStockAPI({
                    productId: id_producto,
                    sucursalId: suc || localStorage.getItem("sucursalId"),
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
        if (estado !== undefined) {
            setEstadoPedido(estado?.toString());
        }
        if (pago !== undefined) {
            setTipoPago(pago?.toString());
        }
    }, [form, form.getFieldValue('estado_pedido'), form.getFieldValue('tipo_de_pago')]);

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
                    </Row>
                    <Row gutter={16}>
                        <Col span={6}>
                            <Form.Item name="celular_cliente" label="Celular">
                                <Select
                                    placeholder="Código celular"
                                    allowClear
                                    value={codigoCelular}
                                    onChange={(value) => setCodigoCelular(value)}
                                >
                                    {COUNTRY_CODES.map((codigo) => (
                                        <Select.Option key={codigo.code} value={codigo.code} >
                                            <ReactCountryFlag
                                                countryCode={codigo.flag}
                                                svg
                                                style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    marginRight: '8px',
                                                }}
                                                aria-label={codigo.name}
                                            />
                                            {codigo.name}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="telefono_cliente" label>
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
                    </Row>
                    <Row gutter={16}>
                        <div style={{ margin:8 }}>
                            <span style={{ marginRight:8 }}>
                                - ¿Acordar entrega en un rango de horas?
                            </span>
                            <Switch
                                checked={isRangeHour}
                                onChange={(checked) => { setIsRangeHour(checked); }}
                                unCheckedChildren="Hora específica"
                                checkedChildren="Rango de horas"
                            />
                        </div>
                        <Col span={12}>
                            <Form.Item 
                                name="hora_entrega_acordada" 
                                label={isRangeHour? "Inicio del Rango Horario":"Hora de Entrega"}
                            >
                                <TimePicker format='HH:mm' style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        {isRangeHour && (
                            <Col span={12}>
                                <Form.Item name="hora_entrega_rango_final" label="Fin del Rango Horario">
                                    <TimePicker format='HH:mm' style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                        )}
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
                                        const value = e.target.value;
                                        setEstaPagado(value);
                                        setAdelantoVisible(value === 'adelanto');

                                        if (value !== 'adelanto') {
                                            setAdelantoClienteInput(0);
                                            form.setFieldValue("adelanto_cliente", 0);
                                        }

                                        if (value === 'si') {
                                            setTipoPago("3");
                                            form.setFieldValue("tipo_de_pago", "3");
                                        }
                                    }}
                                >
                                    <Radio.Button value="si">Sí</Radio.Button>
                                    <Radio.Button value="no">No</Radio.Button>
                                    <Radio.Button value="adelanto" disabled={hayMultiplesVendedores}>Pago Adelanto</Radio.Button>
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
                                <Radio.Group onChange={(e) => setEstadoPedido(e.target.value.toString())} value={estadoPedido || "En Espera"}>
                                    <Radio.Button value="En Espera">En espera</Radio.Button>
                                    {isAdmin && <Radio.Button value="Entregado">Entregado</Radio.Button>}
                                </Radio.Group>
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* ¿Quién paga el delivery? */}
                    {lugarEntrega && !origenEsIgualADestino && (
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
                                                const value = e.target.value;
                                                setQuienPaga(value);
                                                form.setFieldValue("quien_paga_delivery", value);

                                                // Recalcular saldo al cambiar a comprador si ya había monto ingresado
                                                if (value === "comprador") {
                                                    setMontoCobradoDelivery(prev => prev); // forzar re-render de saldo
                                                }
                                            }}
                                        >
                                            <Radio.Button value="comprador" disabled={hayMultiplesVendedores}>COMPRADOR</Radio.Button>
                                            <Radio.Button value="vendedor">VENDEDOR</Radio.Button>
                                            <Radio.Button value="tupunto">Tu Punto</Radio.Button>
                                        </Radio.Group>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                {!hideDeliveryCosts && (
                                    <Col span={12}>
                                        <Form.Item
                                            name="costo_delivery"
                                            label="Costo de realizar el Delivery"
                                            rules={[{ required: true }]}
                                        >
                                            <InputNumber
                                                prefix="Bs."
                                                value={costoRealizarDelivery}
                                                onChange={val => setCostoRealizarDelivery(val ?? 0)}
                                                style={{ width: '100%' }}
                                            />
                                        </Form.Item>
                                    </Col>
                                )}
                                {["comprador", "vendedor"].includes(quienPaga || "") && (
                                    <Col span={12}>
                                        <Form.Item
                                            name="cargo_delivery"
                                            label="Monto cobrado por el Delivery"
                                            rules={
                                                (!isAdmin && (quienPaga === 'vendedor' ||quienPaga === 'comprador') )
                                                    ? [] // No requerido si es vendedor (no admin)
                                                    : [{ required: true, message: "Este campo es obligatorio" }]
                                            }
                                        >
                                            <InputNumber
                                                prefix="Bs."
                                                value={montoCobradoDelivery}
                                                onChange={val => setMontoCobradoDelivery(val ?? 0)}
                                                style={{ width: '100%' }}
                                                disabled={!isAdmin}
                                            />
                                        </Form.Item>
                                    </Col>
                                )}
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
                                        <Radio.Group
                                            onChange={(e) => setTipoPago(e.target.value.toString())}
                                            value={tipoPago}
                                            disabled={estaPagado === "si"}
                                        >

                                        <Radio.Button value="1">Transferencia o QR</Radio.Button>
                                            <Radio.Button value="2">Efectivo</Radio.Button>
                                            <Radio.Button value="3">Pagado al dueño</Radio.Button>
                                            <Radio.Button value="4">Efectivo + QR</Radio.Button>
                                        </Radio.Group>
                                    </Form.Item>
                                </Col>
                            </Row>

                            {/* Subtotales */}
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
                                                value={qrInput}
                                                min={0.01}
                                                max={saldoACobrar}
                                                onChange={(val) => {
                                                    const qr = val ?? 0;
                                                    const efectivo = parseFloat((saldoACobrar - qr).toFixed(2));
                                                    setQrInput(qr);
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
