import { apiClient } from "./apiClient";

const request = async (operation: () => Promise<any>) => {
  try { return (await operation()).data; }
  catch (error: any) { return { success: false, msg: error?.response?.data?.msg || "No se pudo completar la operacion" }; }
};

export const personalInventoryApi = {
  products: (q?: string) => request(() => apiClient.get("/personal-inventory/products", { params: q ? { q } : {} })),
  createProduct: (payload: any) => request(() => apiClient.post("/personal-inventory/products", payload)),
  updateProduct: (id: string, payload: any) => request(() => apiClient.patch(`/personal-inventory/products/${id}`, payload)),
  adjustStock: (id: string, payload: any) => request(() => apiClient.post(`/personal-inventory/products/${id}/stock-adjustments`, payload)),
  createSale: (items: { productId: string; quantity: number }[]) => request(() => apiClient.post("/personal-inventory/sales", { items })),
  createExpense: (payload: any) => request(() => apiClient.post("/personal-inventory/expenses", payload)),
  history: (params: any) => request(() => apiClient.get("/personal-inventory/history", { params })),
};
