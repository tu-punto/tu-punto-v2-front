import { AxiosError } from "axios";
import { apiClient } from "./apiClient";
import { parseError } from "./util";

const getShippingsAPI = async () => {
  try {
    const res = await apiClient.get("/shipping");
    return res.data;
  } catch (error) {
    const err = error as AxiosError;
    if (err && err.response && err.response.data) {
      return { success: false, ...err.response.data };
    }
    return { success: false };
  }
};

const getShippingsListAPI = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  from?: string;
  to?: string;
  originId?: string;
  sellerId?: string;
  client?: string;
  guide?: string;
}) => {
  try {
    const res = await apiClient.get("/shipping/list", { params });
    return res.data;
  } catch (error) {
    const err = error as AxiosError;
    if (err && err.response && err.response.data) {
      return { success: false, ...err.response.data };
    }
    return { success: false };
  }
};

const getShipingByIdsAPI = async (ids: number[]) => {
  try {
    const idsString = ids.join(",");
    const res = await apiClient.get(`/shipping/${idsString}`);
    return { success: true, data: res.data };
  } catch (error) {
    const err = error as AxiosError;
    if (err && err.response && err.response.data) {
      return { success: false, ...err.response.data };
    }
    return { success: false };
  }
};

const registerShippingAPI = async (shippingData: any) => {
  try {
    const res = await apiClient.post("/shipping/register", shippingData);
    return { success: true, ...res.data };
  } catch (error) {
    const err = error as AxiosError;
    if (err && err.response && err.response.data) {
      return { success: false, ...err.response.data };
    }
    return { success: false };
  }
};

const registerSalesToShippingAPI = async (salesData: any) => {
  try {
    console.log("📤 Enviando ventas al backend:", salesData); // 👀
    const res = await apiClient.post("/shipping/register/sales", salesData);
    return { success: true, ...res.data };
  } catch (error) {
    console.error("❌ Error al llamar registerSalesToShippingAPI:", error); // 👈 AÑADE ESTO
    const err = error as AxiosError;
    if (err && err.response && err.response.data) {
      return { success: false, ...err.response.data };
    }
    return { success: false };
  }
};

const getShippingByIdAPI = async (id: string) => {
  try {
    const res = await apiClient.get(`/shipping/by/${id}`);
    return res.data;
  } catch (error) {
    const err = error as AxiosError;
    if (err && err.response && err.response.data) {
      return { success: false, ...err.response.data };
    }
    return { success: false };
  }
};


const updateShippingAPI = async (updateShippingData: any, shippingId: string) => {
  try {
    const currentBranchId = localStorage.getItem("sucursalId") || undefined;
    const res = await apiClient.put(`/shipping/${shippingId}`, {
      ...updateShippingData,
      currentBranchId,
    });
    return { success: true, ...res.data };
  } catch (error) {
    const err = error as AxiosError;
    if (err && err.response && err.response.data) {
      return { success: false, ...err.response.data };
    }
    return { success: false };
  }
};
const addTemporaryProductsToShippingAPI = async (shippingId: string, productosTemporales: any[]) => {
  try {
    const res = await apiClient.put(`/shipping/${shippingId}/temporales`, {
      productos_temporales: productosTemporales,
    });
    return { success: true, ...res.data };
  } catch (error) {
    const err = error as AxiosError;
    if (err && err.response && err.response.data) {
      return { success: false, ...err.response.data };
    }
    return { success: false };
  }
};

const getShippingsBySellerIdAPI = async (sellerId: any) => {
  try {
    const res = await apiClient.get(`/shipping/seller/${sellerId}`);
    return res;
  } catch (error) {
    parseError(error as AxiosError);
  }
};
const deleteShippingAPI = async (id: string) => {
  try {
    const res = await apiClient.delete(`/shipping/${id}`);
    return { success: true, ...res.data };
  } catch (error) {
    return { success: false };
  }
};
const getSalesHistoryAPI = async (
  date?: string,
  sucursalId?: string,
  options?: { fromLastClose?: boolean; to?: string }
) => {
  try {
    const params = new URLSearchParams();
    if (date) params.append("date", date);
    if (sucursalId) params.append("sucursalId", sucursalId);
    if (options?.fromLastClose) params.append("fromLastClose", "true");
    if (options?.to) params.append("to", options.to);

    const res = await apiClient.get(`/shipping/history/sales?${params.toString()}`);
    return { success: true, ...res.data };
  } catch (error) {
    const err = error as AxiosError;
    if (err && err.response && err.response.data) {
      return { success: false, ...err.response.data };
    }
    return { success: false };
  }
};

export {
  getShippingsAPI,
  getShippingsListAPI,
  registerShippingAPI,
  registerSalesToShippingAPI,
  updateShippingAPI,
  getShipingByIdsAPI,
  getShippingByIdAPI,
  getShippingsBySellerIdAPI,
  addTemporaryProductsToShippingAPI,
  deleteShippingAPI,
  getSalesHistoryAPI
};
