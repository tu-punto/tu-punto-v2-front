import { useContext, useEffect, useState } from 'react';
import { Button, Table, Spin, Select, Input } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { UserContext } from '../../context/userContext';
import AddVariantModal from '../Product/AddVariantModal';
import StockPerBranchModal from './StockPerBranchModal';
import PricePerBranchModal from "./PricePerBranchModal.tsx";
import { getCategoryByIdAPI } from '../../api/category';
import { getSucursalsAPI } from "../../api/sucursal";
import { getCategoriesAPI } from "../../api/category";


const ProductTableSeller = ({ productsList, onUpdateProducts }) => {
    const [updatedProductsList, setUpdatedProductsList] = useState<any[]>([]);
    const [sucursalId, setSucursalId] = useState<string>('');
    const [branches, setBranches] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const { user }: any = useContext(UserContext);
    const [searchText, setSearchText] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [categories, setCategories] = useState<any[]>([]);
    const [variantModalOpen, setVariantModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [stockModalOpen, setStockModalOpen] = useState(false);
    const [priceModalOpen, setPriceModalOpen] = useState(false);
    const [selectedVariantName, setSelectedVariantName] = useState("");
    const [selectedProductModal, setSelectedProductModal] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            const updated = await Promise.all(productsList.map(async (product) => {
                if (!product.id_categoria) return { ...product, nombre_categoria: "Sin categoría" };
                try {
                    const res = await getCategoryByIdAPI(product.id_categoria);
                    return { ...product, nombre_categoria: res?.categoria || "Sin categoría" };
                } catch {
                    return { ...product, nombre_categoria: "Sin categoría" };
                }
            }));
            setUpdatedProductsList(updated);

            const branches = await getSucursalsAPI();
            setBranches(branches);
            if (branches.length > 0) setSucursalId(branches[0]._id);

            const categories = await getCategoriesAPI();
            setCategories(categories);
        };

        if (productsList.length > 0) fetchData();
    }, [productsList]);

    const groupProductsByBaseName = (products: any[]) => {
        const groups: { [key: string]: any } = {};

        products.forEach((product) => {
            if (selectedCategory !== 'all' && product.id_categoria !== selectedCategory) return;
            const baseName = product.nombre_producto;
            const sucursal = product.sucursales?.find((s: any) => s.id_sucursal?.toString() === sucursalId);
            if (!sucursal || !sucursal.combinaciones) return;

            if (!groups[baseName]) {
                groups[baseName] = {
                    key: baseName,
                    nombre_producto: baseName,
                    children: [],
                    totalStock: 0,
                    nombre_categoria: product.nombre_categoria,
                    productOriginal: product,
                };
            }

            sucursal.combinaciones.forEach((comb: any, index: number) => {
                const variant = Object.entries(comb.variantes).map(([_, v]) => v).join(' / ');
                if (search && !baseName.toLowerCase().includes(search.toLowerCase()) && !variant.toLowerCase().includes(search.toLowerCase())) return;
                groups[baseName].children.push({
                    ...product,
                    variant,
                    stock: comb.stock,
                    precio: comb.precio,
                    key: `${product._id}-${sucursalId}-${index}`,
                });

                groups[baseName].totalStock += comb.stock;
            });
        });

        return Object.values(groups).filter((group) =>
            group.children.some(child =>
                child.nombre_producto.toLowerCase().includes(searchText.toLowerCase()) ||
                child.variant?.toLowerCase().includes(searchText.toLowerCase())
            )
        );
    };

    const columns = [
        {
            title: "Producto",
            dataIndex: 'nombre_producto',
            key: 'nombre_producto',
            render: (_: any, record: any) => record.variant ? `→ ${record.nombre_producto} - ${record.variant}` : record.nombre_producto
        },
        {
            title: 'Stock actual',
            key: 'stock',
            render: (_: any, record: any) =>
                record.variant ? (
                    <span >{record.stock}</span>
                ) : <span>{record.totalStock}</span>
        },
        {
            title: 'Precio Unitario',
            key: 'precio',
            render: (_: any, record: any) =>
                record.variant ? (
                    <span >{record.precio}</span>
                ) : <span>-</span>
        },

        {
            title: "Categoría",
            dataIndex: 'nombre_categoria',
            key: 'nombre_categoria',
            render: (nombre_categoria: any) => nombre_categoria || "Sin categoría"
        },
    ];

    return (
        <Spin spinning={updatedProductsList.length === 0} tip="Cargando productos...">
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
                <Select
                    value={sucursalId}
                    onChange={setSucursalId}
                    style={{ width: 240 }}
                    placeholder="Seleccionar sucursal"
                >
                    {branches.map(branch => (
                        <Select.Option key={branch._id} value={branch._id}>{branch.nombre}</Select.Option>
                    ))}
                </Select>
                <Select
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                    style={{ width: 240 }}
                >
                    <Select.Option value="all">Todas las categorías</Select.Option>
                    {categories.map(cat => (
                        <Select.Option key={cat._id} value={cat._id}>
                            {cat.categoria}
                        </Select.Option>
                    ))}
                </Select>
                <Input
                    placeholder="Buscar producto o variante..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 300 }}
                    allowClear
                />
            </div>
            {groupProductsByBaseName(updatedProductsList).map((group: any, i: number) => (
                <div key={i}>
                    <h2 style={{ textAlign: 'left', marginTop: 30 }}>{group.nombre_producto}</h2>
                    <Table
                        columns={columns}
                        dataSource={group.children}
                        pagination={{ pageSize: 5 }}
                        rowKey="key"
                    />
                </div>
            ))}

            <AddVariantModal
                visible={variantModalOpen}
                onCancel={() => setVariantModalOpen(false)}
                group={{
                    id: selectedProduct?._id,
                    name: selectedProduct?.nombre_producto,
                    product: selectedProduct
                }}
                onAdd={onUpdateProducts}
            />
            <StockPerBranchModal
                visible={stockModalOpen}
                onClose={() => setStockModalOpen(false)}
                variantName={selectedVariantName}
                producto={selectedProductModal}
            />
            <PricePerBranchModal
                visible={priceModalOpen}
                onClose={() => setPriceModalOpen(false)}
                variantName={selectedVariantName}
                producto={selectedProductModal}
            />
        </Spin>
    );
};

export default ProductTableSeller;
