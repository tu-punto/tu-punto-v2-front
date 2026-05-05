import { AxiosError } from "axios";
import { apiClient } from "./apiClient";

const handleError = (error: unknown) => {
    const err = error as AxiosError<any>;
    if (err?.response?.data) return { success: false, ...err.response.data };
    return { success: false };
};

export type StockWithdrawalRequestItemPayload = {
    productId: string;
    variantKey?: string;
    variantLabel?: string;
    variantes?: Record<string, string>;
    quantity: number;
};

export const getStockWithdrawalRequestsAPI = async (params?: {
    branchId?: string;
    status?: "pending" | "approved" | "rejected" | "all";
}) => {
    try {
        const res = await apiClient.get("/stock-withdrawals", { params });
        return res.data;
    } catch (error) {
        return handleError(error);
    }
};

export const createStockWithdrawalRequestAPI = async (payload: {
    branchId: string;
    items: StockWithdrawalRequestItemPayload[];
    comment?: string;
}) => {
    try {
        const res = await apiClient.post("/stock-withdrawals", payload);
        return res.data;
    } catch (error) {
        return handleError(error);
    }
};

export const approveStockWithdrawalRequestAPI = async (id: string) => {
    try {
        const res = await apiClient.post(`/stock-withdrawals/${id}/approve`);
        return res.data;
    } catch (error) {
        return handleError(error);
    }
};

export const rejectStockWithdrawalRequestAPI = async (id: string, reason?: string) => {
    try {
        const res = await apiClient.post(`/stock-withdrawals/${id}/reject`, { reason });
        return res.data;
    } catch (error) {
        return handleError(error);
    }
};
