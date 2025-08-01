import { Select, Button, Form, Input, Modal, message } from "antd";
import { useEffect, useState } from "react";
import { getSellersAPI } from "../../api/seller";
import { getCategoriesAPI, registerCategoryAPI } from "../../api/category";
import { getSucursalsAPI } from "../../api/sucursal";
import VariantInputs from "./VariantInputs";
import { registerVariantAPI } from "../../api/product.ts";
import { saveTempProduct } from '../../utils/storageHelpers';
const ProductFormModal = ({ visible, onCancel, onSuccess ,selectedSeller}: any) => {
    const [loading, setLoading] = useState(false);
    const [sellers, setSellers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState("");
    const [combinations, setCombinations] = useState([]); // matriz final: nombre_variante, nombre_subvariante, precio, stock
    const [branches, setBranches] = useState([]);

    const [form] = Form.useForm();
    const handleFinish = async (productData: any) => {
        const sucursalId = localStorage.getItem("sucursalId");
        if (combinations.length === 0) {
            return message.warning("Debe agregar al menos una variante para el producto.");
        }
        const sucursales = branches.map((b) => ({
            id_sucursal: b._id,
            combinaciones: combinations.map(combo => {
                const variantes: Record<string, string> = {};
                let i = 0;
                while (combo[`varName${i}`] && combo[`var${i}`]) {
                    variantes[combo[`varName${i}`]] = combo[`var${i}`];
                    i++;
                }
                return {
                    variantes,
                    precio: combo.price,
                    stock: b._id === sucursalId ? combo.stock : 0
                };
            })
        }));

        const tempProduct = {
            productData: {
                ...productData,
                id_vendedor: selectedSeller?._id || '', // ⚠️ agrega el id_vendedor
            },
            combinations,
            selectedFeatures: [],
            features: [],
            sucursales
        };
        saveTempProduct(tempProduct);

        message.success("Producto guardado localmente");
        form.resetFields();
        setCombinations([]);
        onCancel();
    };

    const createCategory = async () => {
        if (!newCategory) return;
        setLoading(true);
        const response = await registerCategoryAPI({ categoria: newCategory });
        setLoading(false);
        if (response.status) {
            message.success("Categoría creada con éxito");
            fetchCategories();
            setNewCategory("");
        } else {
            message.error("Error al crear categoría");
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await getSucursalsAPI();
            setBranches(res);
        } catch (error) {
            message.error("Error al obtener las sucursales");
        }
    };

    const fetchSellers = async () => {
        try {
            const response = await getSellersAPI();
            setSellers(response);
        } catch (error) {
            message.error("Error al obtener los vendedores");
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await getCategoriesAPI();
            setCategories(response);
        } catch (error) {
            message.error("Error al obtener las categorías");
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
            width={1000}
        >
            <Form
                form={form}
                name="productForm"
                onFinish={handleFinish}
                layout="vertical"
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                        e.preventDefault();
                    }
                }}
            >
                <Form.Item
                    name="nombre_producto"
                    label="Nombre del Producto"
                    rules={[{ required: true, message: "Por favor ingrese el nombre del producto" }]}
                >
                    <Input placeholder="Nombre del Producto" />
                </Form.Item>

                <p style={{ fontWeight: 600, marginBottom: 10 }}>
                    Vendedor: {selectedSeller?.nombre} {selectedSeller?.apellido}
                </p>

                <Form.Item
                    name="id_categoria"
                    label="Categoría"
                    rules={[{ required: true, message: "Por favor seleccione una categoría" }]}
                >
                    <Select
                        placeholder="Selecciona una categoría"
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
