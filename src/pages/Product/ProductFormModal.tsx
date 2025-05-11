import { Select, Button, Form, Input, Modal, message } from "antd";
import { useEffect, useState } from "react";
import { getSellersAPI } from "../../api/seller";
import { getCategoriesAPI, registerCategoryAPI } from "../../api/category";
import { IBranch } from "../../models/branchModel";
import { getSucursalsAPI } from "../../api/sucursal";
import SucursalVariantsForm from "./SucursalVariantsForm"; // Nuevo subcomponente
import VariantInputs from "./VariantInputs";
import {registerVariantAPI} from "../../api/product.ts";

const ProductFormModal = ({ visible, onCancel, onSuccess }: any) => {
    const [loading, setLoading] = useState(false);
    const [sellers, setSellers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState('');
    const [combinations, setCombinations] = useState([]); // Variantes generadas por sucursal
    const [branches, setBranches] = useState<IBranch[]>([]);
    const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
    const [variantValues, setVariantValues] = useState<any>({});

    const [form] = Form.useForm();

    const handleFinish = async (productData: any) => {
        setLoading(true);
        try {
            const sucursalesMap: any = {};

            combinations.forEach(({ branchId, variant, stock, price }) => {
                if (!sucursalesMap[branchId]) {
                    sucursalesMap[branchId] = [];
                }
                sucursalesMap[branchId].push({ nombre_variante: variant, stock, precio: price });
            });

            const sucursales = Object.entries(sucursalesMap).map(([id_sucursal, variantes]: any) => ({
                id_sucursal,
                variantes
            }));

            const finalData = {
                ...productData,
                sucursales
            };

            console.log("Datos enviados a API:", finalData);

            const response = await registerVariantAPI({ product: finalData });

            if (response.success) {
                message.success("Producto registrado correctamente");
                form.resetFields();
                setCombinations([]);
                setSelectedBranches([]);
                onSuccess();
                onCancel();
            } else {
                message.error(response.message || "Error al registrar el producto");
            }

        } catch (err) {
            message.error("Error inesperado");
        } finally {
            setLoading(false);
        }
    };




    const createCategory = async () => {
        if (!newCategory) return;
        setLoading(true);
        const response = await registerCategoryAPI({ categoria: newCategory });
        setLoading(false);
        if (response.status) {
            message.success('Categoría creada con éxito');
            fetchCategories();
            setNewCategory('');
        } else {
            message.error('Error al crear categoría');
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await getSucursalsAPI();
            setBranches(res);
        } catch (error) {
            message.error('Error al obtener las sucursales');
        }
    };

    const fetchSellers = async () => {
        try {
            const response = await getSellersAPI();
            setSellers(response);
        } catch (error) {
            message.error('Error al obtener los vendedores');
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await getCategoriesAPI();
            setCategories(response);
        } catch (error) {
            message.error('Error al obtener las categorías');
        }
    };

    useEffect(() => {
        fetchSellers();
        fetchCategories();
        fetchBranches();
    }, []);

    return (
        <Modal
            title="Agregar Producto"
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={900}
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
                    name="id_vendedor"
                    label="Vendedor"
                    rules={[{ required: true, message: 'Por favor seleccione un vendedor' }]}
                >
                    <Select
                        placeholder="Selecciona un vendedor"
                        options={sellers.map((seller: any) => ({
                            value: seller._id,
                            label: `${seller.nombre} ${seller.apellido}`,
                        }))}
                        showSearch
                        filterOption={(input, option: any) =>
                            option.label.toLowerCase().includes(input.toLowerCase())
                        }
                    />
                </Form.Item>

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
                                    <Button type="link" onClick={createCategory} loading={loading}>
                                        Añadir categoría
                                    </Button>
                                </div>
                            </>
                        )}
                        options={categories.map((category: any) => ({
                            value: category._id,
                            label: category.categoria,
                        }))}
                        showSearch
                        filterOption={(input, option: any) =>
                            option.label.toLowerCase().includes(input.toLowerCase())
                        }
                    />
                </Form.Item>

                <VariantInputs
                    branches={branches}
                    selectedBranches={selectedBranches}
                    setSelectedBranches={setSelectedBranches}
                    variantValues={variantValues}
                    setVariantValues={setVariantValues}
                    combinations={combinations}
                    setCombinations={setCombinations}
                />


                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        Registrar Producto
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ProductFormModal;
