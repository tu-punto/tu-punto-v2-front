import { useContext, useEffect, useState } from 'react';
import { Button, Input, Table } from 'antd';
import { InfoCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { UserContext } from '../../context/userContext';
import ProductSearcher from './ProductSearcher';

interface ProductTableProps {
    productsList: any[];
    groupList: any[];
}

const ProductTable = ({ productsList, groupList }: ProductTableProps) => {
    const [ingresoData, setIngresoData] = useState<{ [key: string]: number | '' }>({});
    const [searcher, setSearcher] = useState<any>({}); // ✅ Inicializado como objeto, no array
    const [tableGroup, setTableGroup] = useState<any[]>([]);

    const { user }: any = useContext(UserContext);
    const isSeller = user?.role === 'seller';

    //console.log("PRODUCTS EN ProductTable:", productsList);
    //console.log("GROUPLIST EN ProductTable:", groupList);

    const groupCriteria = (group: any, products: any[]) => {
        //console.log(`jajsjsjasaProductos en grupojsjsjs ${group.nombre}:`, products);
        const result = products.filter(p => p.id_vendedor === group._id);
        //console.log(`Productos en grupojsjsjs ${group.nombre} y ${group._id}:`, result);

        return result;
    };

    const handleIngresoChange = (productId: number, value: number) => {
        setIngresoData((prev) => ({ ...prev, [productId]: value }));
    };

    const handleStockUpdate = () => {
        console.log("Ingreso data:", ingresoData);
        const newStock = [];

        for (const product of productsList) {
            const ingreso = ingresoData[product._id] || 0;
            if (ingreso > 0) {
                newStock.push({
                    productId: product._id,
                    sucursalId: 3,
                    stock: ingreso
                });
            }else{
                console.log(`No se actualiza el stock del producto ${product.nombre_producto} porque el ingreso es 0`);
            }
        }

        console.log("Datos a enviar a API (mock):", newStock);
        alert("Stock actualizado (simulado)");
        setIngresoData({});
    };

    const columns = [
        {
            title: "Info",
            key: "info",
            render: (_: any, product: any) => (
                <Button onClick={() => console.log("Mostrar info de:", product)}>
                    <InfoCircleOutlined />
                </Button>
            )
        },
        !isSeller && {
            title: "Agregar Variante",
            key: "addVariant",
            render: (_: any, product: any) => (
                <Button onClick={() => console.log("Agregar variante de:", product)}>
                    <PlusOutlined />
                </Button>
            )
        },
        {
            title: 'Producto',
            dataIndex: 'nombre_producto',
            key: 'nombre_producto',
        },
        {
            title: 'Stock actual',
            dataIndex: 'producto_sucursal',
            key: 'stock',
            render: (producto_sucursal: any[]) =>
                Array.isArray(producto_sucursal)
                    ? producto_sucursal.reduce((acc, suc) => acc + (suc.cantidad_por_sucursal || 0), 0)
                    : 0
        },
        !isSeller && {
            title: 'Ingreso',
            key: 'ingreso',
            render: (_: any, record: any) => (
                <Input
                    type="number"
                    value={ingresoData[record._id] || ''}
                    onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        handleIngresoChange(record._id, isNaN(val) ? '' : val);
                    }}

                />
            )
        },
        {
            title: 'Precio',
            dataIndex: 'precio',
            key: 'precio',
        },
        {
            title: 'Categoría',
            dataIndex: 'categoria',
            key: 'categoria',
            render: (cat: any) => cat?.categoria || "Sin categoría"
        }
    ].filter(Boolean);

    const changeSearcher = (criteria: any) => {
        console.log("Aplicando filtro de búsqueda:", criteria);
        setSearcher(criteria);
    };

    const getProductInGroup = () => {
        console.log("Searcher actual:", searcher);
        const newGroupList = groupList.map((group: any) => {
            const groupId = group.id || group._id;
            const groupName = group.name || group.nombre || "Sin nombre";

            const products = groupCriteria(group, productsList);
            console.log("Grupito", groupId, "con productos:", products,"y grupasoz",group);
            const filtered = products.filter(product => {
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

            console.log(`Productos en grupo "${groupName}" después de filtro:`, filtered);

            return { ...group, name: groupName, products: filtered };
        });

        setTableGroup(newGroupList);
        console.log("Tabla agrupada:", newGroupList);
    };


    useEffect(() => {
        getProductInGroup();
    }, [searcher, productsList, groupList]);

    return (
        <>
            <ProductSearcher applySearcher={changeSearcher} />
            <Button onClick={handleStockUpdate} style={{ marginBottom: 20 }}>Actualizar Stock</Button>

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
                                dataSource={group.products}
                                pagination={{ pageSize: 5 }}
                                rowKey="_id" // ✅ Asegura que el rowKey sea consistente
                            />
                        )}
                    </div>
                ))
            )}
        </>
    );
};

export default ProductTable;
