import { AxiosError } from "axios";
import { apiClient } from "./apiClient";
import { parseError } from "./util";

const getShippingsAPI = async () => {
  try {
    const res = await apiClient.get("/shipping");
    return res.data;
  } catch (error) {
    const err = error as AxiosError;
    if (err && err.response && err.response.data) {
      return { success: false, ...err.response.data };
    }
    return { success: false };
  }
};

const getShipingByIdsAPI = async (ids: number[]) => {
  try {
    const idsString = ids.join(",");
    const res = await apiClient.get(`/shipping/${idsString}`);
    return { success: true, data: res.data };
  } catch (error) {
    const err = error as AxiosError;
    if (err && err.response && err.response.data) {
      return { success: false, ...err.response.data };
    }
    return { success: false };
  }
};

const registerShippingAPI = async (shippingData: any) => {
  try {
    const res = await apiClient.post("/shipping/register", shippingData);
    return { success: true, ...res.data };
  } catch (error) {
    const err = error as AxiosError;
    if (err && err.response && err.response.data) {
      return { success: false, ...err.response.data };
    }
    return { success: false };
  }
};

const registerSalesToShippingAPI = async (salesData: any) => {
  console.log("Registering sales data:", salesData);
  try {
    const res = await apiClient.post("/shipping/register/sales", salesData);
    return { success: true, ...res.data };
  } catch (error) {
    const err = error as AxiosError;
    if (err && err.response && err.response.data) {
      return { success: false, ...err.response.data };
    }
    return { success: false };
  }
};
const getShippingByIdAPI = async (id: string) => {
  try {
    const res = await apiClient.get(`/shipping/by/${id}`);
    return res.data;
  } catch (error) {
    const err = error as AxiosError;
    if (err && err.response && err.response.data) {
      return { success: false, ...err.response.data };
    }
    return { success: false };
  }
};


const updateShippingAPI = async (updateShippingData: any, shippingId: string) => {
  try {
    const res = await apiClient.put(`/shipping/${shippingId}`, updateShippingData);
    return { success: true, ...res.data };
  } catch (error) {
    return { success: false };
  }
};
const addTemporaryProductsToShippingAPI = async (shippingId: string, productosTemporales: any[]) => {
  try {
    const res = await apiClient.put(`/shipping/${shippingId}/temporales`, {
      productos_temporales: productosTemporales,
    });
    return { success: true, ...res.data };
  } catch (error) {
    const err = error as AxiosError;
    if (err && err.response && err.response.data) {
      return { success: false, ...err.response.data };
    }
    return { success: false };
  }
};

const getShippingsBySellerIdAPI = async (sellerId: any) => {
  try {
    const res = await apiClient.get(`/shipping/seller/${sellerId}`);
    return res;
  } catch (error) {
    parseError(error as AxiosError);
  }
};

export {
  getShippingsAPI,
  registerShippingAPI,
  registerSalesToShippingAPI,
  updateShippingAPI,
  getShipingByIdsAPI,
  getShippingByIdAPI,
  getShippingsBySellerIdAPI,
  addTemporaryProductsToShippingAPI,
};
