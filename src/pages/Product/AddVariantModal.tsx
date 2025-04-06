import { Select, Modal, Form, Input, InputNumber, Button, message } from 'antd';
import { useState, useEffect } from 'react';
import { IBranch } from '../../models/branchModel';
import { getSucursalsAPI } from '../../api/sucursal';
import { addProductFeaturesAPI, registerVariantAPI } from '../../api/product';

const AddVariantModal = ({ visible, onCancel, group }) => {
    const [form] = Form.useForm();

    const example = group.product
    const [sucursals, setSucursals] = useState<IBranch[]>([])
    const [features, setFeatures] = useState(example.features)


    const fetchSucursals = async () => {
        try {
            const response = await getSucursalsAPI();
            setSucursals(response);
        } catch (error) {
            message.error("Error al obtener las sucursales");
        }
    };

    useEffect(() => {
        fetchSucursals()
    }, [])


    const handleFinish = async (values: any) => {
        try {
            const featuresFilter = features.filter((feat: any) => feat.feature !== "")

            const variant = {
                product: {
                    ...values,
                    groupId: group.id,
                    id_categoria: example.id_categoria,
                    id_vendedor: example.id_vendedor,
                    categoria: example.categoria,
                },
                stock: { id_sucursal: values.id_sucursal, cantidad_por_sucursal: values.stock }
            }
            const prodRes = await registerVariantAPI(variant)
            await addProductFeaturesAPI({ id_producto: prodRes.newProduct.id_producto, feats: featuresFilter })
            message.success('Variante agregada con exito')


            form.resetFields();
            onCancel()
        } catch (error) {
            console.error('Failed to add variant:', error);
            message.error('Error al agregar la variante')
        }
    };


    const handleValueChange = (index, value: any) => {
        const newFeatures = [...features];
        newFeatures[index].value = value;
        setFeatures(newFeatures);
    };

    return (
        <Modal
            visible={visible}
            footer={null}
            title="Agregar Nueva Variante"
            onCancel={onCancel}
        >
            <Form form={form} layout="vertical" onFinish={handleFinish}>
                <Form.Item
                    label="Nombre del Producto"
                    name="nombre_producto"
                    rules={[{ required: true, message: 'Por favor ingrese el nombre del producto' }]}
                    initialValue={`${example.nombre_producto || group.name}`}
                >
                    <Input className='text-mobile-sm xl:text-desktop-sm' />
                </Form.Item>
                <Form.Item
                    label="Precio"
                    name="precio"
                    rules={[{ required: true, message: 'Por favor ingrese el precio' }]}
                    initialValue={example.precio}
                >
                    <InputNumber min={0} style={{ width: '100%' }} className='text-mobile-sm xl:text-desktop-sm' />
                </Form.Item>
                <Form.Item
                    label="Cantidad Inicial"
                    name="stock"
                    rules={[{ required: true, message: 'Por favor ingrese la cantidad inicial' }]}
                >
                    <InputNumber min={0} style={{ width: '100%' }} className='text-mobile-sm xl:text-desktop-sm' />
                </Form.Item>
                <Form.Item
                    name='id_sucursal'
                    label="Sucursal"
                    rules={[{ required: true, message: 'Por favor seleccione una sucursal' }]}
                >
                    <Select
                        placeholder='Selecciona una sucursal'
                        options={sucursals.map((branch: any) => ({
                            value: branch.id_sucursal,
                            label: branch.nombre
                        }))}
                        showSearch
                        filterOption={(input, option: any) =>
                            option.label.toLocaleLowerCase().includes(input.toLocaleLowerCase())}
                    />

                </Form.Item>

                <Form.Item
                    label="Características"
                >
                    {example.features.map((feat: any, index: number) => (
                        <div key={index} style={{ display: 'flex', marginBottom: 8 }}>

                            <h3 style={{ margin: 10 }}>{feat.feature}</h3>
                            <Input
                                placeholder="Valor"
                                value={feat.value}
                                style={{ flex: 1 }}
                                onChange={(e) => handleValueChange(index, e.target.value)}
                                className='text-mobile-sm xl:text-desktop-sm'
                            />
                        </div>
                    ))}
                </Form.Item>
                <Form.Item className='text-right'>
                    <Button htmlType='submit' type='primary'>Confirmar</Button>
                </Form.Item>


            </Form>
        </Modal >
    );
};

export default AddVariantModal;
