import { Select, Button, Form, Input, Modal, message } from "antd"
import { useEffect, useState } from "react"
import { getSellersAPI } from "../../api/seller"
import { getCategoriesAPI, registerCategoryAPI } from "../../api/category"
import { getFeaturesAPI } from "../../api/feature"
import FeatureInputs from "./FeatureInputs"
import { IBranch } from "../../models/branchModel"
import { getSucursalsAPI } from "../../api/sucursal"

const ProductFormModal = ({ visible, onCancel, onSuccess }: any) => {
    const [loading, setLoading] = useState(false)
    const [sellers, setSellers] = useState([])
    const [categories, setCategories] = useState([])
    const [newCategory, setNewCategory] = useState('')
    const [newFeature, setNewFeature] = useState('')
    const [features, setFeatures] = useState<any[]>([])
    const [selectedFeatures, setSelectedFeatures] = useState([])
    const [featureValues, setFeatureValues] = useState({})
    const [combinations, setCombinations] = useState([])

    const [branches , setBranches] = useState<IBranch[]>([])

    const handleFinish = async (productData: any) => {
        //console.log('Producto a registrar:', productData); // Verás el _idCategoria aquí
        setLoading(true);
        onSuccess(productData, combinations, selectedFeatures, features)
        setLoading(false);
    }

    const createCategory = async () => {
        if (!newCategory) return
        setLoading(true)
        console.log('Creando categoría:', newCategory);
        const response = await registerCategoryAPI({ categoria: newCategory })
        setLoading(false)
        if (response.status) {
            message.success('Categoría creada con éxito')
            fetchCategories()
            setNewCategory('')
        } else {
            message.error('Error al crear categoría')
        }
    }

    const createFeature = () => {
        if (!newFeature) return;
        const newFeatureObj = { id_caracteristicas: Date.now(), feature: newFeature }; // Generar un id temporal
        setFeatures([...features, newFeatureObj]);
        setNewFeature('');
        message.success('Característica agregadatemporalmente');
    };

    const fetchBranches = async () => {
        try {
            const res = await getSucursalsAPI()
            setBranches(res)
        } catch (error) {
            message.error('Error al obtener las sucursales')

        }
    }



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
            console.log('Categorías traídas del backend:', response);
            setCategories(response);
        } catch (error) {
            message.error('Error al obtener las categorías');
        }
    };

    const fetchFeatures = async () => {
        try {
            const res = await getFeaturesAPI();
            setFeatures(res);
        } catch (error) {
            message.error('Error al obtener las características');
        }
    };

    useEffect(() => {
        fetchSellers();
        fetchCategories();
        fetchFeatures();
        fetchBranches();
    }, []);

    const uniqueFeatures = Array.from(new Set(features.map((feature: any) => feature.feature)));

    const filteredOptions = uniqueFeatures.map((label: any) => ({
        label: label,
        value: features.find((feature: any) => feature.feature === label).id_caracteristicas
    }));

    return (
        <Modal
            title="Agregar Producto"
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={800}
        >
            <Form
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
                    name='_idSucursal'
                    label="Sucursal"
                    rules={[{ required: true, message: 'Por favor seleccione una sucursal' }]}
                >
                    <Select
                        placeholder='Selecciona una sucursal'
                        options={branches.map((branch: any) => ({
                            value: branch._id,
                            label: branch.nombre
                        }))}
                        showSearch
                        filterOption={(input, option: any) =>
                            option.label.toLocaleLowerCase().includes(input.toLocaleLowerCase())}
                    />

                </Form.Item>
                <Form.Item
                    name="_idVendedor"
                    label="Vendedor"
                    rules={[{ required: true, message: 'Por favor seleccione un vendedor' }]}
                >
                    <Select
                        placeholder="Selecciona un vendedor"
                        options={sellers.map((seller: any) => ({
                            value: seller._id,
                            label: seller.nombre+" "+seller.apellido, // usa `nombre` si tu modelo de seller lo tiene
                        }))}
                        showSearch
                        filterOption={(input, option: any) =>
                            option.label.toLowerCase().includes(input.toLowerCase())
                        }
                    />
                </Form.Item>

                <Form.Item
                    name="_idCategoria"
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
                                    <Button
                                        type="link"
                                        onClick={createCategory}
                                        loading={loading}
                                    >
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
                <Form.Item
                    name='id_caracteristicas'
                    label='Características'
                >
                    <Select
                        placeholder='Selecciona una característica'
                        mode="multiple"
                        value={selectedFeatures}
                        onChange={setSelectedFeatures}
                        dropdownRender={menu => (
                            <>
                                {menu}
                                <div className="flex p-2">
                                    <Input
                                        className="flex-auto"
                                        value={newFeature}
                                        onChange={e => setNewFeature(e.target.value)}
                                    />
                                    <Button
                                        type="link"
                                        onClick={createFeature}
                                        loading={loading}
                                    >
                                        Añadir característica
                                    </Button>
                                </div>
                            </>
                        )}
                        options={filteredOptions}
                        showSearch
                        filterOption={(input, option: any) =>
                            option.label.toLowerCase().includes(input.toLocaleLowerCase())
                        }
                    />
                </Form.Item>

                <FeatureInputs
                    features={features}
                    selectedFeatures={selectedFeatures}
                    featureValues={featureValues}
                    setFeatureValues={setFeatureValues}
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