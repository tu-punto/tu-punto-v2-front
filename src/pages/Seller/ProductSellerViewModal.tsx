import { Select, Button, Form, Input, Modal, message, InputNumber } from "antd"
import { useContext, useEffect, useState } from "react"
import { getCategoriesAPI } from "../../api/category"
import { UserContext } from "../../context/userContext";
import { registerVariantAPI } from "../../api/product";
import { createEntryAPI } from "../../api/entry";
import { registerProductAPI } from "../../api/product";
import FormModal from "../../components/FormModal";

const ProductSellerViewModal = ({ visible, onCancel, onSuccess, onAddProduct, selectedSeller, openFromEditProductsModal = false, sellers = [], sucursalId }: any) => {
    const { user }: any = useContext(UserContext);
    const [loading, setLoading] = useState(false)
    const [categories, setCategories] = useState([])
    const [newCategory, setNewCategory] = useState('')
    const [form] = Form.useForm();
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingData, setPendingData] = useState<any>(null);

    useEffect(() => {
        if (visible && openFromEditProductsModal) {
            form.resetFields();
        }
    }, [visible, openFromEditProductsModal]);

    const handleFinish = async (productData: any) => {
        const idVendedor = productData.id_vendedor || selectedSeller?._id;
        console.log("🧪 vendedor:", productData.id_vendedor, selectedSeller?._id, productData);

        if (!idVendedor) {
            message.warning("Debe seleccionar un vendedor antes de registrar el producto.");
            return;
        }

        setPendingData({ ...productData, id_vendedor: idVendedor });
        setShowConfirm(true);
    };

    const submitProductData = async (productData: any) => {
        const sucursalToUse = sucursalId || localStorage.getItem("sucursalId");
        if (!sucursalToUse) {
            message.error("No se ha seleccionado una sucursal válida.");
            return;
        }
        const productPayload = {
            nombre_producto: productData.nombre_producto,
            id_categoria: productData.id_categoria,
            id_vendedor: productData.id_vendedor || selectedSeller?._id,
            esTemporal: true,
            sucursales: [{
                id_sucursal: sucursalToUse,
                combinaciones: [{
                    variantes: { Variante: "Temporal" },
                    precio: productData.precio,
                    stock: productData.cantidad_por_sucursal
                }]
            }]
        };

        const result = await registerProductAPI(productPayload);
        if (!result.success) {
            message.error("Error al registrar el producto temporal");
            return;
        }

        const newProduct = result.newProduct;
        onAddProduct({
            ...newProduct,
            id_producto: newProduct._id, // ✅ IMPORTANTE
            producto: newProduct.nombre_producto,
            precio_unitario: productData.precio,
            cantidad: productData.cantidad_por_sucursal,
            stockActual: productData.cantidad_por_sucursal,
            utilidad: 1,
            esTemporal: true,
            key: newProduct._id + "-0"
        });

        message.success("Producto temporal registrado exitosamente");
        setShowConfirm(false);
        onSuccess();
        form.resetFields();
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
        fetchCategories();
    }, []);
    useEffect(() => {
        if (visible) {
            form.resetFields();
        }
    }, [visible]);

    return (
        <>
            <FormModal
                title="Agregar Producto"
                open={visible}
                onClose={onCancel}
                submitTitle="Registrar Producto"
                onFinish={handleFinish}
                form={form}
            >
                <>
                    {openFromEditProductsModal ? (
                        <Form.Item
                            name="id_vendedor"
                            label="Vendedor"
                            rules={[{ required: true, message: 'Seleccione un vendedor' }]}
                        >
                            <Select
                                placeholder="Selecciona un vendedor"
                                options={sellers.map((s: any) => ({
                                    value: s._id,
                                    label: `${s.nombre} ${s.apellido}`
                                }))}
                                showSearch
                                filterOption={(input, option: any) =>
                                    option.label.toLowerCase().includes(input.toLowerCase())
                                }
                            />
                        </Form.Item>
                    ) : (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                            <span style={{
                                backgroundColor: '#f0f2f5',
                                padding: '6px 12px',
                                borderRadius: 8,
                                fontWeight: 'bold'
                            }}>
                                Vendedor: {selectedSeller?.nombre} {selectedSeller?.apellido}
                            </span>
                        </div>
                    )}
                    <Form.Item
                        name="nombre_producto"
                        label="Nombre del Producto"
                        rules={[{ required: true, message: 'Por favor ingrese el name del producto' }]}
                    >
                        <Input placeholder="Nombre del Producto" />
                    </Form.Item>
                    <Form.Item
                        name="precio"
                        label="Precio del producto"
                        rules={[
                            { required: true, message: 'Por favor ingrese el precio del producto' },
                            { type: 'number', min: 0.01, message: 'El precio debe ser mayor a 0' }
                        ]}
                    >
                        <InputNumber
                            suffix="Bs."
                        />
                    </Form.Item>
                    <Form.Item
                        name="cantidad_por_sucursal"
                        label="Cantidad de ingreso del producto"
                        rules={[
                            { required: true, message: 'Por favor ingrese la cantidad de ingreso del producto' },
                            { type: 'number', min: 1, message: 'Debe ser al menos 1 unidad' }
                        ]}
                    >
                        <InputNumber
                            min={1}
                            parser={value => value ? parseInt(value, 10) : 0}
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
                </>
            </FormModal>
            <Modal
                title="Confirmación"
                open={showConfirm}
                onCancel={() => setShowConfirm(false)}
                onOk={() => {
                    submitProductData(pendingData);
                    setShowConfirm(false);
                }}
                okText="Sí"
                cancelText="Cancelar"
            >
                ¿Está seguro de que desea registrar este producto?
            </Modal>
        </>
    )
};

export default ProductSellerViewModal;
