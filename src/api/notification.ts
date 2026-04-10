import { AxiosError } from "axios";
import { apiClient } from "./apiClient";

const fallbackError = (error: unknown) => {
  const err = error as AxiosError;
  return {
    success: false,
    message: (err.response?.data as any)?.message || err.message || "Error inesperado",
  };
};

export const getPushPublicConfigAPI = async () => {
  try {
    const res = await apiClient.get("/notification/push/public-key");
    return res.data;
  } catch (error) {
    return fallbackError(error);
  }
};

export const getNotificationsAPI = async (limit = 20) => {
  try {
    const res = await apiClient.get("/notification", {
      params: { limit },
    });
    return res.data;
  } catch (error) {
    return fallbackError(error);
  }
};

export const getUnreadNotificationsCountAPI = async () => {
  try {
    const res = await apiClient.get("/notification/unread-count");
    return res.data;
  } catch (error) {
    return fallbackError(error);
  }
};

export const markNotificationAsReadAPI = async (id: string) => {
  try {
    const res = await apiClient.patch(`/notification/${id}/read`);
    return res.data;
  } catch (error) {
    return fallbackError(error);
  }
};

export const markAllNotificationsAsReadAPI = async () => {
  try {
    const res = await apiClient.patch("/notification/read-all");
    return res.data;
  } catch (error) {
    return fallbackError(error);
  }
};

export const registerInternalPushSubscriptionAPI = async (subscription: unknown) => {
  try {
    const res = await apiClient.post("/notification/push-subscriptions", { subscription });
    return res.data;
  } catch (error) {
    return fallbackError(error);
  }
};

export const getPublicTrackingAPI = async (code: string) => {
  try {
    const res = await apiClient.get(`/tracking/${encodeURIComponent(code)}`);
    return res.data;
  } catch (error) {
    return fallbackError(error);
  }
};

export const registerBuyerPushSubscriptionAPI = async (code: string, subscription: unknown) => {
  try {
    const res = await apiClient.post(`/tracking/${encodeURIComponent(code)}/push-subscriptions`, {
      subscription,
    });
    return res.data;
  } catch (error) {
    return fallbackError(error);
  }
};
