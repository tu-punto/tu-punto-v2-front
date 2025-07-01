import { getSalesHistoryAPI } from "../api/shipping";

export interface IDailySummary {
  cash: number;
  bank: number;
  total: number;
}

export const getDailySummary = async (dateISO?: string): Promise<IDailySummary> => {
  const sucursalId = localStorage.getItem("sucursalId");
  const date = dateISO || new Date().toISOString();

  const response = await getSalesHistoryAPI(date, sucursalId);

  if (response.success) {
    const { efectivo, qr } = response.totales;
    return {
      cash: efectivo,
      bank: qr,
      total: efectivo + qr,
    };
  }

  return { cash: 0, bank: 0, total: 0 };
};

