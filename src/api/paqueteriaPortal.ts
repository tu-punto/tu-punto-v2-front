import { apiClient } from "./apiClient";

export const getMyCourierAPI = async () => (await apiClient.get("/paqueterias/me")).data;
export const getCourierOrdersAPI = async () => (await apiClient.get("/paqueteria-portal/orders")).data;
export const createCourierOrderAPI = async (data: unknown) => (await apiClient.post("/paqueteria-portal/orders", data)).data;
export const updateCourierOrderAPI = async (id: string, data: unknown) => (await apiClient.put(`/paqueteria-portal/orders/${id}`, data)).data;
export const annulCourierOrderAPI = async (id: string, reason?: string) => (await apiClient.post(`/paqueteria-portal/orders/${id}/annul`, { reason })).data;
