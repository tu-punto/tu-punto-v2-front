import { AxiosError } from "axios";
import { apiClient } from "./apiClient";

const handleError = (error: unknown) => {
  const err = error as AxiosError;
  if (err?.response?.data) return { success: false, ...(err.response.data as any) };
  return { success: false };
};

export const getActionTracesAPI = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  actionType?: string;
  actionTypes?: string;
  sourceModule?: string;
  entityType?: string;
  actorUserId?: string;
  actorRole?: string;
  q?: string;
  from?: string;
  to?: string;
  order?: "asc" | "desc";
}) => {
  try {
    const res = await apiClient.get("/action-traces", { params });
    return res.data;
  } catch (error) {
    console.error("Error al obtener trazabilidad:", error);
    return {
      success: false,
      rows: [],
      total: 0,
      page: Number(params?.page || 1),
      limit: Number(params?.limit || 20),
      pages: 1,
      summary: { success: 0, failed: 0 },
    };
  }
};

export const getActionTraceActorsAPI = async () => {
  try {
    const res = await apiClient.get("/action-traces/actors");
    return res.data;
  } catch (error) {
    console.error("Error al obtener usuarios de trazabilidad:", error);
    return {
      success: false,
      rows: [],
    };
  }
};

export const getActionTraceApiError = handleError;
