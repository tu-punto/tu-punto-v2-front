import { AxiosError } from "axios";
import { apiClient } from "./apiClient";

const parseAxiosError = (error: unknown) => {
  const err = error as AxiosError;
  if (err?.response?.data) {
    return { success: false, ...(err.response.data as object) };
  }
  return { success: false };
};

export const registerSimplePackagesAPI = async (payload: any) => {
  try {
    const res = await apiClient.post("/simple-packages/register", payload);
    return { success: true, ...res.data };
  } catch (error) {
    return parseAxiosError(error);
  }
};

export const getSimplePackagesListAPI = async (params?: {
  sellerId?: string;
  originBranchId?: string;
  from?: string;
  to?: string;
}) => {
  try {
    const res = await apiClient.get("/simple-packages/list", { params });
    return res.data;
  } catch (error) {
    return parseAxiosError(error);
  }
};

export const getUploadedSimplePackageSellersAPI = async (params?: { originBranchId?: string }) => {
  try {
    const res = await apiClient.get("/simple-packages/uploaded-sellers", { params });
    return res.data;
  } catch (error) {
    return parseAxiosError(error);
  }
};

export const getSimplePackageBranchPricesAPI = async (params?: { originBranchId?: string }) => {
  try {
    const res = await apiClient.get("/simple-packages/branch-prices", { params });
    return res.data;
  } catch (error) {
    return parseAxiosError(error);
  }
};

export const getSellerAccountingSimplePackagesAPI = async (params?: { sellerId?: string }) => {
  try {
    const res = await apiClient.get("/simple-packages/seller-accounting", { params });
    return res.data;
  } catch (error) {
    return parseAxiosError(error);
  }
};

export const upsertSimplePackageBranchPriceAPI = async (payload: {
  originBranchId: string;
  destinationBranchId: string;
  precio?: number;
}) => {
  try {
    const res = await apiClient.post("/simple-packages/branch-prices", payload);
    return { success: true, ...res.data };
  } catch (error) {
    return parseAxiosError(error);
  }
};

export const updateSimplePackageAPI = async (id: string, payload: any) => {
  try {
    const res = await apiClient.put(`/simple-packages/${id}`, payload);
    return { success: true, ...res.data };
  } catch (error) {
    return parseAxiosError(error);
  }
};

export const createSimplePackageOrdersAPI = async (payload: { packageIds: string[]; paymentMethod?: "efectivo" | "qr" | "" }) => {
  try {
    const res = await apiClient.post("/simple-packages/create-orders", payload);
    return { success: true, ...res.data };
  } catch (error) {
    return parseAxiosError(error);
  }
};

export const printSimplePackageGuidesAPI = async (payload: { packageIds: string[] }) => {
  try {
    const res = await apiClient.post("/simple-packages/print-guides", payload);
    return { success: true, ...res.data };
  } catch (error) {
    return parseAxiosError(error);
  }
};

export type PackageEscalationRange = {
  from: number;
  to?: number | null;
  small_price: number;
  large_price: number;
};

export type PackageDeliverySpace = {
  size: string;
  spaces: number;
};

export const getPackageEscalationConfigAPI = async (params?: { routeId?: string }) => {
  try {
    const res = await apiClient.get("/simple-packages/escalation-config", { params });
    return res.data;
  } catch (error) {
    return parseAxiosError(error);
  }
};

export const upsertPackageEscalationConfigAPI = async (payload: {
  routeId?: string;
  serviceOrigin: "external" | "simple_package" | "delivery";
  ranges: PackageEscalationRange[];
  deliverySpaces?: PackageDeliverySpace[];
}) => {
  try {
    const res = await apiClient.post("/simple-packages/escalation-config", payload);
    return { success: true, ...res.data };
  } catch (error) {
    return parseAxiosError(error);
  }
};

export const getSimplePackageEscalationStatusAPI = async (params: { routeId?: string; sellerId?: string }) => {
  try {
    const res = await apiClient.get("/simple-packages/escalation-status", { params });
    return res.data;
  } catch (error) {
    return parseAxiosError(error);
  }
};

export const sendSimplePackageGuideWhatsappAPI = async (payload: { packageIds: string[] }) => {
  try {
    const res = await apiClient.post("/simple-packages/send-guide-whatsapp", payload);
    return { success: true, ...res.data };
  } catch (error) {
    return parseAxiosError(error);
  }
};

export const deleteSimplePackageAPI = async (id: string) => {
  try {
    const res = await apiClient.delete(`/simple-packages/${id}`);
    return { success: true, ...res.data };
  } catch (error) {
    return parseAxiosError(error);
  }
};
