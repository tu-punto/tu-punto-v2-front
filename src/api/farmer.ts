import { apiClient } from "./apiClient";
export const getFarmerSummaryAPI = async (id: string) => (await apiClient.get(`/user/farmers/${id}/summary`)).data;
