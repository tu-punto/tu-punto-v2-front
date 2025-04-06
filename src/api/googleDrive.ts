import { AxiosError } from "axios"
import { apiClient } from "./apiClient"
import { parseError } from "./util"

export const generateDeliveredProductsAPI = async (bodyTable: any) => {
    try {
        console.log({bodyTable})
        const res = await apiClient.post('/pdf/productsDeliveried', {bodyTable})
        return res.data
    } catch (error) {
        return parseError(error as AxiosError)
    }
}

export const generatePaymentAPI = async (sellerId: number) => {
    try {
        const res = await apiClient.post(`/pdf/payment/${sellerId}`)
        
        return res.data
    } catch (error) {
        return parseError(error as AxiosError)
    }
}