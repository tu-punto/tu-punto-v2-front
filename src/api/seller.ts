import { AxiosError } from "axios"
import { apiClient } from "./apiClient"
import { parseError } from "./util"

export const getSellersAPI = async () => {
    try {
        const res = await apiClient.get(`/seller`)
        return res.data
    } catch (error) {
        parseError(error as AxiosError)
    }
}
export const getSellerAPI = async (sellerId:number) => {
    try {
        const res = await apiClient.get(`/seller/${sellerId}`)
        return res.data
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const registerSellerAPI = async (sellerData: any) => {
    try {
        const res = await apiClient.post(`/seller/register`, sellerData)
        return res.data
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const updateSellerAPI = async (sellerId: number, updateData: any) => {
    try {
        const res = await apiClient.put(`/seller/update/${sellerId}`, { newData: updateData })
        return { success: true, data: res.data }
    } catch (error) {
        parseError(error as AxiosError)
    }
}