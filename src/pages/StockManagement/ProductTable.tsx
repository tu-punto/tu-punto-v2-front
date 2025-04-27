import { useContext, useEffect, useState } from 'react';
import { Button, Input, Table } from 'antd';
import { InfoCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { UserContext } from '../../context/userContext';
import ProductSearcher from './ProductSearcher';
import AddVariantModal from '../Product/AddVariantModal';
import ProductInfoModal from '../Product/ProductInfoModal';
import Product from "../Product/Product.tsx";
import { IProduct } from "../../models/productModel.ts";
import { getAllStockByProductIdAPI } from "../../api/product";
import { getCategoryByIdAPI } from '../../api/category'; // corrige el path si es diferente


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
        const groups: { [key: string]: any } = {};

        products.forEach((product) => {
            const [baseName, ...variantParts] = product.nombre_producto.split(' / ');
            const variant = variantParts.join(' / ') || null;

            if (!groups[baseName]) {
                groups[baseName] = {
                    key: baseName,
                    nombre_producto: baseName,
                    children: [],
                    totalStock: 0,
                    precio: product.precio,
                    nombre_categoria: product.nombre_categoria,
                };
            }

            const stock = Array.isArray(product.producto_sucursal)
                ? product.producto_sucursal.reduce((acc, suc) => acc + (suc.cantidad_por_sucursal || 0), 0)
                : 0;

            groups[baseName].children.push({
                ...product,
                variant,
                stock,
                key: product._id, // clave única para cada variante
            });

            groups[baseName].totalStock += stock;
        });

        return Object.values(groups);
    };

    const columns = [
        {
            title: "Producto",
            dataIndex: 'nombre_producto',
            key: 'nombre_producto',
            render: (_: any, record: any) => record.variant ? `→ ${record.variant}` : record.nombre_producto
        },
        {
            title: 'Stock actual',
            key: 'stock',
            render: (_: any, record: any) => record.variant
                ? record.stock // si es variante muestra stock individual
                : record.totalStock // si es grupo principal muestra total
        },
        {
            title: 'Precio Unitario',
            dataIndex: 'precio',
            key: 'precio',
        },
        {
            title: 'Categoría',
            dataIndex: 'nombre_categoria',
            key: 'nombre_categoria',
            render: (nombre_categoria: any) => nombre_categoria || "Sin categoría"
        },
        {
            title: "Info",
            key: "info",
            render: (_: any, record: any) => (
                record.variant && ( // solo mostrar botón en las variantes, no en el grupo principal
                    <Button onClick={() => openInfoModal(record)}>
                        <InfoCircleOutlined />
                    </Button>
                )
            )
        },
        !isSeller && {
            title: "Agregar Variante",
            key: "addVariant",
            render: (_: any, record: any) => (
                record.variant && (
                    <Button onClick={() => openVariantModal(record)}>
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

            const filtered = productsInGroup.filter(product => {
                const { nombre_producto, id_categoria, sucursal, features } = searcher;

                return (
                    (!nombre_producto || product.nombre_producto.toLowerCase().includes(nombre_producto.toLowerCase())) &&
                    (!id_categoria || product.id_categoria === id_categoria) &&
                    (!sucursal || product.producto_sucursal?.some(suc => suc.id_sucursal === sucursal)) &&
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
                let producto_sucursal = [];
                let nombre_categoria = "Sin categoría";

                try {
                    const stockRes = await getAllStockByProductIdAPI(product._id);
                    if (stockRes.success !== false) {
                        producto_sucursal = stockRes;
                    }

                    if (product.id_categoria) {
                        const categoryRes = await getCategoryByIdAPI(product.id_categoria);
                        if (categoryRes.success !== false && categoryRes.categoria) {
                            nombre_categoria = categoryRes.categoria;
                        }
                    }
                } catch (err) {
                    console.error("Error fetching product or category:", err);
                }

                return {
                    ...product,
                    producto_sucursal,
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
                                    defaultExpandAllRows: false,
                                    expandRowByClick: true,
                                }}
                                pagination={{ pageSize: 5 }}
                                rowKey="key"
                            />

                        )}
                    </div>
                ))
            )}

            <ProductInfoModal
                visible={infoModalOpen}
                onClose={closeInfoModal}
                product={selectedProductInfo}
            />

            <AddVariantModal
                visible={variantModalOpen}
                onCancel={closeVariantModal}
                group={{
                    id: selectedProduct?.groupId,
                    name: selectedProduct?.nombre_producto,
                    product: selectedProduct
                }}
            />
        </>
    );
};

export default ProductTable;
