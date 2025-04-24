import { Select, Modal, Form, Input, InputNumber, Button, message } from 'antd';
import { useState, useEffect } from 'react';
import { IBranch } from '../../models/branchModel';
// import { getSucursalsAPI } from '../../api/sucursal';
// import { addProductFeaturesAPI, registerVariantAPI } from '../../api/product';

interface AddVariantModalProps {
    visible: boolean;
    onCancel: () => void;
    group: any;
}

const AddVariantModal = ({ visible, onCancel, group }: AddVariantModalProps) => {
    const [form] = Form.useForm();

    // Validación para evitar errores si group es undefined
    const example = group?.product || {
        nombre_producto: 'Producto Ejemplo',
        precio: 10,
        id_categoria: 1,
        id_vendedor: 1,
        categoria: 'General',
        features: [
            { feature: 'Color', value: '' },
            { feature: 'Tamaño', value: '' }
        ]
    };

    // MOCK de sucursales (simulación de API)
    const sucursalesMock: IBranch[] = [
        {
            id_sucursal: 1,
            nombre: 'Sucursal Central',
            direccion: 'Av. Ejemplo 123',
            ciudad: 'La Paz',
            telefono: 1234567,
            trabajador: [],
            cierre_caja: []
        },
        {
            id_sucursal: 2,
            nombre: 'Sucursal Sur',
            direccion: 'Calle Falsa 456',
            ciudad: 'La Paz',
            telefono: 7654321,
            trabajador: [],
            cierre_caja: []
        }
    ];


    const [sucursals, setSucursals] = useState<IBranch[]>([]);
    const [features, setFeatures] = useState(example.features || []);

    const fetchSucursals = async () => {
        try {
            // const response = await getSucursalsAPI();
            // setSucursals(response);
            setSucursals(sucursalesMock); // Usamos mock
        } catch (error) {
            message.error("Error al obtener las sucursales");
        }
    };

    useEffect(() => {
        fetchSucursals();
    }, []);

    const handleFinish = async (values: any) => {
        try {
            const featuresFilter = features.filter((feat: any) => feat.feature !== "");

            const variant = {
                product: {
                    ...values,
                    groupId: group?.id || 123,
                    id_categoria: example.id_categoria,
                    id_vendedor: example.id_vendedor,
                    categoria: example.categoria,
                },
                stock: {
                    id_sucursal: values.id_sucursal,
                    cantidad_por_sucursal: values.stock
                }
            };

            console.log("Variante a registrar (simulado):", variant);
            console.log("Features a agregar (simulado):", featuresFilter);

            // const prodRes = await registerVariantAPI(variant);
            // await addProductFeaturesAPI({
            //     id_producto: prodRes.newProduct.id_producto,
            //     feats: featuresFilter
            // });

            message.success('Variante agregada con éxito (simulado)');
            form.resetFields();
            onCancel();
        } catch (error) {
            console.error('Failed to add variant:', error);
            message.error('Error al agregar la variante');
        }
    };

    const handleValueChange = (index: number, value: string) => {
        const newFeatures = [...features];
        newFeatures[index].value = value;
        setFeatures(newFeatures);
    };

    return (
        <Modal
            open={visible}
            footer={null}
            title="Agregar Nueva Variante"
            onCancel={onCancel}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleFinish}
                initialValues={{
                    nombre_producto: example.nombre_producto || group?.name,
                    precio: example.precio
                }}
            >
                <Form.Item
                    label="Nombre del Producto"
                    name="nombre_producto"
                    rules={[{ required: true, message: 'Por favor ingrese el nombre del producto' }]}
                >
                    <Input className="text-mobile-sm xl:text-desktop-sm" />
                </Form.Item>

                <Form.Item
                    label="Precio"
                    name="precio"
                    rules={[{ required: true, message: 'Por favor ingrese el precio' }]}
                >
                    <InputNumber min={0} style={{ width: '100%' }} className="text-mobile-sm xl:text-desktop-sm" />
                </Form.Item>

                <Form.Item
                    label="Cantidad Inicial"
                    name="stock"
                    rules={[{ required: true, message: 'Por favor ingrese la cantidad inicial' }]}
                >
                    <InputNumber min={0} style={{ width: '100%' }} className="text-mobile-sm xl:text-desktop-sm" />
                </Form.Item>

                <Form.Item
                    name="id_sucursal"
                    label="Sucursal"
                    rules={[{ required: true, message: 'Por favor seleccione una sucursal' }]}
                >
                    <Select
                        placeholder="Selecciona una sucursal"
                        options={sucursals.map((branch) => ({
                            value: branch.id_sucursal,
                            label: branch.nombre
                        }))}
                        showSearch
                        filterOption={(input, option: any) =>
                            option?.label?.toLowerCase().includes(input.toLowerCase())
                        }
                    />
                </Form.Item>


                <Form.Item label="Características">
                    {features.map((feat: any, index: number) => (
                        <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ minWidth: '100px' }}><b>{feat.feature}:</b></span>
                            <Input
                                placeholder="Valor"
                                value={feat.value}
                                onChange={(e) => handleValueChange(index, e.target.value)}
                                className="text-mobile-sm xl:text-desktop-sm"
                            />
                        </div>
                    ))}
                </Form.Item>

                <Form.Item className="text-right">
                    <Button type="primary" htmlType="submit">Confirmar</Button>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default AddVariantModal;
