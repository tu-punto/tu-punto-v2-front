import { AxiosError } from "axios";
import { apiClient } from "./apiClient";

const failed = (error: unknown) => ({ success: false, message: ((error as AxiosError<any>)?.response?.data?.message as string | undefined) || "No se pudo completar la operacion" });

export const getDynamicQRsAPI = async (params?: { q?: string; active?: boolean; page?: number; limit?: number }) => {
  try { return (await apiClient.get("/dynamic-qr", { params })).data; } catch (error) { return { ...failed(error), rows: [], total: 0 }; }
};
export const createDynamicQRAPI = async (payload: { name: string; destinationUrl: string; active: boolean }) => {
  try { return (await apiClient.post("/dynamic-qr", payload)).data; } catch (error) { return failed(error); }
};
export const updateDynamicQRAPI = async (id: string, payload: Partial<{ name: string; destinationUrl: string; active: boolean }>) => {
  try { return (await apiClient.patch(`/dynamic-qr/${id}`, payload)).data; } catch (error) { return failed(error); }
};
export const downloadDynamicQRAPI = async (code: string) => {
  const response = await apiClient.get(`/dynamic-qr/${code}/image`, { responseType: "blob" });
  return response.data as Blob;
};
