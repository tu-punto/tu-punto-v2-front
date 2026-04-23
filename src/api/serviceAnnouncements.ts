import { apiClient, apiClientNoJSON } from "./apiClient";

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

export const createServiceAnnouncementAPI = async (payload: {
  title: string;
  version: string;
  summary?: string;
  body: string;
  regulation?: string;
  policyText?: string;
  targetRoles: string[];
  requireAcceptance?: boolean;
  sendPush?: boolean;
  publishNow?: boolean;
  linkAttachments?: Array<{
    title?: string;
    url: string;
  }>;
  attachmentFiles?: File[];
}) => {
  const formData = new FormData();

  formData.append("title", payload.title);
  formData.append("version", payload.version);
  formData.append("body", payload.body);
  formData.append("targetRoles", JSON.stringify(payload.targetRoles || []));
  formData.append("requireAcceptance", String(payload.requireAcceptance !== false));
  formData.append("sendPush", String(payload.sendPush !== false));
  formData.append("publishNow", String(Boolean(payload.publishNow)));

  if (payload.summary !== undefined) formData.append("summary", payload.summary);
  if (payload.regulation !== undefined) formData.append("regulation", payload.regulation);
  if (payload.policyText !== undefined) formData.append("policyText", payload.policyText);
  if (payload.linkAttachments !== undefined) {
    formData.append("linkAttachments", JSON.stringify(payload.linkAttachments));
  }

  (payload.attachmentFiles || []).forEach((file) => {
    formData.append("attachments", file);
  });

  const response = await apiClientNoJSON.post("/service-announcements", formData);
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
