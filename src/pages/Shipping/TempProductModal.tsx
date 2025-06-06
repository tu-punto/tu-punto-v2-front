import { Modal, Form, Input, InputNumber, Select, Button } from 'antd';
import { useEffect, useState } from 'react';
import { getSellersAPI } from '../../api/seller';

const TempProductModal = ({ visible, onCancel, onAddProduct }: any) => {
    const [form] = Form.useForm();
    const [sellers, setSellers] = useState([]);
    const [comision, setComision] = useState(0);

    useEffect(() => {
        if (visible) {
            getSellersAPI().then((data: any) => {
                setSellers(data);
            });
        }
    }, [visible]);

    const handleSellerChange = (vendedorId: string) => {
        const vendedor = sellers.find((s: any) => s._id === vendedorId);
        setComision(vendedor?.comision_porcentual || 0);
        form.setFieldsValue({ id_vendedor: vendedorId });
    };

    const handleFinish = (values: any) => {
        const { nombre_producto, precio_unitario, cantidad, id_vendedor } = values;
        const utilidad = (precio_unitario * cantidad * comision) / 100;

        const newProduct = {
            key: `temp-${Date.now()}`,
            producto: nombre_producto,
            precio_unitario,
            cantidad,
            utilidad,
            esTemporal: true,
            id_vendedor,
        };

        onAddProduct(newProduct);
        form.resetFields();
    };

    return (
        <Modal
            title="Agregar Producto Temporal"
            open={visible}
            onCancel={() => {
                onCancel();
                form.resetFields();
                setComision(0);
            }}
            footer={null}
            destroyOnClose
        >
            <Form layout="vertical" form={form} onFinish={handleFinish}>
                <Form.Item
                    name="id_vendedor"
                    label="Vendedor"
                    rules={[{ required: true, message: 'Seleccione un vendedor' }]}
                >
                    <Select onChange={handleSellerChange} placeholder="Seleccione un vendedor">
                        {sellers.map((v: any) => (
                            <Select.Option key={v._id} value={v._id}>
                                {v.nombre}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="nombre_producto"
                    label="Nombre del producto"
                    rules={[{ required: true, message: 'Ingrese el nombre del producto' }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    name="precio_unitario"
                    label="Precio unitario"
                    rules={[{ required: true, message: 'Ingrese el precio' }]}
                >
                    <InputNumber min={0} prefix="Bs." style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                    name="cantidad"
                    label="Cantidad"
                    rules={[{ required: true, message: 'Ingrese la cantidad' }]}
                >
                    <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" block>
                        Agregar Producto
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default TempProductModal;
