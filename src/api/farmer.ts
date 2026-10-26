import { apiClient } from "./apiClient";
export const getFarmerSummaryAPI = async (id: string) => (await apiClient.get(`/user/farmers/${id}/summary`)).data;
export const settleFarmerBalanceAPI = async (id: string, observacion?: string) => (await apiClient.post(`/user/farmers/${id}/settle`, { observacion })).data;
