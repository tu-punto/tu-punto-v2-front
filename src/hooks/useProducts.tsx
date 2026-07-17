import { useState, useEffect } from "react";
import { getProductsAPI } from "../api/product";
import { getCategoryByIdAPI } from "../api/category";

const useProducts = (externalSucursalId?: string) => {
    const [data, setData] = useState<any[]>([]);
    const sucursalId = externalSucursalId || localStorage.getItem("sucursalId");

    const categoryCache = new Map<string, string>();

    const getCategoryName = async (id: string) => {
        if (categoryCache.has(id)) return categoryCache.get(id);

        const result = await getCategoryByIdAPI(id);
        const nombre = result?.categoria || "Sin categoría";
        categoryCache.set(id, nombre);
        return nombre;
    };

    const mapApiDataToProductoData = async (apiData: any) => {
        const productData: any[] = [];

        for (const item of apiData) {
            const sucursal = item.sucursales?.find(
                (s: any) => s.id_sucursal === sucursalId
            );
            if (!sucursal) continue;

            const categoriaNombre = await getCategoryName(item.id_categoria);

            if (!Array.isArray(sucursal.combinaciones) || sucursal.combinaciones.length === 0) {
                productData.push({
                    key: `${item._id}-base`,
                    producto: item.nombre_producto,
                    precio: 0,
                    stockActual: 0,
                    categoria: categoriaNombre,
                    id_vendedor: item.id_vendedor,
                    id_producto: item._id,
                    sucursalId: sucursal.id_sucursal,
                    variantes: {},
                    isBaseProduct: true,
                });
                continue;
            }

            sucursal.combinaciones.forEach((combo: any, index: number) => {
                const nombreVariante = Object.values(combo.variantes).join(" / ");
                productData.push({
                    key: `${item._id}-${index}`,
                    producto: `${item.nombre_producto} - ${nombreVariante}`,
                    precio: combo.precio,
                    stockActual: combo.stock,
                    categoria: categoriaNombre,
                    id_vendedor: item.id_vendedor,
                    id_producto: item._id,
                    sucursalId: sucursal.id_sucursal,
                    variantes: combo.variantes,
                    isBaseProduct: false,
                });
            });
        }

        return productData;
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
