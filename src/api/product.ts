import { AxiosError } from "axios"
import { apiClient, apiClientNoJSON } from "./apiClient"
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

export const getFlatProductListAPI = async (
    input?: string | {
        sucursalId?: string;
        sellerId?: string;
        sellerIds?: string[];
        categoryId?: string;
        q?: string;
        inStock?: boolean;
    }
) => {
    try {
        const rawParams =
            typeof input === "string"
                ? { sucursalId: input }
                : (input || {});
        const params = {
            ...rawParams,
            sellerIds: Array.isArray((rawParams as any)?.sellerIds)
                ? (rawParams as any).sellerIds.join(",")
                : undefined
        };
        const res = await apiClient.get("/product/flat", {
            params
        });
        return res.data;
    } catch (error) {
        console.error("❌ Error al obtener productos planos:", error);
        return [];
    }
};

export const getFlatProductListPageAPI = async (params?: {
    sucursalId?: string;
    sellerId?: string;
    categoryId?: string;
    q?: string;
    inStock?: boolean;
    page?: number;
    limit?: number;
}) => {
    try {
        const res = await apiClient.get("/product/flat/list", { params });
        return res.data;
    } catch (error) {
        console.error("Error al obtener productos planos paginados:", error);
        return { rows: [], total: 0, page: 1, limit: params?.limit || 10, pages: 1 };
    }
};

export const getSellerInventoryPageAPI = async (params?: {
    sucursalId?: string;
    sellerId?: string;
    categoryId?: string;
    q?: string;
    inStock?: boolean;
    page?: number;
    limit?: number;
}) => {
    try {
        const res = await apiClient.get("/product/seller/inventory", { params });
        return res.data;
    } catch (error) {
        console.error("Error al obtener inventario paginado de vendedor:", error);
        return { rows: [], total: 0, page: 1, limit: params?.limit || 10, pages: 1 };
    }
};

export const getSellerInventoryAllAPI = async (params?: {
    sucursalId?: string;
    sellerId?: string;
    categoryId?: string;
    q?: string;
    inStock?: boolean;
}) => {
    try {
        const res = await apiClient.get("/product/seller/inventory/all", { params });
        return res.data;
    } catch (error) {
        console.error("Error al obtener inventario completo de vendedor:", error);
        return [];
    }
};

export const getSellerProductInfoPageAPI = async (params?: {
    sucursalId?: string;
    categoryId?: string;
    q?: string;
    inStock?: boolean;
    hasPromotion?: boolean;
    hasImages?: boolean;
    hasDescription?: boolean;
    page?: number;
    limit?: number;
    sortOrder?: "asc" | "desc";
}) => {
    try {
        const res = await apiClient.get("/product/seller/product-info", { params });
        return res.data;
    } catch (error) {
        console.error("Error al obtener informacion de productos del vendedor:", error);
        return {
            success: false,
            rows: [],
            total: 0,
            page: Number(params?.page || 1),
            limit: Number(params?.limit || 10),
            pages: 1
        };
    }
};

export const updateSellerProductInfoByVariantAPI = async ({
    productId,
    variantKey,
    descripcion,
    uso,
    promocion,
    clearImages,
    imageFiles,
}: {
    productId: string;
    variantKey: string;
    descripcion?: string;
    uso?: string;
    promocion?: {
        titulo?: string;
        descripcion?: string;
        fechaInicio?: string | null;
        fechaFin?: string | null;
    };
    clearImages?: boolean;
    imageFiles?: File[];
}) => {
    try {
        const formData = new FormData();
        if (descripcion !== undefined) formData.append("descripcion", descripcion);
        if (uso !== undefined) formData.append("uso", uso);
        if (promocion !== undefined) formData.append("promocion", JSON.stringify(promocion));
        if (clearImages) formData.append("clearImages", "true");
        (imageFiles || []).forEach((file) => formData.append("imagenes", file));

        const res = await apiClientNoJSON.patch(
            `/product/seller/product-info/${productId}/variant/${variantKey}`,
            formData
        );
        return res.data;
    } catch (error) {
        return handleError(error);
    }
};
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




