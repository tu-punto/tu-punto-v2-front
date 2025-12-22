import { useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {Button, Input, Table, Spin, Select, message} from 'antd';
import { InfoCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { UserContext } from '../../context/userContext';
import ProductSearcher from './ProductSearcher';
import AddVariantModal from '../Product/AddVariantModal';
import StockPerBranchModal from './StockPerBranchModal';
import { IProduct } from "../../models/productModel.ts";
import { getCategoryByIdAPI } from '../../api/category';
import PricePerBranchModal from "./PricePerBranchModal.tsx"; // corrige el path si es diferente
import { saveTempStock } from "../../utils/storageHelpers";
import { reconstructProductFromFlat, fetchFullProductById } from "../../utils/storageHelpers";


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
    selectedSeller;
    onShowVariantModal?: (product: any) => void;
    sellersVigentes: any[];
}

const ProductTable = ({ productsList, groupList, onUpdateProducts, setStockListForConfirmModal, resetSignal, searchText, setSearchText, selectedCategory, setSelectedCategory, selectedSeller, onShowVariantModal, sellersVigentes}: ProductTableProps) => {
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
    const handleIngresoChange = useCallback((key: string, value: number) => {
        setIngresoData((prev) => {
            const updated = { ...prev, [key]: value };

            const newStockArray = Object.entries(updated)
                .filter(([_, stock]) => Number(stock) !== 0)
                .map(([k, stock]) => {
                    const [productId, sucursalId] = k.split("-");
                    const producto = productsList.find(p => `${p._id}-${p.sucursalId}-${p.variante || 'base'}` === k);

                    return {
                        product: {
                            _id: producto._id,
                            nombre_producto: producto.nombre_producto,
                            nombre_categoria: producto.categoria || "Sin categoría",
                            variantes: producto.variantes_obj || producto.variantes || producto.variant || {},
                            precio: producto.precio ?? "-",
                            stock: producto.stock ?? "-"
                        },
                        newStock: {
                            productId,
                            sucursalId,
                            stock: Number(stock)
                        }
                    };
                });

            if (setStockListForConfirmModal) {
                setStockListForConfirmModal(newStockArray);
            }

            return updated;
        });
    }, [productsList, setStockListForConfirmModal]);

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
    const openStockModal = async (variantName: string, product: any) => {
        const fullProduct = await fetchFullProductById(product._id);
        if (!fullProduct) {
            message.error("No se pudo obtener el producto completo");
            return;
        }

        setSelectedVariantName(variantName);
        setSelectedProductForStock(fullProduct);
        setStockModalOpen(true);
    };

    const closeStockModal = () => {
        setSelectedVariantName("");
        setSelectedProductForStock(null);
        setStockModalOpen(false);
    };
    const [priceModalOpen, setPriceModalOpen] = useState(false);
    const [selectedProductForPrice, setSelectedProductForPrice] = useState<any>(null);

    const openPriceModal = async (variantName: string, flatProduct: any) => {
        const product = await fetchFullProductById(flatProduct._id);

        if (!product) {
            return message.error("No se pudo obtener el producto completo");
        }

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
            const key = `${product._id}-${product.sucursalId}`;
            const ingreso = ingresoData[key] || 0;
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
    // Memoizar la función de agrupamiento para evitar recrearla en cada render
    const groupProductsByBaseName = useCallback((products: any[]) => {
        const groups: { [key: string]: any } = {};

        products.forEach((product) => {
            if (selectedCategory !== 'all' && product.id_categoria !== selectedCategory) return;

            const baseName = product.nombre_producto;

            const searchWords = searchText.split(" ");
            const specialChars = /[!@#$%^&*?:{}|<>]/
            let nombreMatch = true;
            let varianteMatch = true;
            for (const word of searchWords) {
                if (specialChars.test(word)) continue
                nombreMatch = nombreMatch && baseName?.toLowerCase().includes(word.toLowerCase());
                varianteMatch = varianteMatch && product.variant?.toLowerCase().includes(word.toLowerCase());
            }

            if (searchText && !nombreMatch && !varianteMatch) return;

            if (!groups[baseName]) {
                groups[baseName] = {
                    key: baseName,
                    nombre_producto: baseName,
                    children: [],
                    totalStock: 0,
                    nombre_categoria: product.nombre_categoria,
                    productOriginal: product
                };
            }

            groups[baseName].children.push(product);
            groups[baseName].totalStock += product.stock;
        });

        return Object.values(groups);
    }, [selectedCategory, searchText]);


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
                        disabled={!selectedSeller}
                        title={!selectedSeller ? "Seleccione un vendedor para habilitar" : undefined}
                        onWheel={(e) => e.currentTarget.blur()} // ⛔️ Evita que el scroll afecte el input
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
            render: (_: any, record: any) =>
                !record.variant && (
                    <Button
                        onClick={(event) => {
                            event.stopPropagation();
                            onShowVariantModal?.(record.productOriginal);
                        }}
                        disabled={!selectedSeller}
                        title={!selectedSeller ? "Seleccione un vendedor para habilitar" : undefined}
                    >
                        <PlusOutlined />
                    </Button>
                )
        },

    ].filter(Boolean);


    const changeSearcher = (criteria: any) => {
        setSearcher(criteria);
    };


    useEffect(() => {
        const sucursalId = localStorage.getItem("sucursalId");

        // Base: productos que vienen desde el backend optimizado
        const updatedProducts = productsList
            .filter(p => p.sucursalId === sucursalId)
            .map(p => ({
                ...p,
                key: `${p._id}-${p.sucursalId}-${p.variante || 'base'}`,
                variant: p.variante,
                nombre_categoria: p.categoria
            }));

        // Nuevos productos creados desde el frontend
        const newProducts = JSON.parse(localStorage.getItem("newProducts") || "[]");
        newProducts.forEach((prod: any) => {
            prod.isNew = true;
            updatedProducts.push(prod);
        });

        // Nuevas variantes locales: las agregamos como si fueran combinaciones nuevas del producto base
        const newVariants = JSON.parse(localStorage.getItem("newVariants") || "[]");
        newVariants.forEach((variant: any) => {
            const base = updatedProducts.find(p =>
                p._id === variant.product?._id || p.product?._id === variant.product?._id
            );
            if (base) {
                const combinacionesFiltradas = variant.combinaciones.filter((c: any) => c.stock > 0);
                combinacionesFiltradas.forEach((combo: any) => {
                    updatedProducts.push({
                        ...base,
                        key: `${base._id}-${variant.sucursalId}-${combo.variantes.Tipo}-${combo.variantes.Color}`,
                        variant: Object.values(combo.variantes).join(" / "),
                        precio: combo.precio,
                        stock: combo.stock,
                        isNew: true
                    });
                });
            }
        });

        setUpdatedProductsList(updatedProducts);
        const lowerSearch = searchText.toLowerCase();

        const filteredProducts = updatedProducts.filter(product => {
            const nombre = product.nombre_producto?.toLowerCase() || "";
            const variante = product.variant?.toLowerCase() || "";
            return (
                lowerSearch === "" ||
                nombre.includes(lowerSearch) ||
                variante.includes(lowerSearch)
            );
        });

        const idsVigentes = new Set(sellersVigentes.map(v => String(v._id)));

        const groupedByVendedor = filteredProducts.reduce((acc, product) => {
            const idVendedor = String(product.id_vendedor);
            if (!idsVigentes.has(idVendedor)) return acc; // ❌ filtra vendedor no vigente

            const vendedor = product.vendedor || "Sin vendedor";
            if (!acc[vendedor]) acc[vendedor] = [];
            acc[vendedor].push(product);
            return acc;
        }, {} as Record<string, any[]>);

        const groups = Object.entries(groupedByVendedor).map(([vendedor, products]) => ({
            name: vendedor,
            products
        }));
        setTableGroup(groups);


    }, [productsList]);

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
            {tableGroup
                .filter(group => group.products && group.products.length > 0)
                .map((group, i) => {
                    const groupedProducts = groupProductsByBaseName(group.products);

                    if (groupedProducts.length === 0) return null;

                    return (
                        <div key={i}>
                            <h2 style={{ textAlign: 'left', marginTop: 30, display: 'flex', alignItems: 'center', gap: 8 }}>
                                {group.name}
                                <span style={{
                                    backgroundColor: "#f0f0f0",
                                    borderRadius: "12px",
                                    padding: "2px 10px",
                                    fontSize: "0.8rem",
                                    fontWeight: 500
                                }}>
            {group.products.reduce((sum, p) => sum + (p.stock ?? 0), 0)}
          </span>
                            </h2>

                            <Table
                                columns={columns}
                                dataSource={groupedProducts}
                                rowClassName={(record) =>
                                    record.variant && ingresoData[record.key] && ingresoData[record.key] !== 0
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
                                pagination={{
                                    pageSize: 10,
                                    showSizeChanger: true,
                                    pageSizeOptions: ['5', '10', '20', '50'],
                                    showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} productos`
                                }}
                                rowKey="key"
                            />
                        </div>
                    );
                })}

            {tableGroup.filter(group => group.products && group.products.length > 0).length === 0 && (
                <p>No hay grupos de productos.</p>
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
                onRefresh={onUpdateProducts}
            />
        </Spin>
    );
};

export default ProductTable;
