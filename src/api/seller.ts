import { AxiosError } from "axios"
import { apiClient, apiClientNoJSON } from "./apiClient"
import { parseError } from "./util"

export const getSellersAPI = async (params?: {
    q?: string;
    status?: "activo" | "debe_renovar" | "ya_no_es_cliente" | "declinando_servicio";
    pendingPayment?: "con_deuda" | "sin_deuda";
    assignedPaymentDay?: "sin_solicitud" | "8" | "18" | "28";
    sortBy?: "nombre" | "estado" | "pago_pendiente" | "fecha_vigencia" | "fecha_pago_asignada" | "pago_mensual" | "comision_porcentual" | "emite_factura";
    sortOrder?: "asc" | "desc";
    page?: number;
    pageSize?: number;
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

export const declineSellerServiceAPI = async (
    sellerId: string,
    payload?: {
        motivo_principal?: string;
        motivo_principal_otro?: string;
        probabilidad_retorno?: string;
        omitir_motivo_principal?: boolean;
        omitir_probabilidad_retorno?: boolean;
    }
) => {
    try {
        const res = await apiClient.post(`/seller/${sellerId}/decline-service`, payload || {})
        return { success: true, data: res.data }
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const adminDeclineSellerServiceAPI = async (
    sellerId: string,
    payload?: {
        motivo_principal?: string;
        motivo_principal_otro?: string;
        probabilidad_retorno?: string;
        omitir_motivo_principal?: boolean;
        omitir_probabilidad_retorno?: boolean;
    }
) => {
    try {
        const res = await apiClient.post(`/seller/${sellerId}/admin-decline-service`, payload || {})
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

export const getSellerDashboardAPI = async (sellerId: string, params?: { months?: number }) => {
    try {
        const res = await apiClient.get(`/seller/${sellerId}/dashboard`, { params })
        return res.data
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const createSellerRecoveryChargeAPI = async (
    sellerId: string,
    payload: { monto: number; concepto: string; fecha?: string }
) => {
    try {
        const res = await apiClient.post(`/seller/${sellerId}/recovery-charge`, payload)
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
