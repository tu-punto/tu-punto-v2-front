import { apiClient } from "./apiClient"; 

export const getServicesSummaryAPI = async () => {
  const response = await apiClient.get("/seller/summary/services");
  return response.data;
};
