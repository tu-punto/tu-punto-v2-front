import { AxiosError } from "axios";
import { apiClient } from "./apiClient";
import { parseError } from "./util";

export const getBoxClosesAPI = async () => {
  try {
    const res = await apiClient.get("/boxClose");
    return res.data;
  } catch (error) {
    parseError(error as AxiosError);
  }
};

export const getBoxCloseSummaryAPI = async (params?: {
  from?: string;
  to?: string;
  sucursalIds?: string[];
}) => {
  try {
    const res = await apiClient.get("/boxClose/summary", {
      params: {
        from: params?.from,
        to: params?.to,
        sucursalIds: params?.sucursalIds?.join(","),
      },
    });
    return res.data;
  } catch (error) {
    parseError(error as AxiosError);
  }
};

export const registerBoxCloseAPI = async (boxCloseData: any) => {
  try {
    const res = await apiClient.post("/boxClose/register", boxCloseData);
    return res.data;
  } catch (error) {
    parseError(error as AxiosError);
  }
};

export const getBoxCloseByIdAPI = async (id: string) => {
  try {
    const res = await apiClient.get(`/boxClose/${id}`);
    return res.data;
  } catch (error) {
    parseError(error as AxiosError);
  }
};

export const updateBoxCloseAPI = async (id: string, boxCloseData: any) => {
  try {
    const res = await apiClient.patch(`/boxClose/${id}`, boxCloseData);
    return res.data;
  } catch (error) {
    parseError(error as AxiosError);
  }
};
