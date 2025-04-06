import { AxiosError } from "axios";
import { apiClient } from "./apiClient";
import { parseError } from "./util";

export const checkLoginAPI = async (userData: any) => {
  try {
    const res = await apiClient.post("/user/login", userData);
    return { success: true, data: res.data };
  } catch (error) {
    console.log(error)
    parseError(error as AxiosError);
  }
};
export const getUserByCookieAPI = async () => {
  try {
    const res = await apiClient.get("/user/info");
    return { success: true, data: res.data };
  } catch (error) {
    parseError(error as AxiosError);
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
