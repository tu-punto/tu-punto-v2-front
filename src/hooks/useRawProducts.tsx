// hooks/useRawProducts.ts
import { useState, useEffect } from 'react';
import { getProductsAPI } from '../api/product';

const useRawProducts = () => {
    const [rawProducts, setRawProducts] = useState<any[]>([]);

    const fetchRawProducts = async () => {
        try {
            const data = await getProductsAPI();
            setRawProducts(data);
        } catch (err) {
            console.error("Error cargando productos crudos:", err);
        }
    };

    useEffect(() => {
        fetchRawProducts();
    }, []);

    return { rawProducts, fetchRawProducts };
};

export default useRawProducts;
