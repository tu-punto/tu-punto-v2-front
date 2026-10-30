import { apiClient, apiClientNoJSON } from "./apiClient";

export const getTermsDocumentAPI = async () => (await apiClient.get("/terms-document")).data;

export const replaceTermsDocumentAPI = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return (await apiClientNoJSON.put("/terms-document", formData)).data;
};
