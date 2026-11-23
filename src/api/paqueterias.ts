import { apiClient } from "./apiClient";
export const getPaqueteriasAPI = async () => (await apiClient.get("/paqueterias")).data;
export const createPaqueteriaAPI = async (data: unknown) => (await apiClient.post("/paqueterias", data)).data;
export const updatePaqueteriaAPI = async (id: string, data: unknown) => (await apiClient.put(`/paqueterias/${id}`, data)).data;
export const checkPaqueteriaGuideCodeAPI = async (codigoGuia: number, excludeId?: string) =>
  (await apiClient.get("/paqueterias/guide-code-availability", { params: { codigo_guia: codigoGuia, excludeId } })).data;
export const uploadPaqueteriaLogoAPI = async (id: string, file: File) => {
  const formData = new FormData();
  formData.append("logo", file);
  return (await apiClient.post(`/paqueterias/${id}/logo`, formData, { headers: { "Content-Type": "multipart/form-data" } })).data;
};
