import { apiClient } from "./apiClient";
export const getFarmerDiscountRulesAPI = async () => (await apiClient.get("/farmer-discount-rules")).data;
export const createFarmerDiscountRuleAPI = async (data: any) => (await apiClient.post("/farmer-discount-rules", data)).data;
export const deleteFarmerDiscountRuleAPI = async (id: string) => (await apiClient.delete(`/farmer-discount-rules/${id}`)).data;
