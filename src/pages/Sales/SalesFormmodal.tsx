import { useEffect, useState } from 'react';
import { Form, Input, Radio, message, InputNumber, Row, Col } from 'antd';
import FormModal from '../../components/FormModal';
import { updateSubvariantStockAPI } from '../../api/product';
import { registerShippingAPI } from '../../api/shipping';

const tipoPagoMap: Record<number, string> = {
    1: 'Transferencia o QR',
    2: 'Efectivo',
    3: 'Pagado al dueño',
    4: 'Efectivo + QR'
};

function SalesFormModal({
    visible,
    onCancel,
    onSuccess,
    selectedProducts,
    totalAmount,
    handleSales,
    //handleDebt,
    clearSelectedProducts,
    sellers,
    suc
}: any) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [tipoPago, setTipoPago] = useState<string | null>(null);
    const [qrInput, setQrInput] = useState<number>(0);
    const [efectivoInput, setEfectivoInput] = useState<number>(0);
    const [showWarning, setShowWarning] = useState(false);
    const branchIdFromProps = suc || localStorage.getItem("sucursalId");
    const sucursalId = localStorage.getItem('sucursalId');
    useEffect(() => {
        form.setFieldsValue({
            montoTotal: totalAmount ? totalAmount.toFixed(2) : "0.00"
        });
    }, [totalAmount]);
    useEffect(() => {
        if (!tipoPago) return;

        const monto = parseFloat(totalAmount || 0);

        if (tipoPago === "1") {
            setQrInput(monto);
            form.setFieldsValue({ subtotal_qr: monto });
        }

        if (tipoPago === "2" || tipoPago === "3") {
            setEfectivoInput(monto);
            form.setFieldsValue({ subtotal_efectivo: monto });
        }

        if (tipoPago === "4") {
            const mitad = parseFloat((monto / 2).toFixed(2));
            setQrInput(mitad);
            setEfectivoInput(mitad);
            form.setFieldsValue({ subtotal_qr: mitad, subtotal_efectivo: mitad });
        }
    }, [tipoPago, totalAmount, form]);
    useEffect(() => {
        const monto = parseFloat(totalAmount || 0);
        const suma = (qrInput || 0) + (efectivoInput || 0);
        if (form.getFieldValue("tipoDePago") === "4") {
            setShowWarning(suma !== monto);
        } else {
            setShowWarning(false);
        }
    }, [qrInput, efectivoInput, form, totalAmount]);

    const handleFinish = async (values: any) => {
        setLoading(true);
        if (showWarning) {
            message.error("La suma QR + Efectivo no es válida. Verifica los montos.");
            setLoading(false);
            return;
        }

        const tipoPagoSeleccionado = parseInt(values.tipoDePago);

        const apiShippingData = {
            tipo_de_pago: tipoPagoMap[tipoPagoSeleccionado],
            estado_pedido: "interno", // 🟡 invisible
            adelanto_cliente: 0,
            pagado_al_vendedor: tipoPagoSeleccionado === 3,
            subtotal_qr: tipoPagoSeleccionado === 1 || tipoPagoSeleccionado === 4 ? (qrInput || totalAmount / 2) : 0,
            subtotal_efectivo: tipoPagoSeleccionado === 2 || tipoPagoSeleccionado === 4 ? (efectivoInput || totalAmount / 2) : 0,
            sucursal: branchIdFromProps,
            lugar_origen: branchIdFromProps,
            cliente: "Sin nombre",
            telefono_cliente: "00000000",
            lugar_entrega: "No aplica",
            observaciones: "Pedido generado automáticamente desde una venta directa",
            costo_delivery: 0,
            cargo_delivery: 0,
        };

        const response = await registerShippingAPI(apiShippingData);
        if (!response.success) {
            message.error("Error al registrar pedido interno");
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
                sucursal: branchIdFromProps,
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
            await actualizarStock(ventas);
        }


        clearSelectedProducts();
        form.resetFields();
        setTipoPago(null);
        setQrInput(0);
        setEfectivoInput(0);
        onSuccess();
        setLoading(false);
    };

    const actualizarStock = async (productos: any[]) => {
        for (const prod of productos) {
            if (prod.esTemporal) continue; // corrige filtro

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
                    sucursalId: sucursalId || branchIdFromProps,
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

    return (
        <FormModal
            title='Registrar Venta'
            open={visible}
            onClose={onCancel}
            submitTitle='Registrar'
            submitDisabled={showWarning}
            submitLoading={loading}
            onFinish={handleFinish}
            form={form}
        >
            <Form.Item label="Monto Total de la Venta" name="montoTotal">
                <Input prefix="Bs." readOnly />
            </Form.Item>
            <Form.Item
                name="tipoDePago"
                label="Tipo de Pago"
                rules={[{ required: true, message: "Selecciona un tipo de pago" }]}
            >
                <Radio.Group onChange={(e) => setTipoPago(e.target.value.toString())}>
                    <Radio.Button value="1">{tipoPagoMap[1]}</Radio.Button>
                    <Radio.Button value="2">{tipoPagoMap[2]}</Radio.Button>
                    <Radio.Button value="3">{tipoPagoMap[3]}</Radio.Button>
                    <Radio.Button value="4">{tipoPagoMap[4]}</Radio.Button>
                </Radio.Group>
            </Form.Item>
            {tipoPago === '1' && (
                <Form.Item label="Subtotal QR" name="subtotal_qr">
                    <InputNumber
                        prefix="Bs."
                        value={totalAmount}
                        readOnly
                        style={{ width: '100%', backgroundColor: '#fffbe6', color: '#000', fontWeight: 'bold' }}
                    />
                </Form.Item>
            )}

            {(tipoPago === '2') && (
                <Form.Item label="Subtotal Efectivo" name="subtotal_efectivo">
                    <InputNumber
                        prefix="Bs."
                        value={totalAmount}
                        readOnly
                        style={{ width: '100%', backgroundColor: '#fffbe6', color: '#000', fontWeight: 'bold' }}
                    />
                </Form.Item>
            )}

            {tipoPago === '4' && (
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item label="Subtotal QR" name="subtotal_qr" rules={[
                            {
                                validator: (_, value) => {
                                    if (value <= 0) return Promise.reject("El monto QR debe ser mayor a 0");
                                    if (value >= totalAmount) return Promise.reject("El monto QR debe ser menor al total");
                                    return Promise.resolve();
                                }
                            }
                        ]}>
                            <InputNumber
                                prefix="Bs."
                                value={qrInput}
                                min={0.01}
                                max={totalAmount - 0.01}
                                onChange={(val) => {
                                    const qr = val ?? 0;
                                    setQrInput(qr);
                                    const efectivo = parseFloat((totalAmount - qr).toFixed(2));
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
                                La suma de QR + Efectivo debe ser igual al monto total.
                            </div>
                        </Col>
                    )}
                </Row>
            )}

        </FormModal>
    )
}

export default SalesFormModal;
