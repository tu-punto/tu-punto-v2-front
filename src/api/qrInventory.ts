import { apiClient } from "./apiClient";

export const getQRInventoryAPI = (sucursalId: string) => apiClient.get("/qr-inventory/by-branch", { params: { sucursalId } }).then((r) => r.data);
export const createQRInventoryAPI = (sucursalId: string) => apiClient.post("/qr-inventory", { sucursalId }).then((r) => r.data);
export const scanQRInventoryAPI = (id: string, payload: string) => apiClient.post(`/qr-inventory/${id}/scan`, { payload }).then((r) => r.data);
export const correctQRInventoryAPI = (id: string, rowId: string, countedStock: number, reason = "") => apiClient.patch(`/qr-inventory/${id}/rows/${rowId}`, { countedStock, reason }).then((r) => r.data);
export const transitionQRInventoryAPI = (id: string, status: "open" | "paused" | "closed") => apiClient.patch(`/qr-inventory/${id}/status`, { status }).then((r) => r.data);
export const downloadQRInventoryReportAPI = async (id: string) => { const response = await apiClient.get(`/qr-inventory/${id}/export/xlsx`, { responseType: "blob" }); const url = URL.createObjectURL(response.data); const link = document.createElement("a"); link.href = url; link.download = `inventario_qr_${id}.xlsx`; link.click(); URL.revokeObjectURL(url); };
