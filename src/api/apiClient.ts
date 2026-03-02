import axios, { AxiosInstance } from "axios";
import { SERVER_URL } from "../config/config";

export const apiClient = axios.create({
  baseURL: SERVER_URL,
  withCredentials: true, // para las cookies
  headers: {
    "Content-Type": "application/json",
  },
});

export const apiClientNoJSON = axios.create({
  baseURL: SERVER_URL,
  withCredentials: true, // para las cookies
});

const isExcludedAuthEndpoint = (url?: string) => {
  if (!url) return false;
  return url.includes("/user/login") || url.includes("/user/info");
};

const handleAuthRedirect = (status?: number, url?: string) => {
  const currentHash = window.location.hash || "";

  if (status === 401 && !isExcludedAuthEndpoint(url)) {
    const isAlreadyOnLogin =
      currentHash.startsWith("#/login-admin") || currentHash.startsWith("#/login-seller");
    if (!isAlreadyOnLogin) {
      window.location.hash = "/login-admin";
    }
  }

  if (status === 403) {
    const isUnauthorizedPage = currentHash.startsWith("#/unauthorized");
    if (!isUnauthorizedPage) {
      window.location.hash = "/unauthorized";
    }
  }
};

const attachAuthInterceptor = (client: AxiosInstance) => {
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status as number | undefined;
      const url = error?.config?.url as string | undefined;
      handleAuthRedirect(status, url);
      return Promise.reject(error);
    }
  );
};

attachAuthInterceptor(apiClient);
attachAuthInterceptor(apiClientNoJSON);
