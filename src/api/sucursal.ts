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

export const getAllSucursalsAPI = async () => {
  try {
    const response = await apiClient.get("/sucursal");
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("Error API getSucursals:", error);
    return {
      success: false,
      message: "Fallo al obtener sucursales",
    };
  }
};

export const getSucursalHeaderInfoAPI = async (sucursalId: string) => {
  try {
    const response = await apiClient.get(`/sucursal/${sucursalId}/header-info`);
    return response.data;
  } catch (error) {
    return parseError(error as AxiosError);
  }
};

export const uploadSucursalHeaderImageAPI = async (
  sucursalId: string,
  file: File
) => {
  try {
    const formData = new FormData();
    formData.append("imagen", file);

    const response = await apiClient.post(`/sucursal/${sucursalId}/header-image`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    return parseError(error as AxiosError);
  }
};
