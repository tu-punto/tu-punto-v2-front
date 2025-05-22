import { Modal, Form, Input, Button, Radio, message } from 'antd';
import { useEffect, useState } from 'react';
import { registerShippingAPI } from '../../api/shipping';
import { updateSubvariantStockAPI } from '../../api/product';

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
                            handleDebt,
                            clearSelectedProducts
                        }: any) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const sucursalId = localStorage.getItem('sucursalId');

    useEffect(() => {
        form.setFieldsValue({
            montoTotal: totalAmount ? totalAmount.toFixed(2) : "0.00",
        });
    }, [totalAmount]);

    const handleFinish = async (values: any) => {
        setLoading(true);
        const tipoPago = parseInt(values.tipoDePago);

        const apiShippingData = {
            tipo_de_pago: tipoPagoMap[tipoPago],
            estado_pedido: "entregado",
            adelanto_cliente: 0,
            pagado_al_vendedor: tipoPago === 3,
            subtotal_qr: (tipoPago === 1 || tipoPago === 4) ? parseFloat(values.montoTotal) / 2 : 0,
            subtotal_efectivo: (tipoPago === 2 || tipoPago === 4) ? parseFloat(values.montoTotal) / 2 : 0,
            id_sucursal: sucursalId,
            cliente: "Sin nombre",
            telefono_cliente: "00000000",
            lugar_entrega: "No especificado",
            observaciones: "",
            costo_delivery: 0,
            cargo_delivery: 0,
        };

        const response = await registerShippingAPI(apiShippingData);
        if (!response.success) {
            message.error("Error al registrar el pedido");
            setLoading(false);
            return;
        }

        message.success("Pedido registrado con éxito");

        const parsedSelectedProducts = selectedProducts.map((product: any) => {
            const [productId] = product.key.split("-"); // si tiene variante: ID-Variante
            return {
                id_producto: productId,
                id_vendedor: product.id_vendedor,
                id_pedido: response.newShipping._id,
                ...product
            };
        });
        console.log("xd");
        console.log("Parsed Selected Products", parsedSelectedProducts);
        await handleDebt(parsedSelectedProducts, response.newShipping.adelanto_cliente);
        await handleSales(response.newShipping, parsedSelectedProducts);
        await actualizarStock(parsedSelectedProducts);
        clearSelectedProducts();
        form.resetFields();
        onSuccess();
        setLoading(false);
    };

    const actualizarStock = async (productos: any[]) => {
        const sucursalId = localStorage.getItem('sucursalId');
        console.log("Aqui llegué", productos);
        for (const prod of productos) {
            if (prod.temporary) continue;

            const {
                id_producto,
                variante,
                subvariante,
                cantidad,
                stockActual
            } = prod;

            if (!variante || !subvariante) {
                console.warn("Producto sin variante/subvariante:", prod);
                continue;
            }

            const nuevoStock = stockActual - cantidad;

            if (nuevoStock < 0) {
                console.warn(`Stock negativo para ${id_producto}: ${nuevoStock}`);
                continue;
            }
            console.log("Aqui estoy");
            await updateSubvariantStockAPI({
                productId: id_producto,
                sucursalId,
                varianteNombre: variante,
                subvarianteNombre: subvariante,
                stock: nuevoStock
            });
        }
    };


    return (
        <Modal
            title="Registrar Venta"
            open={visible}
            onCancel={onCancel}
            footer={null}
        >
            <Form form={form} onFinish={handleFinish} layout="vertical">
                <Form.Item label="Monto Total de la Venta" name="montoTotal">
                    <Input prefix="Bs." readOnly />
                </Form.Item>

                <Form.Item
                    name="tipoDePago"
                    label="Tipo de Pago"
                    rules={[{ required: true, message: "Selecciona un tipo de pago" }]}
                >
                    <Radio.Group>
                        <Radio.Button value="1">{tipoPagoMap[1]}</Radio.Button>
                        <Radio.Button value="2">{tipoPagoMap[2]}</Radio.Button>
                        <Radio.Button value="3">{tipoPagoMap[3]}</Radio.Button>
                        <Radio.Button value="4">{tipoPagoMap[4]}</Radio.Button>
                    </Radio.Group>
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        Registrar
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    );
}

export default SalesFormModal;
