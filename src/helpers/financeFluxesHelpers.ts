import { getFinancesFluxAPI, getFinancialSummaryAPI } from "../api/financeFlux";
import { FinanceFlux } from "../models/financeFluxModel";
import { FLUX_TYPES, DATE_TAGS } from "../constants/fluxes";
import { getShippingsAPI } from "../api/shipping";
import { Shipping } from "../models/shippingModel";
import dayjs from "dayjs";

export const getFilteredStats = async (filter: string, dateRange: any = []) => {
  // Para "TODO EL TIEMPO", usar el endpoint financial-summary directamente
  if (filter === DATE_TAGS.ALL_TIME) {
    const summary = await getFinancialSummaryAPI();
    
    // Obtener todos los shippings para calcular delivery income y expenses
    const allShippings: Shipping[] = await getShippingsAPI();
    let deliveryIncome = 0;
    let deliveryExpenses = 0;
    
    for (const shipping of allShippings) {
      deliveryIncome += Number(shipping.cargo_delivery || 0);
      deliveryExpenses += Number(shipping.costo_delivery || 0);
    }
    
    return {
      income: summary.ingresos,
      expenses: summary.gastos,
      investments: summary.inversiones,
      utility: summary.utilidad,
      deliveryIncome: deliveryIncome,
      deliveryExpenses: deliveryExpenses,
      deliveryBalance: summary.balanceDelivery,
    };
  }

  // Para los demás filtros, calcular con fechas
  const fluxes: FinanceFlux[] = await getFinancesFluxAPI();
  const shippings: Shipping[] = await getShippingsAPI();
  let income = 0,
    expenses = 0,
    investments = 0,
    deliveryIncome = 0,
    deliveryExpenses = 0;

  let startDate: Date | null = null;
  let endDate: Date | null = dayjs().endOf("day").toDate();

  switch (filter) {
    case DATE_TAGS.LAST_7_DAYS:
      startDate = dayjs().subtract(7, "day").startOf("day").toDate();
      break;
    case DATE_TAGS.LAST_30_DAYS:
      startDate = dayjs().subtract(30, "day").startOf("day").toDate();
      break;
    case DATE_TAGS.LAST_90_DAYS:
      startDate = dayjs().subtract(90, "day").startOf("day").toDate();
      break;
    case DATE_TAGS.LAST_YEAR:
      startDate = dayjs().startOf("year").toDate();
      break;
    case DATE_TAGS.CUSTOM:
      if (dateRange && dateRange.length === 2) {
        [startDate, endDate] = dateRange;
        startDate = startDate ? dayjs(startDate).startOf("day").toDate() : null;
        endDate = endDate ? dayjs(endDate).endOf("day").toDate() : dayjs().endOf("day").toDate();
      } else {
        // Si no hay rango seleccionado, no filtrar (mostrar todo)
        startDate = null;
      }
      break;
    default:
      startDate = null; // Sin restricción de fecha
      break;
  }

  for (const flux of fluxes) {
    if (flux.esDeuda) continue;
    const fluxDate = dayjs(flux.fecha).startOf("day").toDate();
    if ((!startDate || fluxDate >= startDate) && fluxDate <= endDate!) {
      if (flux.tipo.toLowerCase() === FLUX_TYPES.GASTO.toLowerCase()) {
        expenses += Number(flux.monto);
      }
      if (flux.tipo.toLowerCase() === FLUX_TYPES.INGRESO.toLowerCase()) {
        income += Number(flux.monto);
      }
      if (flux.tipo.toLowerCase() === 'inversion') {
        investments += Number(flux.monto);
      }
    }
  }

  for (const shipping of shippings) {
    const shippingDate = dayjs(shipping.fecha_pedido).startOf("day").toDate();
    if ((!startDate || shippingDate >= startDate) && shippingDate <= endDate!) {
      deliveryIncome += Number(shipping.cargo_delivery || 0);
      deliveryExpenses += Number(shipping.costo_delivery || 0);
  
    } 
  }

  const stats = {
    expenses: expenses,
    income: income,
    investments: investments,
    utility: income - expenses,
    deliveryIncome: deliveryIncome,
    deliveryExpenses: deliveryExpenses,
    deliveryBalance: deliveryIncome - deliveryExpenses,
  };

  return stats;
};
