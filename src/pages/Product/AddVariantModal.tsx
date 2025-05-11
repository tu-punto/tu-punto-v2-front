import { useEffect } from 'react';
import { Modal, Form, InputNumber, Input, message } from 'antd';
import { createVariantAPI } from '../../api/product'; // Asegúrate de tener este endpoint implementado
import { IProduct } from '../../models/productModel';

interface AddVariantModalProps {
    visible: boolean;
    onCancel: () => void;
    group: {
        id: string;
        name: string;
        product: IProduct;
    };
}

const AddVariantModal = ({ visible, onCancel, group }: AddVariantModalProps) => {
    const [form] = Form.useForm();

    const sucursalId = localStorage.getItem('sucursalId');

    useEffect(() => {
        if (!visible) form.resetFields();
    }, [visible]);

    const onFinish = async (values: any) => {
        if (!sucursalId) {
            return message.error("No se encontró la sucursal en localStorage");
        }
        console.log("Group",group);
        try {
            const res = await createVariantAPI({

                productId: group.product._id,
                sucursalId,
                variant: {
                    nombre_variante: values.nombre_variante,
                    precio: values.precio,
                    stock: values.stock
                }
            });

            if (res?.success) {
                message.success("Variante agregada con éxito");
                onCancel();
            } else {
                message.error("No se pudo agregar la variante");
            }
        } catch (err) {
            message.error("Error al agregar la variante");
            console.error(err);
        }
    };

    return (
        <Modal
            title={`Agregar Variante a "${group.name}"`}
            open={visible}
            onCancel={onCancel}
            onOk={() => form.submit()}
            okText="Agregar"
            cancelText="Cancelar"
        >
            <Form layout="vertical" form={form} onFinish={onFinish}>
                <Form.Item
                    label="Nombre de Variante"
                    name="nombre_variante"
                    rules={[{ required: true, message: 'Este campo es requerido' }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    label="Precio"
                    name="precio"
                    rules={[{ required: true, message: 'Este campo es requerido' }]}
                >
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                    label="Stock"
                    name="stock"
                    rules={[{ required: true, message: 'Este campo es requerido' }]}
                >
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default AddVariantModal;
