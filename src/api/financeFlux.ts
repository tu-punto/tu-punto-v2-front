import { AxiosError } from "axios"
import { apiClient } from "./apiClient"
import { parseError } from "./util"

export const getFinancesFluxAPI = async () => {
    try {
        const res = await apiClient.get(`/financeFlux`)
        return res.data
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const registerFinanceFluxAPI = async (financeFluxData: any) => {
    try {
        const res = await apiClient.post(`/financeFlux/register`, financeFluxData)
        return res.data
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const getSellerByShippingAPI = async (sellerId: any) => {
    try {
        const res = await apiClient.get(`/financeFlux/seller/${sellerId}`)
        return res.data
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const getWorkerByShippingAPI = async (workerId: any) => {
    try {
        const res = await apiClient.get(`/financeFlux/worker/${workerId}`)
        return res.data
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const getSellerInfoAPI = async (sellerId: any) => {
    try {
        const res = await apiClient.get(`/financeFlux/sellerInf/${sellerId}`)
        return res.data
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const getStatsAPI = async () => {
    try {
        const res = await apiClient.get(`/financeFlux/stats`)
        return res.data
    } catch (error) {
        parseError(error as AxiosError)
    }
}
