import { AxiosError } from "axios"
import { apiClient } from "./apiClient"
import { parseError } from "./util"

const handleError = (error) => {
    const err = error as AxiosError
    if (err?.response?.data) return { success: false, ...err.response.data }
    return { success: false }
}
export const createVariantAPI = async ({
                                           productId,
                                           sucursalId,
                                           combinaciones
                                       }: {
    productId: string;
    sucursalId: string;
    combinaciones: {
        variantes: Record<string, string>;
        precio: number;
        stock: number;
    }[];
}) => {
    try {
        const res = await apiClient.post(`/product/add-variant`, {
            productId,
            sucursalId,
            combinaciones
        });
        return res.data;
    } catch (error) {
        const err = error as AxiosError;
        if (err?.response?.data) {
            return { success: false, ...err.response.data };
        }
        return { success: false };
    }
};
// GET
export const getProductsAPI = async () => {
    try {
        const res = await apiClient.get(`/product`)
        return res.data
    } catch (error) {
        return handleError(error)
    }
}

export const getFlatProductListAPI = async (sucursalId?: string) => {
    try {
        const res = await apiClient.get("/product/flat", {
            params: { sucursalId }
        });
        return res.data;
    } catch (error) { /* ... */ }
}
export const getProductByIdAPI = async (idProduct) => {
    try {
        const res = await apiClient.get(`/product/${idProduct}`)
        return res.data
    } catch (error) {
        return handleError(error)
    }
}

export const getProductCategoryAPI = async (productId) => {
    try {
        const res = await apiClient.get(`/product/category/${productId}`)
        return res.data
    } catch (error) {
        return handleError(error)
    }
}

export const getProductStockAPI = async (idProduct, idSucursal) => {
    try {
        const res = await apiClient.get(`/product/${idProduct}/sucursal/${idSucursal}`)
        return res.data
    } catch (error) {
        return handleError(error)
    }
}

export const getAllProductsEntryAmountBySellerId = async (sellerId) => {
    try {
        const res = await apiClient.get(`/product/seller/${sellerId}`)
        return res.data
    } catch (error) {
        return handleError(error)
    }
}

export const getAllStockByProductIdAPI = async (idProduct) => {
    try {
        const res = await apiClient.get(`/product/stock/${idProduct}`)
        return res.data
    } catch (error) {
        return handleError(error)
    }
}

export const getProductFeaturesAPI = async (productId) => {
    try {
        const res = await apiClient.get(`/product/features/${productId}`)
        return res.data
    } catch (error) {
        return handleError(error)
    }
}

// POST
export const registerProductAPI = async (productData) => {
    try {
        //console.log("Product data:", productData)
        const res = await apiClient.post(`/product/register`, productData)
        console.log("Response data:", res.data)
        return res.data
    } catch (error) {
        return handleError(error)
    }
}

export const addProductFeaturesAPI = async ({ id_producto, feats }) => {
    try {
        const res = await apiClient.post(`/product/addFeatures`, {
            productId: id_producto,
            features: feats
        })
        return res.data
    } catch (error) {
        return handleError(error)
    }
}

export const addProductStockAPI = async (productStockValues) => {
    try {
        const res = await apiClient.post(`/product/addStock`, productStockValues)
        return res.data
    } catch (error) {
        return handleError(error)
    }
}

// PUT
export const updateProductBranchStockAPI = async (productBranchId, nuevaCantidad) => {
    try {
        const res = await apiClient.put(`/product/producto-sucursal/${productBranchId}`, { nuevaCantidad })
        return res.data
    } catch (error) {
        return handleError(error)
    }
}
export const updateProductPriceAPI = async (priceUpdates) => {
    try {
        const res = await apiClient.put('/product/update-price', { priceUpdates });
        return res.data;
    } catch (error) {
        return handleError(error);
    }
};
export const updateSubvariantStockAPI = async ({
                                                   productId,
                                                   sucursalId,
                                                   variantes,
                                                   stock
                                               }: {
    productId: string;
    sucursalId: string;
    variantes: Record<string, string>;
    stock: number;
}) => {
    /*
    console.log("📦 Enviando actualización de stock:", {
        productId,
        sucursalId,
        variantes,
        stock
    });
    */
    try {
        const res = await apiClient.put(`/product/update-subvariant-stock`, {
            productId,
            sucursalId,
            variantes,
            stock
        });
        return res.data;
    } catch (error) {
        console.error("❌ Error al actualizar stock:", error);
        return handleError(error);
    }
};

export const registerVariantAPI = async (productData: any) => {
    try {
        console.log("Product data:", productData);
        const res = await apiClient.post('/product/register', productData); // ✅ aquí está el fix
        return res.data;
    } catch (error) {
        const err = error as AxiosError;
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data };
        }
        return { success: false };
    }
};
export const generateIngressPDFAPI = async (payload: any): Promise<{ success: boolean }> => {
    try {
        const res = await apiClient.post("/product/generate-ingress-pdf", payload, {
            responseType: 'blob' // importante para que axios trate la respuesta como archivo
        });

        const blob = new Blob([res.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Comprobante_Ingresos_${Date.now()}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url); // libera la memoria

        return { success: true };
    } catch (error) {
        console.error("❌ Error generando PDF:", error);
        return { success: false };

    }
};




