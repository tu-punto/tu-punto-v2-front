import { AxiosError } from "axios";
import { apiClient } from "./apiClient";

const parseError = (error: AxiosError) => {
  const err = error;
  if (err && err.response && err.response.data) {
    return { success: false, ...err.response.data };
  }
  return { succcess: false };
};

export const getSucursalsAPI = async () => {
  try {
    const response = await apiClient.get("/sucursal");
    return response.data;
  } catch (error) {
    parseError(error as AxiosError);
  }
};

export const registerSucursalAPI = async (newSucursal: any) => {
  try {
    const response = await apiClient.post("/sucursal", newSucursal);
    return response.data;
  } catch (error) {
    parseError(error as AxiosError);
  }
};

export const updateSucursalAPI = async (
    sucursalId: string,
    updateData: any
) => {
  try {
    const response = await apiClient.put(`/sucursal/${sucursalId}`, updateData); // <--- sin "newData"
    return response.data;
  } catch (error) {
    return parseError(error as AxiosError);
  }
};