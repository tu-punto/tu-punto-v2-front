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

export const getPendingBoxCloseOperationsAPI = async (params: {
  branchId: string;
  businessDate: string;
}) => {
  try {
    const res = await apiClient.get("/boxClose/pending-operations", { params });
    return res.data;
  } catch (error) {
    parseError(error as AxiosError);
    return { success: false, operations: [] };
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

export const registerBranchTransferBoxCloseOperationAPI = async (payload: {
  sourceKey: string;
  branchId: string;
  amount: number;
  method: "efectivo" | "qr";
  mode: "send" | "receive";
  occurredAt?: string;
  packageCount?: number;
}) => {
  try {
    const res = await apiClient.post("/boxClose/branch-transfer-operation", payload);
    return res.data;
  } catch (error) {
    parseError(error as AxiosError);
    return { success: false };
  }
};
