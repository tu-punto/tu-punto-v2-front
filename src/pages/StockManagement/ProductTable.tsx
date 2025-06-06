import { useContext, useEffect, useState } from 'react';
import { Button, Input, Table, Spin, Select } from 'antd';
import { InfoCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { UserContext } from '../../context/userContext';
import ProductSearcher from './ProductSearcher';
import AddVariantModal from '../Product/AddVariantModal';
//import ProductInfoModal from '../Product/ProductInfoModal';
import StockPerBranchModal from './StockPerBranchModal';
//import Product from "../Product/Product.tsx";
import { IProduct } from "../../models/productModel.ts";
import { getAllStockByProductIdAPI } from "../../api/product";
import { getCategoryByIdAPI } from '../../api/category';
import PricePerBranchModal from "./PricePerBranchModal.tsx"; // corrige el path si es diferente
import { saveTempStock } from "../../utils/storageHelpers";


interface ProductTableProps {
    productsList: any[];
    groupList: any[];
    onUpdateProducts?: () => Promise<void>;
    setStockListForConfirmModal?: (stockList: any[]) => void; // ← NUEVO
    resetSignal?: boolean;
    searchText: string;
    setSearchText: (value: string) => void;
    selectedCategory: string;
    setSelectedCategory: (value: string) => void;
}

const ProductTable = ({ productsList, groupList, onUpdateProducts, setStockListForConfirmModal, resetSignal, searchText, setSearchText, selectedCategory, setSelectedCategory}: ProductTableProps) => {
    const [ingresoData, setIngresoData] = useState<{ [key: string]: number | '' }>({});
    const [searcher, setSearcher] = useState<any>({});
    const [tableGroup, setTableGroup] = useState<any[]>([]);
    const [updatedProductsList, setUpdatedProductsList] = useState<any[]>([]);

    const { user }: any = useContext(UserContext);
    const isSeller = user?.role === 'seller';

    const [variantModalOpen, setVariantModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    const [infoModalOpen, setInfoModalOpen] = useState(false);
    const [selectedProductInfo, setSelectedProductInfo] = useState<IProduct>(null);
    const [stockModalOpen, setStockModalOpen] = useState(false);
    const [selectedProductoSucursal, setSelectedProductoSucursal] = useState<any[]>([]);
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

    const [categories, setCategories] = useState<any[]>([]);
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await import('../../api/category').then(m => m.getCategoriesAPI());
                setCategories(res);
            } catch (err) {
                console.error("Error al cargar categorías", err);
            }
        };
        fetchCategories();
    }, []);
    useEffect(() => {
        const ingresos = JSON.parse(localStorage.getItem("newStock") || "[]");

        const ingresoObj: { [key: string]: number } = {};
        ingresos.forEach((entry: any) => {
            const key = `${entry.productId}-${entry.sucursalId}-${entry.index}`;
            ingresoObj[key] = entry.stock;
        });

        setIngresoData(ingresoObj);
    }, []);
    useEffect(() => {
        if (resetSignal) {
            setIngresoData({});
        }
    }, [resetSignal]);

    const handleIngresoChange = (key: string, value: number) => {

        setIngresoData((prev) => {
            const updated = { ...prev, [key]: value };

            const newStockArray = Object.entries(updated)
                .filter(([_, stock]) => Number(stock) > 0) // <- ❗solo mayores a 0
                .map(([k, stock]) => {
                const [productId, sucursalId, index] = k.split("-");
                const producto = productsList.find((p) => p._id === productId);
                const sucursal = producto?.sucursales?.find((s) => s.id_sucursal === sucursalId);
                const combinacion = sucursal?.combinaciones?.[index];

                return {
                    product: {
                        _id: producto._id,
                        nombre_producto: producto.nombre_producto,
                        nombre_categoria: producto.nombre_categoria || "Sin categoría",
                        variantes: combinacion?.variantes || {},
                        precio: combinacion?.precio ?? "-",
                        stock: combinacion?.stock ?? "-"
                    },
                    newStock: {
                        productId,
                        sucursalId,
                        index: Number(index),
                        stock: Number(stock),
                    }
                };
            });
            if (setStockListForConfirmModal) {
                setStockListForConfirmModal(newStockArray);
            }

            return updated;
        });

    };

    const openInfoModal = (product: any) => {
        setSelectedProductInfo(product);
        setInfoModalOpen(true);
    };

    const closeInfoModal = () => {
        setSelectedProductInfo(null);
        setInfoModalOpen(false);
    };

    const openVariantModal = (product: any) => {
        setSelectedProduct(product);
        setVariantModalOpen(true);
    };


    const closeVariantModal = () => {
        setSelectedProduct(null);
        setVariantModalOpen(false);
    };
    const [selectedVariantName, setSelectedVariantName] = useState("");
    const [selectedProductForStock, setSelectedProductForStock] = useState<any>(null);
    const handleVariantAdded = async () => {
        if (typeof onUpdateProducts === "function") {
            await onUpdateProducts();
        }
        closeVariantModal();
    };
    const openStockModal = (variantName: string, product: any) => {
        setSelectedVariantName(variantName);
        setSelectedProductForStock(product);
        setStockModalOpen(true);
    };

    const closeStockModal = () => {
        setSelectedVariantName("");
        setSelectedProductForStock(null);
        setStockModalOpen(false);
    };
    const [priceModalOpen, setPriceModalOpen] = useState(false);
    const [selectedProductForPrice, setSelectedProductForPrice] = useState<any>(null);

    const openPriceModal = (variantName: string, product: any) => {
        setSelectedVariantName(variantName);
        setSelectedProductForPrice(product);
        setPriceModalOpen(true);
    };

    const closePriceModal = () => {
        setSelectedVariantName("");
        setSelectedProductForPrice(null);
        setPriceModalOpen(false);
    };

    const groupCriteria = (group: any, products: any[]) => {
        //.log("Tabla productos: ",products );
        //console.log("Tabla Grupo: ",group );
        return products.filter(p => p.id_vendedor === group._id);
    };


    const handleStockUpdate = () => {
        const newStock = [];

        for (const product of updatedProductsList) {
            const ingreso = ingresoData[product._id] || 0;
            if (ingreso > 0) {
                newStock.push({
                    productId: product._id,
                    sucursalId: 3, //
                    stock: ingreso
                });
            }
        }

        //console.log("Datos a enviar a API (mock):", newStock);
        alert("Stock actualizado (simulado)");
        setIngresoData({});
    };
    const groupProductsByBaseName = (products: any[]) => {
        const sucursalId = localStorage.getItem('sucursalId');
        const groups: { [key: string]: any } = {};

        products.forEach((product) => {
            if (selectedCategory !== 'all' && product.id_categoria !== selectedCategory) return;

            const baseName = product.nombre_producto;
            const sucursales = product.sucursales || [];
            const sucursal = sucursales.find((s: any) => s.id_sucursal === sucursalId);
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
                const variant = Object.entries(comb.variantes)
                    .map(([_, v]) => `${v}`)
                    .join(' / ');

                if (
                    searchText &&
                    !baseName.toLowerCase().includes(searchText.toLowerCase()) &&
                    !variant.toLowerCase().includes(searchText.toLowerCase())
                ) return;

                groups[baseName].children.push({
                    ...product,
                    variant,
                    stock: comb.stock,
                    precio: comb.precio,
                    key: `${product._id}-${sucursalId}-${index}`,
                    sucursalData: sucursal,
                });

                groups[baseName].totalStock += comb.stock;
            });
        });

        return Object.values(groups).filter(group => group.children.length > 0);
    };
    const columns = [
        {
            title: "Producto",
            dataIndex: 'nombre_producto',
            key: 'nombre_producto',
            render: (_: any, record: any) => {
                const isNew = record.isNew || record.productOriginal?.isNew;
                return (
                    <>
                        {record.variant ? `→ ${record.nombre_producto} - ${record.variant}` : record.nombre_producto}
                        {isNew && <span style={{ color: '#d4380d', fontWeight: 600, marginLeft: 8 }}>(Nuevo)</span>}
                    </>
                );
            }
        },
        {
            title: 'Stock actual',
            key: 'stock',
            render: (_: any, record: any) => record.variant ? (
                <Button type="link" onClick={() => openStockModal(record.variant, record)}>
                    {record.stock}
                </Button>

            ) : (
                <span>{record.totalStock}</span>
            )

        },
        {
            title: 'Precio Unitario',
            key: 'precio',
            render: (_: any, record: any) => record.variant ? (
                <Button type="link" onClick={() => openPriceModal(record.variant, record)}>
                    {record.precio}
                </Button>
            ) : (
                <span>-</span>
            )
        },
        {
            title: "Ingresos",
            key: "ingresos",
            render: (_: any, record: any) =>
                record.variant ? (
                    <Input
                        value={ingresoData[record.key] ?? ''}
                        onChange={(e) => handleIngresoChange(record.key, Number(e.target.value))}
                        placeholder="Ingresar cantidad"
                        type="number"
                        min={0}
                    />
                ) : null
        },
        {
            title: 'Categoría',
            dataIndex: 'nombre_categoria',
            key: 'nombre_categoria',
            render: (nombre_categoria: any) => nombre_categoria || "Sin categoría"
        },
        {/*
            title: "Info",
            key: "info",
            render: (_: any, record: any) => (
                record.variant && ( // solo mostrar botón en las variantes, no en el grupo principal
                    <Button onClick={() => openInfoModal(record)}>
                        <InfoCircleOutlined />
                    </Button>
                )
            )
        */},
        !isSeller && {
            title: "Agregar Variante",
            key: "addVariant",
            render: (_: any, record: any) => (
                !record.variant && (
                    <Button onClick={(e) => {
                        e.stopPropagation(); // evita que se expanda la fila
                        openVariantModal(record.productOriginal);
                    }}>
                        <PlusOutlined />
                    </Button>

                )
            )
        },

    ].filter(Boolean);


    const changeSearcher = (criteria: any) => {
        setSearcher(criteria);
    };

    const getProductInGroup = (products: any[]) => {
        const newGroupList = groupList.map((group: any) => {
            const groupId = group.id || group._id;
            const groupName =  (group.nombre+" "+group.apellido) || "Sin nombre";

            const productsInGroup = groupCriteria(group, products);

            const sucursalId = (localStorage.getItem('sucursalId') || "0");

            const filtered = productsInGroup.filter(product => {
                const { nombre_producto, id_categoria, sucursal, features } = searcher;

                // Solo productos que contengan variantes de esta sucursal
                const perteneceASucursal = product.sucursales?.some(suc => suc.id_sucursal === sucursalId);
                //console.log("Sucursal ID:", sucursalId);
                //console.log("Sucursal:", product.sucursales);
                //console.log("Pertenece a sucursal:", perteneceASucursal);
                return (
                    perteneceASucursal &&
                    (!nombre_producto || product.nombre_producto.toLowerCase().includes(nombre_producto.toLowerCase())) &&
                    (!id_categoria || product.id_categoria === id_categoria) &&
                    (!features || features.every(feat =>
                        product.features?.some(pf =>
                            pf.feature === feat.key && pf.value.toLowerCase() === feat.value.toLowerCase()
                        )
                    ))
                );
            });


            return { ...group, name: groupName, products: filtered };
        });

        setTableGroup(newGroupList);
    };


    useEffect(() => {
        const fetchStockForProducts = async () => {
            const updatedProducts = await Promise.all(productsList.map(async (product) => {
                if (!product.id_categoria) return { ...product, nombre_categoria: "Sin categoría" };

                try {
                    const categoryRes = getCategoryByIdAPI(product.id_categoria);
                    return { ...product, nombre_categoria: (await categoryRes)?.categoria || "Sin categoría" };
                } catch {
                    return { ...product, nombre_categoria: "Sin categoría" };
                }
            }));

            const sucursalId = localStorage.getItem("sucursalId");

            const newProducts = JSON.parse(localStorage.getItem("newProducts") || "[]");
            const newVariants = JSON.parse(localStorage.getItem("newVariants") || "[]");

            // Agregar productos nuevos locales
            newProducts.forEach((prod: any) => {
                prod.isNew = true;
                updatedProducts.push(prod);
            });

            // Agregar variantes nuevas a productos existentes (solo sucursal actual)
            newVariants.forEach((variant: any) => {
                const base = updatedProducts.find(p => p._id === variant.product?._id || p.product?._id === variant.product?._id);
                if (base) {
                    if (!base.sucursales) base.sucursales = [];
                    const sucursalIndex = base.sucursales.findIndex((s: any) => s.id_sucursal === variant.sucursalId);
                    const combinacionesFiltradas = variant.combinaciones.filter((c: any) => c.stock > 0);
                    if (sucursalIndex !== -1) {
                        base.sucursales[sucursalIndex].combinaciones.push(...combinacionesFiltradas);
                    } else {
                        base.sucursales.push({
                            id_sucursal: variant.sucursalId,
                            combinaciones: combinacionesFiltradas
                        });
                    }
                }
            });

            setUpdatedProductsList(updatedProducts);
            getProductInGroup(updatedProducts);
        };

        if (productsList.length > 0) {
            fetchStockForProducts();
        }
    }, [productsList, groupList, searcher]);
    const loading = updatedProductsList.length === 0;
    return (
        <Spin spinning={loading} tip="Cargando productos...">
            {/*<ProductSearcher applySearcher={changeSearcher} />
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
                <Input
                    placeholder="Buscar producto o variante..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 300 }}
                    allowClear
                />
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
            </div>
            */}
            {tableGroup.length === 0 ? (
                <p>No hay grupos de productos.</p>
            ) : (
                tableGroup.map((group, i) => (
                    <div key={i}>
                        <h2 style={{ textAlign: 'left', marginTop: 30 }}>{group.name}</h2>
                        {group.products.length === 0 ? (
                            <p style={{ color: 'gray' }}>Este grupo no tiene productos.</p>
                        ) : (
                            <Table
                                columns={columns}
                                dataSource={groupProductsByBaseName(group.products)}
                                rowClassName={(record) =>
                                    record.variant && ingresoData[record.key] && ingresoData[record.key] > 0
                                        ? "bg-green-50 border-l-4 border-green-500"
                                        : ""
                                }
                                expandable={{
                                    expandedRowKeys,
                                    onExpand: (expanded, record) => {
                                        setExpandedRowKeys(
                                            expanded
                                                ? [...expandedRowKeys, record.key]
                                                : expandedRowKeys.filter((key) => key !== record.key)
                                        );
                                    },
                                    expandRowByClick: true,
                                }}
                                pagination={{ pageSize: 5 }}
                                rowKey="key"
                            />
                        )}
                    </div>
                ))
            )}

            {/* Modales */}
            <AddVariantModal
                visible={variantModalOpen}
                onCancel={closeVariantModal}
                group={{
                    id: selectedProduct?._id,
                    name: selectedProduct?.nombre_producto,
                    product: selectedProduct
                }}
                onAdd={handleVariantAdded}
            />
            <StockPerBranchModal
                visible={stockModalOpen}
                onClose={closeStockModal}
                variantName={selectedVariantName}
                producto={selectedProductForStock}
            />
            <PricePerBranchModal
                visible={priceModalOpen}
                onClose={closePriceModal}
                variantName={selectedVariantName}
                producto={selectedProductForPrice}
            />
        </Spin>
    );
};

export default ProductTable;
