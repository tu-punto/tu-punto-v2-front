import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { getProductsAPI, getFlatProductListAPI } from '../api/product';
import { getSellersAPI } from '../api/seller';
import { getCategoriesAPI } from '../api/category';
import { getGroupsAPI } from '../api/group';

interface UseOptimizedProductsProps {
    sucursalId: string;
    isSeller: boolean;
    userId?: string;
}

/**
 * Hook optimizado para gestión de productos en inventario
 * Maneja cache, memoización y carga paralela de datos
 */
export const useOptimizedProducts = ({ 
    sucursalId, 
    isSeller, 
    userId 
}: UseOptimizedProductsProps) => {
    const [products, setProducts] = useState<any[]>([]);
    const [productosFull, setProductosFull] = useState<any[]>([]);
    const [sellers, setSellers] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Cache simple en memoria (puedes reemplazar con React Query)
    const cacheRef = useState<{
        timestamp: number;
        data: any;
    } | null>(null);

    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

    const fetchData = useCallback(async (forceRefresh = false) => {
        // Validar sucursal
        if (!isSeller && (!sucursalId || sucursalId.length !== 24)) {
            message.error("Sucursal no seleccionada o inválida.");
            setProducts([]);
            setLoading(false);
            return;
        }

        // Verificar cache
        const now = Date.now();
        if (
            !forceRefresh && 
            cacheRef[0] && 
            cacheRef[0].timestamp && 
            (now - cacheRef[0].timestamp) < CACHE_DURATION
        ) {
            const cached = cacheRef[0].data;
            setProducts(cached.products);
            setProductosFull(cached.productosFull);
            setSellers(cached.sellers);
            setCategories(cached.categories);
            setGroups(cached.groups);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Cargar datos en paralelo
            const [sellersResponse, categoriesResponse, groupsResponse] = await Promise.all([
                getSellersAPI(),
                getCategoriesAPI(),
                getGroupsAPI()
            ]);

            let productsResponse = [];
            let fullProductsResponse = [];

            if (isSeller) {
                // Para vendedores: cargar todos y filtrar
                const allProducts = await getProductsAPI();
                fullProductsResponse = allProducts;

                productsResponse = allProducts.filter(p =>
                    p.id_vendedor?.toString() === userId &&
                    (sucursalId === "all" || p.sucursales?.some(s => 
                        s.id_sucursal?.toString() === sucursalId
                    ))
                );
            } else {
                // Para admin: cargar productos planos y completos en paralelo
                [productsResponse, fullProductsResponse] = await Promise.all([
                    getFlatProductListAPI(sucursalId),
                    getProductsAPI()
                ]);
            }

            // Actualizar estados
            const data = {
                products: productsResponse,
                productosFull: fullProductsResponse,
                sellers: sellersResponse,
                categories: categoriesResponse,
                groups: groupsResponse
            };

            setProducts(data.products);
            setProductosFull(data.productosFull);
            setSellers(data.sellers);
            setCategories(data.categories);
            setGroups(data.groups);

            // Guardar en cache
            cacheRef[1]({
                timestamp: Date.now(),
                data
            });

        } catch (error) {
            console.error("Error al cargar productos:", error);
            setError("Error al cargar los datos");
            message.error("Ocurrió un error al cargar los datos.");
        } finally {
            setLoading(false);
        }
    }, [sucursalId, isSeller, userId]);

    // Cargar datos al montar o cuando cambien dependencias críticas
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Función para invalidar cache y recargar
    const refresh = useCallback(() => {
        fetchData(true);
    }, [fetchData]);

    // Filtrar productos por vendedor (memoizado)
    const filterByVendor = useCallback((vendorId: string | null) => {
        if (!vendorId) return products;
        return products.filter(p => p.id_vendedor?.toString() === vendorId);
    }, [products]);

    // Filtrar por categoría (memoizado)
    const filterByCategory = useCallback((categoryId: string) => {
        if (categoryId === 'all') return products;
        return products.filter(p => p.id_categoria === categoryId);
    }, [products]);

    // Buscar productos (memoizado)
    const searchProducts = useCallback((searchText: string) => {
        if (!searchText) return products;
        
        const searchLower = searchText.toLowerCase();
        return products.filter(p => {
            const nombre = p.nombre_producto?.toLowerCase() || '';
            const variant = p.variant?.toLowerCase() || '';
            return nombre.includes(searchLower) || variant.includes(searchLower);
        });
    }, [products]);

    return {
        // Datos
        products,
        productosFull,
        sellers,
        categories,
        groups,
        
        // Estado
        loading,
        error,
        
        // Acciones
        refresh,
        
        // Filtros memoizados
        filterByVendor,
        filterByCategory,
        searchProducts
    };
};
