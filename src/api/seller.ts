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

export const renewSellerAPI = (id: string | number, data: any) => {
    apiClient.put(`/seller/renew/${id}`, data);
}

export const getSellerAPI = async (sellerId: number) => {
    try {
        const res = await apiClient.get(`/seller/${sellerId}`)
        return res.data
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const registerSellerAPI = async (sellerData: any) => {
    try {
        console.log("Seller Data", sellerData);
        const res = await apiClient.post(`/seller/register`, sellerData)
        return res.data
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const updateSellerAPI = async (sellerId: string, updateData: any) => {
    try {
        const res = await apiClient.put(`/seller/update/${sellerId}`, { newData: updateData })
        return { success: true, data: res.data }
    } catch (error) {
        parseError(error as AxiosError)
    }
}