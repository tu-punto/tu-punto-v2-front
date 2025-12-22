import { useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { Button, Table, Spin, Select, Input, Switch } from 'antd';
// import { PlusOutlined } from '@ant-design/icons';
import { UserContext } from '../../context/userContext';
import AddVariantModal from '../Product/AddVariantModal';
import StockPerBranchModal from './StockPerBranchModal';
import PricePerBranchModal from "./PricePerBranchModal.tsx";
import { getCategoryByIdAPI } from '../../api/category';
// import { getSucursalsAPI } from "../../api/sucursal";
import { getCategoriesAPI } from "../../api/category";
import { getSellerAPI } from '../../api/seller';
import VariantInfoModal from './VariantInfoModal.tsx';


const ProductTableSeller = ({ productsList, onUpdateProducts, sucursalId , setSucursalId}) => {
    const [updatedProductsList, setUpdatedProductsList] = useState<any[]>([]);
    const [filterAvailableStock, setFilterAvailableStock] = useState(false);
    const [branches, setBranches] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const { user }: any = useContext(UserContext);
    const [searchText, setSearchText] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedProductForList, setSelectedProductForList] = useState<string>('all');
    const [variantModalOpen, setVariantModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [stockModalOpen, setStockModalOpen] = useState(false);
    const [priceModalOpen, setPriceModalOpen] = useState(false);
    const [selectedVariantName, setSelectedVariantName] = useState("");
    const [selectedProductModal, setSelectedProductModal] = useState<any>(null);
    const [showProductInfoModal, setShowProductInfoModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<any>();

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

            const vendedor = await getSellerAPI(user.id_vendedor);

            if (vendedor?.pago_sucursales?.length > 0) {
                const sucursalesPagadas = vendedor.pago_sucursales.map((s: any) => ({
                    _id: s.id_sucursal?._id || s.id_sucursal,
                    nombre: s.sucursalName,
                }));

                setBranches(sucursalesPagadas);
                const isInvalidSucursal = !sucursalId || !sucursalesPagadas.some(s => s._id === sucursalId);
                if (isInvalidSucursal && sucursalesPagadas.length > 0) {
                    setSucursalId(sucursalesPagadas[0]._id);
                }
            }
            const categories = await getCategoriesAPI();
            setCategories(categories);
        };

        if (productsList.length > 0) fetchData();
    }, [productsList]);
    // Memoizar el listado plano de variantes para evitar recálculos costosos
    const flatVariantList = useMemo(() => {
        const list: any[] = [];

        updatedProductsList.forEach((product) => {
            if (selectedCategory !== 'all' && product.id_categoria !== selectedCategory || 
                selectedProductForList !== 'all' && product._id !== selectedProductForList
            ) return;

            const sucursales = product.sucursales?.filter((s: any) => s.id_sucursal?.toString() === sucursalId) || [];

            const variantesAgregadas: any[] = [];

            sucursales.forEach((sucursal: any) => {
                if (!sucursal?.combinaciones) return;

                sucursal.combinaciones.forEach((comb: any, index: number) => {
                    const variant = Object.entries(comb.variantes).map(([_, v]) => v).join(' / ');
                    const nombreLower = product.nombre_producto?.toLowerCase() || '';
                    const variantLower = variant.toLowerCase();

                    if (
                        (filterAvailableStock && comb.stock <= 0) || 
                        searchText &&
                        !nombreLower.includes(searchText.toLowerCase()) &&
                        !variantLower.includes(searchText.toLowerCase())
                    ) return;

                    variantesAgregadas.push({
                        ...product,
                        variant,
                        stock: comb.stock,
                        precio: comb.precio,
                        key: `${product._id}-${sucursal.id_sucursal}-${index}`,
                        esCabecera: false
                    });
                });
            });

            if (variantesAgregadas.length > 0) {
                list.push({
                    ...product,
                    variant: null,
                    key: `cabecera-${product._id}`,
                    esCabecera: true
                });
                list.push(...variantesAgregadas);
            }
        });

        return list;
    }, [updatedProductsList, selectedCategory, selectedProductForList, sucursalId, filterAvailableStock, searchText]);

    const columns = [
        {
            dataIndex: 'isAvailable',
            key: 'isAvailable',
            width: 40,
            render: (_: any, record: any) => {
                if (!record.esCabecera) {
                    const color = record.stock > 0 ? 'bg-green-500' : 'bg-red-500';
                    return {
                        children: <div
                            className={`w-4 h-4 rounded-full ${color}`}
                        />,
                    }
                }

                return {
                    props: {
                        colSpan:0
                    }
                }
            }
        },
        {
            title: "Producto",
            dataIndex: 'nombre_producto',
            key: 'nombre_producto',
            render: (_: any, record: any) => {
                if (record.esCabecera) {
                    return {
                        children: <b style={{ fontSize: '16px' }}>{record.nombre_producto}</b>,
                        props: {
                            colSpan: 5, // Unifica las columnas si querés
                            style: { backgroundColor: '#f0f2f5' }
                        }
                    };
                }

                return `→ ${record.nombre_producto} - ${record.variant}`;
            }
        },
        {
            title: 'Stock actual',
            key: 'stock',
            render: (_: any, record: any) =>
                record.esCabecera
                    ? { children: null, props: { colSpan: 0 } }
                    : <span>{record.stock}</span>
        },
        {
            title: 'Precio Unitario',
            key: 'precio',
            render: (_: any, record: any) =>
                record.esCabecera
                    ? { children: null, props: { colSpan: 0 } }
                    : <span>{record.precio}</span>
        },
        {
            title: "Categoría",
            dataIndex: 'nombre_categoria',
            key: 'nombre_categoria',
            render: (_: any, record: any) =>
                record.esCabecera
                    ? { children: null, props: { colSpan: 0 } }
                    : record.nombre_categoria || "Sin categoría"
        },
    ];

    const handleRowClick = (record: any) => {
        if (!record.esCabecera) {
            setSelectedRecord(record);
            setShowProductInfoModal(true);
        }
    }

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
                <Select
                    value={selectedProductForList}
                    onChange={setSelectedProductForList}
                    style={{ width: 240}}
                >
                    <Select.Option value="all">Todos los productos</Select.Option>
                    {updatedProductsList.map(product => (
                        <Select.Option value={product._id}>
                            {product.nombre_producto}
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
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap'}}>
                    <span>{'Ocultar productos sin stock disponible:'}</span>
                    <Switch
                        checked={filterAvailableStock}
                        onChange={(check: boolean) => {setFilterAvailableStock(check)}}
                    />
                </div>
            </div>
            <Table
                columns={columns}
                dataSource={flatVariantList}
                pagination={{ pageSize: 100 }}
                rowKey="key"
                onRow={(record) => ({
                    onClick: () => handleRowClick(record), 
                })}
            />
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
            <VariantInfoModal
                visible={showProductInfoModal}
                onClose={()=> setShowProductInfoModal(false)}
                rowRecord={selectedRecord}
            />
        </Spin>
    );
};

export default ProductTableSeller;
