import { AxiosError } from "axios"
import { apiClient } from "./apiClient"
import { parseError } from "./util"

export const getSalesAPI = async () => {
    try {
        const res = await apiClient.get(`/sale`)
        return res.data
    } catch (error) {
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { success: false }
    }
}

export const registerSalesAPI = async (salesData: any) => {
    try {
        const res = await apiClient.post(`/sale/register`, salesData)
        return res.data
    } catch (error) {
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { success: false }
    }
}

export const getProductByShippingAPI = async (shippingId: any) => {
    try {
        const res = await apiClient.get(`/sale/products/${shippingId}`)
        return res.data
    } catch (error) {
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { success: false }

    }
}
export const getSalesBySellerIdAPI = async (sellerId: any) => {
    try {
        const res = await apiClient.get(`/sale/products/seller/${sellerId}`)
        return res.data
    } catch (error) {
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { success: false }

    }
}

export const getProductHistorySalesByProductIdAPI = async (productId: any) => {
    try {
        const res = await apiClient.get(`/sale/product/${productId}`)
        return res.data
    } catch (error) {
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { succcess: false }
    }
}

export const updateProductsByShippingAPI = async (shippingId: string, updatedEmtpySalesTable: any,) => {
    try {
        const res = await apiClient.put(`/sale/products/update/${shippingId}`, updatedEmtpySalesTable)
        return { success: true, ...res.data }
    } catch (error) {
        parseError(error as AxiosError)
    }
}
export const deleteProductsByShippingAPI = async (shippingId: string, deletedEmtpySalesTable: any,) => {
    try {
        const res = await apiClient.delete(`/sale/products/delete/${shippingId}`, { data: deletedEmtpySalesTable })
        return { success: true, ...res.data }
    } catch (error) {
        parseError(error as AxiosError)
    }
}
export const deleteSalesAPI = async (sales: number[]) => {
    try {
        const res = await apiClient.delete(`/sale`, { data: { sales } });
        return { success: true, ...res.data };
    } catch (error) {
        parseError(error as AxiosError);
        return { success: false, error };
    }
}
export const deleteProductSalesAPI = async (salesData: any[]) => {
    try {
        const res = await apiClient.delete(`/sale/products`, { data: salesData })
        return { success: true, ...res.data }
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const updateSale = async (salesData: any[]) => {
    try {
        const res = await apiClient.put(`/sale`, { sales: salesData })
        return { success: true, ...res.data }
    } catch (error) {
        parseError(error as AxiosError)
    }
}
export const updateProductSalesAPI = async (salesData: any[]) => {
    try {
        const res = await apiClient.put(`/sale/products`, salesData)
        return { success: true, ...res.data }
    } catch (error) {
        parseError(error as AxiosError)
    }
}


// export const deleteProductsByShippingAPI = async (shippingId: any, products:any) => {
//     try {
//         const res = await apiClient.get(`/sale/products/delete/${shippingId}`, products)
//         return res.data
//     } catch (error) {
//         const err = error as AxiosError
//         if (err && err.response && err.response.data) {
//             return { success: false, ...err.response.data }
//         }
//         return { success: false }

//     }
// }
// export const updateProductsByShippingAPI = async (shippingId: any, products:any) => {
//     try {
//         const res = await apiClient.get(`/sale/products/update/${shippingId}`, products)
//         return res.data
//     } catch (error) {
//         const err = error as AxiosError
//         if (err && err.response && err.response.data) {
//             return { success: false, ...err.response.data }
//         }
//         return { success: false }

//     }
// }

export const deleteSaleByIdAPI = async (id: string, sucursalId: string) => {
    try {
        const res = await apiClient.delete(`/sale/${id}`, { data: { id_sucursal: sucursalId } });
        return { success: true, ...res.data };
    } catch (error) {
        parseError(error as AxiosError);
        return { success: false };
    }
};

export const updateSaleByIdAPI = async (id: string, data: any) => {
    try {
        const res = await apiClient.put(`/sale/${id}`, data);
        return { success: true, ...res.data };
    } catch (error) {
        parseError(error as AxiosError);
        return { success: false };
    }
};