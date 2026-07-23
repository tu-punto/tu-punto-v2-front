import { AxiosError } from "axios";
import { apiClient } from "./apiClient";

const handleError = (error: unknown) => {
  const err = error as AxiosError;
  if (err?.response?.data) return { success: false, ...(err.response.data as object) };
  return { success: false };
};

export const getSellerPromotionsAPI = async (params?: {
  q?: string;
  scope?: "all" | "interno" | "catalogo" | "ambos";
  state?: string;
  page?: number;
  limit?: number;
}) => {
  try {
    const res = await apiClient.get("/product-promotions", { params });
    return res.data;
  } catch (error) {
    return {
      success: false,
      rows: [],
      total: 0,
      page: Number(params?.page || 1),
      limit: Number(params?.limit || 12)
    };
  }
};

export const getSellerPromotionVariantOptionsAPI = async (params?: { q?: string }) => {
  try {
    const res = await apiClient.get("/product-promotions/variant-options", { params });
    return res.data;
  } catch (error) {
    return { success: false, rows: [] };
  }
};

export const createSellerPromotionAPI = async (payload: any) => {
  try {
    const res = await apiClient.post("/product-promotions", payload);
    return res.data;
  } catch (error) {
    return handleError(error);
  }
};

export const updateSellerPromotionAPI = async (id: string, payload: any) => {
  try {
    const res = await apiClient.patch(`/product-promotions/${id}`, payload);
    return res.data;
  } catch (error) {
    return handleError(error);
  }
};

export const deleteSellerPromotionAPI = async (id: string) => {
  try {
    const res = await apiClient.delete(`/product-promotions/${id}`);
    return res.data;
  } catch (error) {
    return handleError(error);
  }
};

export const previewSellerPromotionAPI = async (payload: any) => {
  try {
    const res = await apiClient.post("/product-promotions/preview", payload);
    return res.data;
  } catch (error) {
    return handleError(error);
  }
};
