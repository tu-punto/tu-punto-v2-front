import { apiClient, apiClientNoJSON } from "./apiClient";

export const getContractDocumentsAPI = async () => (await apiClient.get("/contract-documents")).data;
export const createContractDocumentAPI = async (data: FormData) => (await apiClientNoJSON.post("/contract-documents", data)).data;
export const activateContractDocumentAPI = async (id: string) => (await apiClient.post(`/contract-documents/${id}/activate`)).data;
export const getSellerSendDocumentsAPI = async (sellerId: string) => (await apiClient.get(`/contract-documents/seller/${sellerId}/send-documents`)).data;
export const getSellerContractHistoryAPI = async (sellerId: string) => (await apiClient.get(`/contract-documents/seller/${sellerId}/history`)).data;
export const getContractGenerationDownloadAPI = async (generationId: string) => (await apiClient.get(`/contract-documents/generation/${generationId}/download`)).data;
export const generateServiceOrderAPI = async (sellerId: string, data: unknown) => apiClient.post(`/contract-documents/seller/${sellerId}/service-order`, data, { responseType: "blob" });
export const generateContractAPI = async (sellerId: string, data: unknown) => apiClient.post(`/contract-documents/seller/${sellerId}/contract`, data, { responseType: "blob" });
