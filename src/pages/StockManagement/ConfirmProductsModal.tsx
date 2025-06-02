import { Modal, Button, Table, InputNumber, Popconfirm, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { createVariantAPI, registerProductAPI, updateSubvariantStockAPI } from "../../api/product";
import { getTempStock, getTempProducts, getTempVariants, clearTempStock, clearTempProducts, clearTempVariants } from "../../utils/storageHelpers";
import {createEntryAPI} from "../../api/entry.ts";

const ConfirmProductsModal = ({ visible, onClose, onSuccess, productosConSucursales  }) => {
    const [stockData, setStockData] = useState([]);
    const [variantData, setVariantData] = useState([]);
    const [productData, setProductData] = useState([]);
    const sucursalId = localStorage.getItem("sucursalId");

    useEffect(() => {
        //const newStock = JSON.parse(localStorage.getItem("newStock") || "[]");
        //const newVariants = JSON.parse(localStorage.getItem("newVariants") || "[]");
        const newProducts = JSON.parse(localStorage.getItem("newProducts") || "[]");
        //console.log("Productos cargados desde localStorage:", newProducts);
        // Solo tomar combinaciones de la sucursal actual
        const filteredProducts = newProducts.map((p) => {
            const prod = p.productData || p;
            const filteredSucursales = prod.sucursales.map((s) => ({
                ...s,
                combinaciones: s.id_sucursal === sucursalId
                    ? s.combinaciones.filter((c) => c.stock > 0)
                    : []
            })).filter(s => s.combinaciones.length > 0);
            return { ...p, productData: { ...prod, sucursales: filteredSucursales } };
        });

        setStockData(getTempStock());
        setVariantData(getTempVariants());
        setProductData(filteredProducts);
    }, [visible]);

    const handleEditStock = (record, value) => {
        const updated = stockData.map(item =>
            item === record ? { ...item, newStock: { ...item.newStock, stock: value } } : item
        );
        setStockData(updated);
    };

    const handleDelete = (data, setData, record) => {
        setData(data.filter(item => item !== record));
    };

    const handleEditVariant = (record, key, value) => {
        const updated = variantData.map(item =>
            item === record ? { ...item, [key]: value } : item
        );
        setVariantData(updated);
    };

    const handleEditProduct = (productId, sucursalId, combIndex, field, value) => {
        const updated = productData.map(raw => {
            const prod = raw.productData || raw;
            if (prod._id === productId) {
                const updatedSucursales = prod.sucursales.map(suc => {
                    if (suc.id_sucursal === sucursalId) {
                        const combinaciones = [...suc.combinaciones];
                        combinaciones[combIndex][field] = value;
                        return { ...suc, combinaciones };
                    }
                    return suc;
                });
                return { ...raw, productData: { ...prod, sucursales: updatedSucursales } };
            }
            return raw;
        });
        setProductData(updated);
    };

    const flattenedCombinations = useMemo(() => {
        return productData.flatMap(raw => {
            const prod = raw.productData || raw;
            const sucursal = prod.sucursales?.find(s => s.id_sucursal === sucursalId);
            if (!sucursal) return [];

            return sucursal.combinaciones.map((comb, idx) => ({
                key: `${prod._id}-${sucursal.id_sucursal}-${idx}`,
                nombre_producto: prod.nombre_producto,
                sucursalId: sucursal.id_sucursal,
                index: idx,
                variantes: Object.entries(comb.variantes).map(([k, v]) => `${k[0]}: ${v}`).join(" / "),
                precio: comb.precio,
                stock: comb.stock,
                productId: prod._id
            }));
        });
    }, [productData, sucursalId]);

    const clearAll = () => {
        clearTempStock();
        clearTempProducts();
        clearTempVariants();
        setStockData([]);
        setVariantData([]);
        setProductData([]);
        onClose?.();
    };
    const sonObjetosIguales = (a: Record<string, string>, b: Record<string, string>) => {
        const clavesA = Object.keys(a);
        const clavesB = Object.keys(b);
        if (clavesA.length !== clavesB.length) return false;
        return clavesA.every(k => a[k] === b[k]);
    };
    const saveProducts = async () => {
        try {
            // 1. Registrar variantes nuevas
            for (const variant of variantData) {
                const payload = {
                    productId: variant.product._id,
                    sucursalId,
                    combinaciones: variant.combinaciones
                };
                await createVariantAPI(payload);
            }

            // 2. Registrar productos nuevos
            for (const prodRaw of productData) {
                const product = prodRaw.productData || prodRaw;
                await registerProductAPI(product);
            }

            // 3. Actualizar stock e ingresar registro de entrada
            for (const entry of stockData) {
                const { product } = entry;
                const variantes = product.variantes;
                const ingreso = entry.newStock.stock;
                const productId = product._id || product.id_producto;

                if (ingreso > 0) {
                    const productoOriginal = productosConSucursales.find(p =>
                        p._id === product._id || p._id === product.id_producto
                    );

                    const sucursal = productoOriginal?.sucursales?.find((s: any) => {
                        const idSucursalStr = typeof s.id_sucursal === "string"
                            ? s.id_sucursal
                            : s.id_sucursal?._id || s.id_sucursal?.$oid || s.id_sucursal?.toString?.();
                        return idSucursalStr === sucursalId;
                    });

                    const combinacion = sucursal?.combinaciones?.find((c: any) =>
                        sonObjetosIguales(c.variantes, variantes)
                    );

                    const stockActual = combinacion?.stock || 0;
                    const nuevoStock = stockActual + ingreso;

                    await updateSubvariantStockAPI({
                        productId,
                        sucursalId,
                        variantes,
                        stock: nuevoStock
                    });

                    await createEntryAPI({
                        producto: productId,
                        sucursal: sucursalId,
                        nombre_variante: Object.entries(variantes || {}).map(([k, v]) => `${k}: ${v}`).join(" / "),
                        cantidad_ingreso: ingreso,
                        estado: "confirmado",
                        categoria: product.categoria || "Ropa",
                        fecha: new Date().toISOString()
                    });
                }
            }

            // 4. Limpiar
            clearAll();
            message.success("Todos los cambios fueron aplicados correctamente.");
            onSuccess?.();
        } catch (error) {
            console.error("Error al guardar productos:", error);
            message.error("Ocurrió un error al guardar los cambios.");
        }
    };
    return (
        <Modal
            title="Confirmar Productos"
            visible={visible}
            onCancel={clearAll}
            footer={[
                <Button key="clear" danger onClick={clearAll}>Limpiar Cambios</Button>,
                <Button key="cancel" onClick={onClose}>Cancelar</Button>,
                <Button key="save" type="primary" onClick={saveProducts}>Confirmar</Button>
            ]}
            width={900}
        >
            <h3>Ingresos a Productos Existentes</h3>
            {stockData.length > 0 ? (
                <Table
                    dataSource={stockData}
                    rowKey={(_, i) => i}
                    pagination={false}
                    columns={[
                        {
                            title: "Producto",
                            render: (_, record) => {
                                const variantes = Object.entries(record.product.variantes || {})
                                    .map(([k, v]) => `${v}`)
                                    .join(" / ");
                                return `→ ${record.product.nombre_producto || ''} - ${variantes}`;
                            }
                        },
                        {
                            title: "Stock actual",
                            render: (_, record) => (
                                <span>{record.product.stock || "-"}</span>
                            )
                        },
                        {
                            title: "Precio Unitario",
                            render: (_, record) => (
                                <span>{record.product.precio || "-"}</span>
                            )
                        },
                        {
                            title: "Ingresos",
                            render: (_, record) => (
                                <InputNumber
                                    min={0}
                                    value={record.newStock.stock}
                                    onChange={(val) => handleEditStock(record, val)}
                                />
                            )
                        },
                        {
                            title: "Categoría",
                            render: (_, record) => (
                                <span>{record.product.categoria || "Ropa"}</span> // si no tienes, hardcodea momentáneamente
                            )
                        },
                        {
                            title: "Acciones",
                            render: (_, record) => (
                                <Popconfirm
                                    title="¿Eliminar?"
                                    onConfirm={() => handleDelete(stockData, setStockData, record)}
                                >
                                    <Button danger>Eliminar</Button>
                                </Popconfirm>
                            )
                        }
                    ]}
                />
            ) : <p style={{ color: 'gray' }}>No hay ingresos nuevos.</p>}

            <h3>Variantes Nuevas</h3>
            {variantData.length > 0 ? (
                <Table
                    dataSource={variantData.flatMap((record, i) => (
                        record.combinaciones.map((comb, index) => ({
                            key: `${i}-${index}`,
                            nombre_producto: record.product.nombre_producto,
                            variantes: Object.entries(comb.variantes).map(([k, v]) => `${k}: ${v}`).join(" / "),
                            precio: comb.precio,
                            stock: comb.stock,
                            variantRecord: record,
                            combIndex: index,
                        }))
                    ))}
                    rowKey="key"
                    pagination={false}
                    columns={[
                        { title: "Producto", dataIndex: "nombre_producto" },
                        { title: "Variantes", dataIndex: "variantes" },
                        {
                            title: "Stock",
                            render: (_, record) => (
                                <InputNumber
                                    min={0}
                                    value={record.stock}
                                    onChange={(val) => {
                                        const updated = variantData.map(v => {
                                            if (v === record.variantRecord) {
                                                const combinaciones = [...v.combinaciones];
                                                combinaciones[record.combIndex].stock = val;
                                                return { ...v, combinaciones };
                                            }
                                            return v;
                                        });
                                        setVariantData(updated);
                                    }}
                                />
                            )
                        },
                        {
                            title: "Precio",
                            render: (_, record) => (
                                <InputNumber
                                    min={0}
                                    value={record.precio}
                                    onChange={(val) => {
                                        const updated = variantData.map(v => {
                                            if (v === record.variantRecord) {
                                                const combinaciones = [...v.combinaciones];
                                                combinaciones[record.combIndex].precio = val;
                                                return { ...v, combinaciones };
                                            }
                                            return v;
                                        });
                                        setVariantData(updated);
                                    }}
                                />
                            )
                        },
                        {
                            title: "Acciones",
                            render: (_, record) => (
                                <Popconfirm
                                    title="¿Eliminar?"
                                    onConfirm={() => {
                                        const updated = variantData.map(v => {
                                            if (v === record.variantRecord) {
                                                const combinaciones = v.combinaciones.filter((_, i) => i !== record.combIndex);
                                                return { ...v, combinaciones };
                                            }
                                            return v;
                                        });
                                        setVariantData(updated);
                                    }}
                                >
                                    <Button danger>Eliminar</Button>
                                </Popconfirm>
                            )
                        }
                    ]}
                />
            ) : <p style={{ color: 'gray' }}>No hay variantes nuevas.</p>}
            <h3>Productos Nuevos</h3>
            {flattenedCombinations.length > 0 ? (
                <Table
                    dataSource={flattenedCombinations}
                    rowKey="key"
                    pagination={false}
                    columns={[
                        { title: "Producto", dataIndex: "nombre_producto" },
                        { title: "Variantes", dataIndex: "variantes" },
                        {
                            title: "Stock",
                            render: (_, record) => (
                                <InputNumber
                                    min={0}
                                    value={record.stock}
                                    onChange={(val) =>
                                        handleEditProduct(record.productId, record.sucursalId, record.index, "stock", val)
                                    }
                                />
                            )
                        },
                        {
                            title: "Precio",
                            render: (_, record) => (
                                <InputNumber
                                    min={0}
                                    value={record.precio}
                                    onChange={(val) =>
                                        handleEditProduct(record.productId, record.sucursalId, record.index, "precio", val)
                                    }
                                />
                            )
                        },
                        {
                            title: "Acciones",
                            render: (_, record) => (
                                <Popconfirm
                                    title="¿Eliminar combinación?"
                                    onConfirm={() => {
                                        const updated = productData.map(raw => {
                                            const prod = raw.productData || raw;
                                            if (prod._id === record.productId) {
                                                const updatedSucursales = prod.sucursales.map(suc => {
                                                    if (suc.id_sucursal === record.sucursalId) {
                                                        return {
                                                            ...suc,
                                                            combinaciones: suc.combinaciones.filter((_, i) => i !== record.index)
                                                        };
                                                    }
                                                    return suc;
                                                });
                                                return { ...raw, productData: { ...prod, sucursales: updatedSucursales } };
                                            }
                                            return raw;
                                        });
                                        setProductData(updated);
                                    }}
                                >
                                    <Button danger>Eliminar</Button>
                                </Popconfirm>
                            )
                        }
                    ]}
                />
            ) : <p style={{ color: 'gray' }}>No hay productos nuevos.</p>}
        </Modal>
    );
};

export default ConfirmProductsModal;
