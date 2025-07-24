import { useState, useEffect } from "react";
import { getFlatProductListAPI } from "../api/product";

// Tipado base (opcional)
interface FlatProduct {
    key: string;
    producto: string;
    precio: number;
    stockActual: number;
    categoria: string;
    id_vendedor: string;
    id_producto: string;
    sucursalId: string;
    variantes: Record<string, string>;
}

const useProductsFlat = (externalSucursalId?: string) => {
    const [data, setData] = useState<FlatProduct[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const all = await getFlatProductListAPI(externalSucursalId);
            // Solo productos con stock > 0
            const withStock = all.filter((p: any) => p.stock > 0);

            const mapped = all.map((item: any, index: number) => ({
                key: `${item._id}-${index}`,
                producto: `${item.nombre_producto} - ${item.variante}`,
                precio: item.precio,
                stockActual: item.stock,
                categoria: item.categoria || "Sin categoría",
                id_vendedor: item.id_vendedor,
                id_producto: item._id,
                sucursalId: item.sucursalId.toString(),
                variantes: item.variantes_obj || {},

            }));

            setData(mapped);
        } catch (error) {
            console.error("Error cargando productos optimizados:", error);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!externalSucursalId || externalSucursalId === "undefined") return;
        fetchProducts();
    }, [externalSucursalId]);

    return { data, fetchProducts, loading };
};

export default useProductsFlat;