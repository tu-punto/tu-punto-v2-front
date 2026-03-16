import { AxiosError } from "axios";
import { apiClient } from "./apiClient";
import { parseError } from "./util";

export const getShippingQRByIdAPI = async (id: string) => {
  try {
    const res = await apiClient.get(`/shipping/qr/${id}`);
    return res.data;
  } catch (error) {
    parseError(error as AxiosError);
  }
};

export const generateShippingLabelQRAPI = async (id: string, forceRegenerate = false) => {
  try {
    const res = await apiClient.get(`/shipping/${id}/qr`, {
      params: { forceRegenerate }
    });
    return res.data;
  } catch (error) {
    return { success: false, error };
  }
};

export const getProductQRByIdAPI = async (id: string) => {
  try {
    const res = await apiClient.get(`/product/qr/${id}`);
    return res.data;
  } catch (error) {
    parseError(error as AxiosError);
  }
};

export const resolveVariantQRPayloadAPI = async (payload: string, sucursalId?: string) => {
  try {
    const res = await apiClient.get("/product/variant-qr/resolve", {
      params: {
        payload,
        sucursalId
      }
    });
    return res.data;
  } catch (error) {
    return { success: false, error };
  }
};

export const generateVariantQRAPI = async (params: {
  productId: string;
  variantKey: string;
  forceRegenerate?: boolean;
}) => {
  try {
    const res = await apiClient.post("/product/variant-qr/generate", params);
    return res.data;
  } catch (error) {
    return { success: false, error };
  }
};

export const batchGenerateVariantQRAPI = async (params: {
  sellerId?: string;
  sucursalId?: string;
  productIds?: string[];
  onlyMissing?: boolean;
  forceRegenerate?: boolean;
}) => {
  try {
    const res = await apiClient.post("/product/variant-qr/batch-generate", params);
    return res.data;
  } catch (error) {
    return { success: false, error };
  }
};

export const listVariantQRAPI = async (params: {
  sellerId?: string;
  sucursalId?: string;
  productIds?: string[];
  limit?: number;
}) => {
  try {
    const res = await apiClient.get("/product/variant-qr/list", {
      params: {
        sellerId: params.sellerId,
        sucursalId: params.sucursalId,
        productIds: params.productIds?.join(","),
        limit: params.limit
      }
    });
    return res.data;
  } catch (error) {
    return { success: false, error };
  }
};

export const resolveShippingQRPayloadAPI = async (payload: string) => {
  try {
    const res = await apiClient.get("/shipping/qr/resolve", {
      params: { payload }
    });
    return res.data;
  } catch (error) {
    return { success: false, error };
  }
};

export const createVariantQRGroupAPI = async (params: {
  name: string;
  sellerId: string;
  items: Array<{
    productId: string;
    variantKey: string;
  }>;
}) => {
  try {
    const res = await apiClient.post("/product/variant-qr-group/create", params);
    return res.data;
  } catch (error) {
    return { success: false, error };
  }
};

export const updateVariantQRGroupAPI = async (
  id: string,
  params: {
    name?: string;
    active?: boolean;
    items?: Array<{
      productId: string;
      variantKey: string;
    }>;
  }
) => {
  try {
    const res = await apiClient.put(`/product/variant-qr-group/${id}`, params);
    return res.data;
  } catch (error) {
    return { success: false, error };
  }
};

export const getVariantQRGroupByIdAPI = async (id: string, sucursalId?: string) => {
  try {
    const res = await apiClient.get(`/product/variant-qr-group/${id}`, {
      params: { sucursalId }
    });
    return res.data;
  } catch (error) {
    return { success: false, error };
  }
};

export const listVariantQRGroupAPI = async (params?: {
  sellerId?: string;
  q?: string;
  active?: boolean;
  limit?: number;
}) => {
  try {
    const res = await apiClient.get("/product/variant-qr-group/list", {
      params: {
        sellerId: params?.sellerId,
        q: params?.q,
        active: params?.active,
        limit: params?.limit
      }
    });
    return res.data;
  } catch (error) {
    return { success: false, error };
  }
};

export const generateVariantQRGroupAPI = async (id: string, forceRegenerate = false) => {
  try {
    const res = await apiClient.post(`/product/variant-qr-group/${id}/generate-qr`, {
      forceRegenerate
    });
    return res.data;
  } catch (error) {
    return { success: false, error };
  }
};

export const resolveVariantQRGroupPayloadAPI = async (payload: string, sucursalId?: string) => {
  try {
    const res = await apiClient.get("/product/variant-qr-group/resolve", {
      params: {
        payload,
        sucursalId
      }
    });
    return res.data;
  } catch (error) {
    return { success: false, error };
  }
};

export const transitionShippingStatusByQRAPI = async (params: {
  payload?: string;
  shippingCode?: string;
  shippingId?: string;
  toStatus: string;
  changedBy?: string;
  note?: string;
}) => {
  try {
    const res = await apiClient.patch("/shipping/qr/transition", params);
    return res.data;
  } catch (error) {
    return { success: false, error };
  }
};

export const getShippingStatusHistoryAPI = async (shippingId: string) => {
  try {
    const res = await apiClient.get(`/shipping/${shippingId}/status-history`);
    return res.data;
  } catch (error) {
    return { success: false, error };
  }
};
