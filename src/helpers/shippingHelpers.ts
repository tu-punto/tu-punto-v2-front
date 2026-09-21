import { getSalesHistoryAPI } from "../api/shipping";
import { getDailyServiceIncomeAPI } from "../api/financeFlux";

export interface IDailySummary {
  cash: number;
  bank: number;
  corrective: number;
  total: number;
}

export const toLocalNaiveISOString = (value: Date) =>
  new Date(
    Date.UTC(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      value.getHours(),
      value.getMinutes(),
      value.getSeconds(),
      value.getMilliseconds()
    )
  ).toISOString();

export const getDailySummary = async (
  dateISO?: string,
  closingAtISO?: string
): Promise<IDailySummary> => {
  const sucursalId = localStorage.getItem("sucursalId");
  const date = dateISO || new Date().toISOString();
  const closeAt = closingAtISO || toLocalNaiveISOString(new Date());

  // Get sales history
  const response = await getSalesHistoryAPI(date, sucursalId, {
    fromLastClose: true,
    to: closeAt,
  });
  
  let efectivoTotal = 0;
  let qrTotal = 0;
  let correctivoTotal = 0;

  const salesTotals = response?.totales_cierre || response?.totales;
  if (salesTotals) {
    efectivoTotal = Number(salesTotals.efectivo) || 0;
    qrTotal = Number(salesTotals.qr) || 0;
    correctivoTotal = Number(salesTotals.correctivo) || 0;
  }

  // Get service income from FinanceFlux
  try {
    const serviceIncomes = await getDailyServiceIncomeAPI(date, sucursalId || "", {
      fromLastClose: true,
      to: closeAt,
    });
    
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
    corrective: correctivoTotal,
    total: efectivoTotal + qrTotal,
  };
};

