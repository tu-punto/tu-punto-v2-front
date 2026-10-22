import { apiClient } from "./apiClient";
export const getFarmerDiscountRulesAPI = async () => (await apiClient.get("/farmer-discount-rules")).data;
export const getFarmerBonusRulesAPI = async () => (await apiClient.get("/farmer-discount-rules/bonus")).data;
export const createFarmerDiscountRuleAPI = async (data: any) => (await apiClient.post("/farmer-discount-rules", data)).data;
export const updateFarmerDiscountRuleAPI = async (id: string, data: any) => (await apiClient.put(`/farmer-discount-rules/${id}`, data)).data;
export const deleteFarmerDiscountRuleAPI = async (id: string) => (await apiClient.delete(`/farmer-discount-rules/${id}`)).data;
