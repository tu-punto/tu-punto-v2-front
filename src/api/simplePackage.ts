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

export const getUploadedSimplePackageSellersAPI = async () => {
  try {
    const res = await apiClient.get("/simple-packages/uploaded-sellers");
    return res.data;
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

export const deleteSimplePackageAPI = async (id: string) => {
  try {
    const res = await apiClient.delete(`/simple-packages/${id}`);
    return { success: true, ...res.data };
  } catch (error) {
    return parseAxiosError(error);
  }
};
