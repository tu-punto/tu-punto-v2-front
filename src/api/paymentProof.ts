import { AxiosError } from "axios"
import { apiClient } from "./apiClient"

export const getPaymentProofsBySellerIdAPI = async (sellerId: any) => {
    try {
        const res = await apiClient.get(`/paymentProof/seller/${sellerId}`)
        return res.data
    } catch (error) {
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { success: false }

    }
}