import { AxiosError } from "axios"
import { apiClient } from "./apiClient"
import { parseError } from "./util"

export const getProductsEntryAmount = async (sellerId: any) => {
    try {
        const res = await apiClient.get(`/entry/seller/${sellerId}`)
        return res.data
    } catch (error) {
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { succcess: false }
    }
}
export const getProductHistoryEntriesByProductIdAPI = async (productId: any) => {
    try {
        const res = await apiClient.get(`/entry/product/${productId}`)
        return res.data
    } catch (error) {
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { succcess: false }
    }
}
export const deleteEntryProductsAPI = async (entries: any[]) => {
    try {
        const res = await apiClient.delete(`/entry`, { data: { entries } });
        return { success: true, ...res.data };
    } catch (error) {
        parseError(error as AxiosError);
        return { success: false, error };
    }
}

export const deleteProductEntriesAPI = async (entriesData: any[]) => {
    try {
        const res = await apiClient.delete(`/entry/products`, { data: entriesData })
        return { success: true, ...res.data }
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const updateEntry = async (entriesData: any[]) => {
    try {
        const res = await apiClient.put(`/entry`, { entries: entriesData })
        return { success: true, ...res.data }
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const updateProductEntriesAPI = async (entriesData: any[]) => {
    try {
        const res = await apiClient.put(`/entry/products`,entriesData)
        return { success: true, ...res.data }
    } catch (error) {
        parseError(error as AxiosError)
    }
}

// TODO: Put this createEntryAPI into the registerVariantAPI to avoid this extra request, be careful with the other requests that use this function.
export const createEntryAPI = async (entryData:any) => {
    try {
        const res = await apiClient.post(`/entry`,entryData)
        return res.data
    } catch (error) {
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { success: false }
    }
}
