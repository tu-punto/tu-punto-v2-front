import { getSalesHistoryAPI } from "../api/shipping";
import { getDailyServiceIncomeAPI } from "../api/financeFlux";

export interface IDailySummary {
  cash: number;
  bank: number;
  total: number;
}

export const getDailySummary = async (dateISO?: string): Promise<IDailySummary> => {
  const sucursalId = localStorage.getItem("sucursalId");
  const date = dateISO || new Date().toISOString();

  // Get sales history
  const response = await getSalesHistoryAPI(date, sucursalId, { fromLastClose: true });
  
  let efectivoTotal = 0;
  let qrTotal = 0;

  if (response.success) {
    const { efectivo, qr } = response.totales;
    efectivoTotal = efectivo;
    qrTotal = qr;
  }

  // Get service income from FinanceFlux
  try {
    const serviceIncomes = await getDailyServiceIncomeAPI(date, sucursalId || "");
    
    if (Array.isArray(serviceIncomes)) {
      serviceIncomes.forEach((flux: any) => {
        const concepto = String(flux.concepto || "").toLowerCase();
        if (concepto.includes("efectivo")) {
          efectivoTotal += flux.monto || 0;
        } else if (concepto.includes("qr")) {
          qrTotal += flux.monto || 0;
        }
      });
    }
  } catch (error) {
    console.log("No se pudo obtener ingresos de FinanceFlux:", error);
  }

  return {
    cash: efectivoTotal,
    bank: qrTotal,
    total: efectivoTotal + qrTotal,
  };
};

