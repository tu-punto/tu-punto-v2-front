import { AxiosError } from "axios";
import { apiClient } from "./apiClient";

const handleError = (error: unknown) => {
  const err = error as AxiosError;
  if (err?.response?.data) return { success: false, ...(err.response.data as any) };
  return { success: false };
};

export const getInventoryAuditMovementsAPI = async (params?: {
  from?: string;
  to?: string;
  sellerId?: string;
  productId?: string;
  branchId?: string;
  eventType?: string;
  actorUserId?: string;
  direction?: string;
  q?: string;
  page?: number;
  limit?: number;
}) => {
  try {
    const res = await apiClient.get("/inventory-audit/movements", { params });
    return res.data;
  } catch (error) {
    console.error("Error al obtener auditoria de stock:", error);
    return {
      success: false,
      rows: [],
      total: 0,
      page: Number(params?.page || 1),
      limit: Number(params?.limit || 20),
      pages: 1,
      summary: {
        movementCount: 0,
        totalOut: 0,
        totalIn: 0,
        uniqueProducts: 0,
        byType: [],
        byActor: [],
        topProducts: [],
      },
    };
  }
};

export const getInventoryAuditEventDetailAPI = async (eventId: string) => {
  try {
    const res = await apiClient.get(`/inventory-audit/events/${eventId}`);
    return res.data;
  } catch (error) {
    return handleError(error);
  }
};

export const downloadInventoryAuditXlsxAPI = async (params?: {
  from?: string;
  to?: string;
  sellerId?: string;
  productId?: string;
  branchId?: string;
  eventType?: string;
  actorUserId?: string;
  direction?: string;
  q?: string;
}) => {
  try {
    const res = await apiClient.get("/inventory-audit/export/xlsx", {
      params,
      responseType: "blob",
    });
    const blob = new Blob([res.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const disposition = String(res.headers?.["content-disposition"] || "");
    const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
    link.href = url;
    link.download = filenameMatch?.[1] || `inventory_audit_${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    return { success: true };
  } catch (error) {
    console.error("Error al exportar auditoria de stock:", error);
    return handleError(error);
  }
};
