import { apiClient } from "./apiClient";

export const getMyCourierAPI = async () => (await apiClient.get("/paqueterias/me")).data;
export const getCourierRoutesAPI = async () => (await apiClient.get("/paqueteria-portal/routes")).data;
export const getCourierOrdersAPI = async () => (await apiClient.get("/paqueteria-portal/orders")).data;
export const createCourierOrderAPI = async (data: unknown) => (await apiClient.post("/paqueteria-portal/orders", data)).data;
export const updateCourierOrderAPI = async (id: string, data: unknown) => (await apiClient.put(`/paqueteria-portal/orders/${id}`, data)).data;
export const annulCourierOrderAPI = async (id: string, reason?: string) => (await apiClient.post(`/paqueteria-portal/orders/${id}/annul`, { reason })).data;
export const getExternalCourierOrdersAPI = async () => (await apiClient.get("/paqueteria-externa-portal/orders")).data;
export const createExternalCourierOrderAPI = async (data: unknown) => (await apiClient.post("/paqueteria-externa-portal/orders", data)).data;
export const updateExternalCourierOrderAPI = async (id: string, data: unknown) => (await apiClient.put(`/paqueteria-externa-portal/orders/${id}`, data)).data;
export const annulExternalCourierOrderAPI = async (id: string) => (await apiClient.post(`/paqueteria-externa-portal/orders/${id}/annul`)).data;
