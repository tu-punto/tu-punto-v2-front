import { useState, useEffect } from "react";
import { getProductsAPI } from "../api/product";

const useProducts = () => {
    const [data, setData] = useState<any[]>([]);

    const mapApiDataToProductoData = async (apiData: any) => {
        const productDataPromises = apiData.map(async (item: any) => {
            const categoria = item.categoria.categoria

            return {
                key: item.id_producto,
                producto: item.nombre_producto,
                precio: item.precio,
                stockActual: item.producto_sucursal.reduce((acc: number, prodSuc: any) => acc + prodSuc.cantidad_por_sucursal, 0),
                categoria: categoria,
                id_vendedor: item.id_vendedor,
                groupId: item.groupId, //Added not to show "Sin Grupo" group products
                producto_sucursal: item.producto_sucursal
            };
        });
        return Promise.all(productDataPromises);
    };

    const fetchProducts = async () => {
        const apiData = await getProductsAPI();
        const productData = await mapApiDataToProductoData(apiData);
        setData(productData);
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    return { data, fetchProducts };
};

export default useProducts;
