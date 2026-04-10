import { apiClient } from "./apiClient";

export const getMyServiceAnnouncementsAPI = async () => {
  const response = await apiClient.get("/service-announcements/mine");
  return response.data;
};

export const getPendingServiceAnnouncementAPI = async () => {
  const response = await apiClient.get("/service-announcements/pending");
  return response.data;
};

export const getAdminServiceAnnouncementsAPI = async () => {
  const response = await apiClient.get("/service-announcements/admin");
  return response.data;
};

export const createServiceAnnouncementAPI = async (payload: Record<string, unknown>) => {
  const response = await apiClient.post("/service-announcements", payload);
  return response.data;
};

export const publishServiceAnnouncementAPI = async (id: string) => {
  const response = await apiClient.post(`/service-announcements/${id}/publish`);
  return response.data;
};

export const acknowledgeServiceAnnouncementAPI = async (id: string) => {
  const response = await apiClient.post(`/service-announcements/${id}/acknowledge`);
  return response.data;
};

export const acceptServiceAnnouncementAPI = async (id: string) => {
  const response = await apiClient.post(`/service-announcements/${id}/accept`);
  return response.data;
};
