import { AxiosError } from "axios";
import { apiClient } from "./apiClient";
import { parseError } from "./util";

export const checkLoginAPI = async (userData: any) => {
  try {
    const res = await apiClient.post("/user/login", userData);
    return { success: true, data: res.data };
  } catch (error) {
    console.log(error)
    return parseError(error as AxiosError);
  }
};
export const getAdminsAPI = async () => {
  try {
    const res = await apiClient.get("/user/admins");
    return res.data;
  } catch (error) {
    parseError(error as AxiosError);
  }
};
export const getUserByCookieAPI = async () => {
  try {
    const res = await apiClient.get("/user/info");
    return res.data;
  } catch (error) {
    console.log(error);
    return { success: false };
  }
};

export const logoutUserAPI = async () => {
  try {
    const res = await apiClient.post("/user/logout");
    if (res.status !== 200) {
      throw new AxiosError("Error while logging out");
    }
    return { success: true, data: res.data };
  } catch (error) {
    parseError(error as AxiosError);
  }
};

export const registerUserAPI = async (userData: any) => {
  try {
    const res = await apiClient.post("/user/register", userData);
    return { success: true, data: res.data };
  } catch (error) {
    parseError(error as AxiosError);
  }
};

export const getUsersAPI = async () => {
  try {
    const res = await apiClient.get("/user");
    return { success: true, data: res.data.data };
  } catch (error) {
    parseError(error as AxiosError);
  }
};

export const createUserAPI = async (userData: any) => {
  try {
    const res = await apiClient.post("/user", userData);
    return { success: true, data: res.data };
  } catch (error) {
    parseError(error as AxiosError);
  }
};

export const updateUserAPI = async (id: string, userData: any) => {
  try {
    const res = await apiClient.put(`/user/${id}`, userData);
    return { success: true, data: res.data };
  } catch (error) {
    parseError(error as AxiosError);
  }
};

export const changePasswordAPI = async (passwordData: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) => {
  try {
    const res = await apiClient.post("/user/change-password", passwordData);
    return { success: true, data: res.data };
  } catch (error) {
    return parseError(error as AxiosError);
  }
};

export const resetSellerPasswordAPI = async (sellerId: string, payload: { newPassword: string }) => {
  try {
    const res = await apiClient.post(`/user/sellers/${sellerId}/reset-password`, payload);
    return { success: true, data: res.data };
  } catch (error) {
    return parseError(error as AxiosError);
  }
};

export const deleteUserAPI = async (id: string) => {
  try {
    const res = await apiClient.delete(`/user/${id}`);
    return { success: true, data: res.data };
  } catch (error) {
    parseError(error as AxiosError);
  }
};
