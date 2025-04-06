import { getFinancesFluxAPI } from "../api/financeFlux";
import { FinanceFlux } from "../models/financeFluxModel";
import { FLUX_TYPES, DATE_TAGS } from "../constants/fluxes";
import { getShippingsAPI } from "../api/shipping";
import { Shipping } from "../models/shippingModel";
import dayjs from "dayjs";

export const getFilteredStats = async (filter: string, dateRange: any = []) => {
  const fluxes: FinanceFlux[] = await getFinancesFluxAPI();
  const shippings: Shipping[] = await getShippingsAPI();
  let income = 0,
    expenses = 0,
    deliveryIncome = 0,
    deliveryExpenses = 0;

  let startDate: Date | null = null;
  let endDate: Date | null = new Date();

  switch (filter) {
    case DATE_TAGS.LAST_7_DAYS:
      startDate = dayjs().subtract(7, "day").toDate();
      break;
    case DATE_TAGS.LAST_30_DAYS:
      startDate = dayjs().subtract(30, "day").toDate();
      break;
    case DATE_TAGS.LAST_90_DAYS:
      startDate = dayjs().subtract(90, "day").toDate();
      break;
    case DATE_TAGS.LAST_YEAR:
      startDate = dayjs().startOf("year").toDate();
      break;
    case DATE_TAGS.CUSTOM:
      [startDate, endDate] = dateRange;
      break;
    case DATE_TAGS.ALL_TIME:
    default:
      startDate = null; // Sin restricción de fecha
      break;
  }

  for (const flux of fluxes) {
    if (flux.esDeuda) continue;
    const fluxDate = new Date(flux.fecha);
    if ((!startDate || fluxDate >= startDate) && fluxDate <= endDate!) {
      if (flux.tipo.toLowerCase() === FLUX_TYPES.GASTO.toLowerCase()) {
        expenses += Number(flux.monto);
      }
      if (flux.tipo.toLowerCase() === FLUX_TYPES.INGRESO.toLowerCase()) {
        income += Number(flux.monto);
      }
    }
  }

  for (const shipping of shippings) {
    const shippingDate = new Date(shipping.fecha_pedido);
    if ((!startDate || shippingDate >= startDate) && shippingDate <= endDate!) {
      deliveryIncome += shipping.cargo_delivery;
      deliveryExpenses += shipping.costo_delivery;
    }
  }

  const stats = {
    expenses: expenses,
    income: income,
    utility: income - expenses,
    deliveryIncome: deliveryIncome,
    deliveryExpenses: deliveryExpenses,
  };

  return stats;
};
