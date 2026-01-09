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

export const updateFinanceFluxAPI = async (id: string, data: any) => {
    try {
        const res = await apiClient.put(`/financeFlux/${id}`, data);
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

export const paySellerDebtAPI = (fluxId: string) => {
    apiClient.patch(`/financeFlux/${fluxId}/pay`);
}

export const getFinanceFluxCategoriesAPI = async () => {
    try {
        const res = await apiClient.get(`/financeFlux/category`)
        console.log("Categorias de flujo financiero:", res.data)
        return res.data
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const registerFinanceFluxCategoryAPI = async (categoryData: any) => {
    try {
        const res = await apiClient.post(`/financeFlux/category`, categoryData)
        return res.data
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const deleteFinanceFluxCategoryAPI = async (id: string) => {
    try {
        const res = await apiClient.delete(`/financeFlux/category/${id}`)
        return res.data
    } catch (error) {
        parseError(error as AxiosError)
    }
}

export const getFinancialSummaryAPI = async () => {
  const res = await apiClient.get("/financeFlux/financial-summary");
  return res.data;
};

export const getCommissionAPI = async (options?: {
    range?: string;
    from?: string;
    to?: string;
}) => {
    try {
        const params = new URLSearchParams();
        if (options?.range) params.append("range", options.range);
        if (options?.from) params.append("from", options.from);
        if (options?.to) params.append("to", options.to);
        const qs = params.toString();
        const url = qs ? `/financeFlux/commission?${qs}` : "/financeFlux/commission";
        const res = await apiClient.get(url);
        return res.data;
    } catch (error) {
        parseError(error as AxiosError);
    }
};

export const getMerchandiseSoldAPI = async (options?: {
    range?: string;
    from?: string;
    to?: string;
}) => {
    try {
        const params = new URLSearchParams();
        if (options?.range) params.append("range", options.range);
        if (options?.from) params.append("from", options.from);
        if (options?.to) params.append("to", options.to);
        const qs = params.toString();
        const url = qs ? `/financeFlux/merchandise-sold?${qs}` : "/financeFlux/merchandise-sold";
        const res = await apiClient.get(url);
        return res.data;
    } catch (error) {
        parseError(error as AxiosError);
    }
};

