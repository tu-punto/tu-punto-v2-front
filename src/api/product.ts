import { AxiosError } from "axios"
import { apiClient } from "./apiClient"
import { parseError } from "./util"

export const getProductsAPI = async () => {
    try {
        const res = await apiClient.get(`/product`)
        return res.data
    } catch (error) {
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { success: false }
    }
}

export const registerProductAPI = async (productData: any) => {
    try {
        const res = await apiClient.post(`/product/register`, productData)
        return res.data
    } catch (error) {
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { success: false }
    }
}

export const registerVariantAPI = async (productData: any) => {
    try {
        const res = await apiClient.post('/product/registerVariant', {
            product: productData.product,
            stock: productData.stock
        })
        return res.data
    } catch (error) {
        console.log(error)
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { success: false }
    }
}

export const getProductCategoryAPI = async (productId: any) => {
    try {
        const res = await apiClient.get(`/product/category/${productId}`)
        return res.data
    } catch (error) {
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { succcess: false }
    }
}

export const getAllProductsEntryAmountBySellerId = async (sellerId: any) => {
    try {
        const res = await apiClient.get(`/product/seller/${sellerId}`)
        return res.data
    } catch (error) {
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { succcess: false }
    }
}

export const getProductFeaturesAPI = async (productId: any) => {
    try {
        const res = await apiClient.get(`/product/features/${productId}`)
        return res.data
    } catch (error) {
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { success: false }

    }
}

export const addProductFeaturesAPI = async (featsData: any) => {
    try {
        const { id_producto, feats } = featsData

        const res = await apiClient.post(`/product/addFeatures`, {
            productId: id_producto,
            features: feats

        })
        return res.data
    } catch (error) {
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { success: false }
    }
}

export const addProductStockAPI = async (productStockValues: any) => {
    try {
        const res = await apiClient.post('/product/addStock', productStockValues)
        return res.data
    } catch (error) {
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { success: false }
    }
}
export const updateProductStockAPI = async (newStock: any) => {
    try {
        const res = await apiClient.put('/product/updateStock', { newStock })
        return res.data
    } catch (error) {
        parseError(error as AxiosError)
    }
}
