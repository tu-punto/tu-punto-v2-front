import { AxiosError } from "axios"
import { apiClient, apiClientNoJSON } from "./apiClient"
import { parseError } from "./util"

export const getSellersAPI = async (params?: {
    q?: string;
    status?: "activo" | "debe_renovar" | "ya_no_es_cliente" | "declinando_servicio";
    pendingPayment?: "con_deuda" | "sin_deuda";
}) => {
    try {
        const res = await apiClient.get(`/seller`, { params })
        return res.data
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const renewSellerAPI = async (id: string | number, data: any) => {
    try {
        const res = await apiClient.put(`/seller/renew/${id}`, data);
        return { success: true, data: res.data }
    } catch (error) {
        const axiosError = error as AxiosError;
        throw axiosError;
    }
}

export const autoRenewSellersAPI = async () => {
    try {
        const res = await apiClient.post(`/seller/auto-renew`);
        return { success: true, data: res.data }
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const getSellerAPI = async (sellerId: string) => {
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

export const paySellerDebtAPI = async (sellerId: string,
    payload: { payAll: boolean }) => {
    try {
        const res = await apiClient.post(`/seller/${sellerId}/pay`, payload, {responseType: 'blob'});
        return { success: true, data: res.data }
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const requestSellerPaymentAPI = async (sellerId: string, payload: FormData) => {
    try {
        const res = await apiClientNoJSON.post(`/seller/${sellerId}/payment-request`, payload)
        return { success: true, data: res.data }
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const declineSellerServiceAPI = async (sellerId: string) => {
    try {
        const res = await apiClient.post(`/seller/${sellerId}/decline-service`)
        return { success: true, data: res.data }
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const adminDeclineSellerServiceAPI = async (sellerId: string) => {
    try {
        const res = await apiClient.post(`/seller/${sellerId}/admin-decline-service`)
        return { success: true, data: res.data }
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const cancelSellerServiceDeclineAPI = async (sellerId: string) => {
    try {
        const res = await apiClient.post(`/seller/${sellerId}/cancel-decline-service`)
        return { success: true, data: res.data }
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const getSellerDebtsAPI  = async (sellerId: string) => {
    try {
        const res = await apiClient.get(`/seller/${sellerId}/debts`)
        return { success: true, data: res.data }
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const getPaymentProofsBySellerIdAPI = async (sellerId: any) => {
    try {
        const res = await apiClient.get(`/seller/${sellerId}/payment-proofs`)
        return res.data
    } catch (error) {
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { success: false }

    }
}

export const getSellersBasicAPI = async (params?: {
    sucursalId?: string;
    onlyProductInfoAccess?: boolean;
    onlySimplePackageAccess?: boolean;
    includeProductInfoStatus?: boolean;
    onlyActiveOrRenewal?: boolean;
}) => {
    try {
        const res = await apiClient.get(`/seller/basic`, { params });
        return res.data;
    } catch (error) {
        parseError(error as AxiosError);
    }
}
