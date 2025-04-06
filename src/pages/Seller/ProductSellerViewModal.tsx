import { Select, Button, Form, Input, Modal, message, InputNumber } from "antd"
import { useContext, useEffect, useState } from "react"
import { getCategoriesAPI} from "../../api/category"
import { UserContext } from "../../context/userContext";
import { registerVariantAPI } from "../../api/product";
import { createEntryAPI } from "../../api/entry";

const ProductSellerViewModal = ({ visible, onCancel, onSuccess, onAddProduct }: any) => {
    const { user }: any = useContext(UserContext);
    const [loading, setLoading] = useState(false)
    const [categories, setCategories] = useState([])
    const [newCategory, setNewCategory] = useState('')
    const [form] = Form.useForm();

    const handleFinish = async (productData: any) => {
        Modal.confirm({
            title: 'Confirmación',
            content: '¿Está seguro de que desea registrar este producto?',
            okText: 'Sí',
            onOk: () => submitProductData(productData),
        });
    };

    const submitProductData = async (productData: any) => {
        setLoading(true);
        const { nombre_producto, precio, id_categoria, cantidad_por_sucursal } = productData;
        const product = {
            nombre_producto,
            precio,
            id_categoria,
            id_vendedor: user.id,
            groupId: 1, // TODO: Put the "Sin Grupo" id according to the database.
        };
        const stock = {
            id_sucursal: 3, // TODO: Change with the default sucursal
            cantidad_por_sucursal,
        };
        const payload = { product, stock };
        try {
            const response = await registerVariantAPI(payload);
            if (!response.status) {
                message.error('Error al registrar el producto');
                setLoading(false);
                return;
            }
            const entry = {
                id_producto: response.newProduct.id_producto,
                cantidad_ingreso: cantidad_por_sucursal,
                id_vendedor: user.id,
                id_sucursal: 3, // TODO: Change with the default sucursal to store products 
                estado: 'Sin Grupo',
            }
            // TODO: Put this createEntryAPI into the registerVariantAPI to avoid this extra request, be careful with the other requests that use this function.
            const entryResponse = await createEntryAPI(entry);
            if (!entryResponse.status) {
                message.error('Error al registrar el stock del producto');
                setLoading(false);
                return;
            }
            message.success('Producto registrado con éxito');
            form.resetFields();
            onAddProduct({ ...product, key: response.newProduct.id_producto, producto:nombre_producto, 
                cantidad: cantidad_por_sucursal, 
                precio_unitario: precio, 
                utilidad: 1 }); //TODO: Make that the user can't modify the "cantidad" in empty sales table 
            onSuccess(); 
        } catch (error) {
            message.error('Error al registrar el producto');
        } finally {
            setLoading(false);
        }   
    }

    const fetchCategories = async () => {
        try {
            const response = await getCategoriesAPI();
            setCategories(response);
        } catch (error) {
            message.error('Error al obtener las categorías');
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    return (
        <Modal
            title="Agregar Producto"
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={800}
        >
            <Form
                form={form}
                name="productForm"
                onFinish={handleFinish}
                layout="vertical"
            >
                <Form.Item
                    name="nombre_producto"
                    label="Nombre del Producto"
                    rules={[{ required: true, message: 'Por favor ingrese el nombre del producto' }]}
                >
                    <Input placeholder="Nombre del Producto" />
                </Form.Item>
                <Form.Item
                    name="precio"
                    label="Precio del producto"
                    rules={[{ required: true, message: 'Por favor ingrese el precio del producto' }]}
                >
                    <InputNumber
                        suffix="Bs."
                    />
                </Form.Item>
                <Form.Item
                    name="cantidad_por_sucursal"
                    label="Cantidad de ingreso del producto" 
                    rules={[{ required: true, message: 'Por favor ingrese la cantidad de ingreso del producto' }]}
                >
                    <InputNumber
                        min={1}
                        parser={value => value ? parseInt(value, 10) : 0}
                    />
                </Form.Item>
                {/* <Form.Item
                    name='sucursal'
                    label="Sucursal"
                    rules={[{ required: true, message: 'Por favor seleccione una sucursal' }]}
                >
                    <Select
                        placeholder='Selecciona una sucursal'
                        options={branches.map((branch: any) => ({
                            value: branch.id_sucursal,
                            label: branch.nombre
                        }))}
                        showSearch
                        filterOption={(input, option: any) =>
                            option.label.toLocaleLowerCase().includes(input.toLocaleLowerCase())}
                    />

                </Form.Item> */}
                {/* <Form.Item
                    name="id_vendedor"
                    label="Marca"
                    rules={[{ required: true, message: 'Por favor seleccione una marca' }]}
                >
                    <Select
                        placeholder="Selecciona una marca"
                        options={sellers.map((seller: any) => ({
                            value: seller.id_vendedor,
                            label: seller.marca,
                        }))}
                        showSearch
                        filterOption={(input, option: any) =>
                            option.label.toLowerCase().includes(input.toLowerCase())
                        }
                    />
                </Form.Item> */}
                <Form.Item
                    name="id_categoria"
                    label="Categoría"
                    rules={[{ required: true, message: 'Por favor seleccione una categoría' }]}
                >
                    <Select
                        placeholder="Selecciona una categoría"
                        dropdownRender={menu => (
                            <>
                                {menu}
                                <div style={{ display: 'flex', padding: 8 }}>
                                    <Input
                                        style={{ flex: 'auto' }}
                                        value={newCategory}
                                        onChange={e => setNewCategory(e.target.value)}
                                    />
                                </div>
                            </>
                        )}
                        options={categories.map((category: any) => ({
                            value: category.id_categoria,
                            label: category.categoria,
                        }))}
                        showSearch
                        filterOption={(input, option: any) =>
                            option.label.toLowerCase().includes(input.toLowerCase())
                        }
                    />
                </Form.Item>
        
                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} className="text-mobile-sm xl:text-desktop-sm">
                        Registrar Producto
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ProductSellerViewModal;
