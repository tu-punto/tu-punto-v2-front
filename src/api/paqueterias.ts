import { apiClient } from "./apiClient";
export const getPaqueteriasAPI = async () => (await apiClient.get("/paqueterias")).data;
export const createPaqueteriaAPI = async (data: unknown) => (await apiClient.post("/paqueterias", data)).data;
export const updatePaqueteriaAPI = async (id: string, data: unknown) => (await apiClient.put(`/paqueterias/${id}`, data)).data;
