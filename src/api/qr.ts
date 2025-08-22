import { AxiosError } from "axios";
import { apiClient } from "./apiClient";
import { parseError } from "./util";

export const getShippingQRByIdAPI = async (id: string) => {
  try {
    const res = await apiClient.get(`/shipping/qr/${id}`);
    return res.data;
  } catch (error) {
    parseError(error as AxiosError);
  }
};
