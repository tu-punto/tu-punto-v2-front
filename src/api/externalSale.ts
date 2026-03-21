import { AxiosError } from "axios";
import { apiClient } from "./apiClient";

const getExternalSalesAPI = async () => {
    try {
        const res = await apiClient.get("/external");
        return res.data;
    } catch (error) {
        const err = error as AxiosError;
        if (err && err.response && err.response.data) {
            return {success: false, ...err.response.data};
        }
        return {success: false}
    }
}

const getExternalSalesListAPI = async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    from?: string;
    to?: string;
    sucursalId?: string;
    client?: string;
}) => {
    try {
        const res = await apiClient.get("/external/list", { params });
        return res.data;
    } catch (error) {
        const err = error as AxiosError;
        if (err && err.response && err.response.data) {
            return {success: false, ...err.response.data};
        }
        return {success: false}
    }
}

const getExternalSaleByIdAPI = async (id: string) => {
    try {
        const res = await apiClient.get(`/external/${id}`);
        return res.data;
    } catch (error) {
        const err = error as AxiosError;
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data };
        }
        return { success: false };
    }
}

const registerExternalSaleAPI = async (saleData: any) => {
    try {
        const res = await apiClient.post("/external/register", saleData);
        return {success: true, ...res.data};
    } catch (error) {
        const err = error as AxiosError;
        if (err && err.response && err.response.data) {
            return {success: false, ...err.response.data};
        }
        return {success: false}
    }

}

const registerExternalPackagesAPI = async (payload: any) => {
    try {
        const res = await apiClient.post("/external/register-packages", payload);
        return { success: true, ...res.data };
    } catch (error) {
        const err = error as AxiosError;
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data };
        }
        return { success: false };
    }
}

const updateExternalSaleAPI = async (saleId: any, saleData: any) => {
    try {
        const res = await apiClient.put(`/external/update/${saleId}`, saleData);
        return {success: true, ...res.data};
    } catch (error) {
        const err = error as AxiosError;
        if (err && err.response && err.response.data) {
            return {success: false, ...err.response.data};
        }
        return {success: false}
    }

}

export {
    getExternalSalesAPI,
    getExternalSalesListAPI,
    getExternalSaleByIdAPI,
    registerExternalSaleAPI,
    registerExternalPackagesAPI,
    updateExternalSaleAPI,
}
