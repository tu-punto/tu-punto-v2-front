import { useContext, useEffect, useState } from 'react';
import { Button, Input, Table } from 'antd';
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


interface ProductTableProps {
    productsList: any[];
    groupList: any[];
}

const ProductTable = ({ productsList, groupList }: ProductTableProps) => {
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
    const handleVariantAdded = (res: any) => {

        setUpdatedProductsList(prev => [...prev, res.newProduct]);
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

    const handleIngresoChange = (productId: number, value: number) => {
        setIngresoData((prev) => ({ ...prev, [productId]: value }));
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

        console.log("Datos a enviar a API (mock):", newStock);
        alert("Stock actualizado (simulado)");
        setIngresoData({});
    };
    const groupProductsByBaseName = (products: any[]) => {
        const sucursalId = localStorage.getItem('sucursalId');
        const groups: { [key: string]: any } = {};

        products.forEach((product) => {
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
                    .map(([k, v]) => `${v}`)
                    .join(' / '); // ejemplo: s / rojo

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

        return Object.values(groups);
    };
    const columns = [
        {
            title: "Producto",
            dataIndex: 'nombre_producto',
            key: 'nombre_producto',
            render: (_: any, record: any) =>
                record.variant ? `→ ${record.nombre_producto} - ${record.variant}` : record.nombre_producto
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
                let nombre_categoria = "Sin categoría";

                try {
                    if (product.id_categoria) {
                        const categoryRes = await getCategoryByIdAPI(product.id_categoria);
                        if (categoryRes.success !== false && categoryRes.categoria) {
                            nombre_categoria = categoryRes.categoria;
                        }
                    }
                } catch (err) {
                    console.error("Error fetching category:", err);
                }

                return {
                    ...product,
                    nombre_categoria,
                };
            }));

            setUpdatedProductsList(updatedProducts);
            getProductInGroup(updatedProducts);
        };


        if (productsList.length > 0) {
            fetchStockForProducts();
        }
    }, [productsList, groupList, searcher]);
    //console.log("Product sucursal:", selectedProductoSucursal);


    return (
        <>
            <ProductSearcher applySearcher={changeSearcher} />


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
                                expandable={{
                                    expandedRowKeys,
                                    onExpand: (expanded, record) => {
                                        setExpandedRowKeys(expanded
                                            ? [...expandedRowKeys, record.key]
                                            : expandedRowKeys.filter(key => key !== record.key));
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
            {/*
            <ProductInfoModal
                visible={infoModalOpen}
                onClose={closeInfoModal}
                product={selectedProductInfo}
            />
            */
            }


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

        </>
    );
};

export default ProductTable;
