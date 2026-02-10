import { getFinancialSummaryAPI } from "../api/financeFlux";
import { DATE_TAGS } from "../constants/fluxes";
import dayjs from "dayjs";

export const getFilteredStats = async (filter: string, dateRange: any = []) => {
  let from: string | undefined;
  let to: string | undefined;
  let range: string | undefined;

  switch (filter) {
    case DATE_TAGS.LAST_7_DAYS:
      range = "7d";
      break;
    case DATE_TAGS.LAST_30_DAYS:
      range = "30d";
      break;
    case DATE_TAGS.LAST_90_DAYS:
      range = "90d";
      break;
    case DATE_TAGS.LAST_YEAR:
      range = "365d";
      break;
    case DATE_TAGS.CUSTOM:
      if (dateRange && dateRange.length === 2) {
        from = dateRange[0]
          ? dayjs(dateRange[0]).startOf("day").format("YYYY-MM-DD")
          : undefined;
        to = dateRange[1]
          ? dayjs(dateRange[1]).endOf("day").format("YYYY-MM-DD")
          : undefined;
        range = "custom";
      }
      break;
    case DATE_TAGS.ALL_TIME:
    default:
      range = undefined;
      break;
  }

  const summary = await getFinancialSummaryAPI({ range, from, to });
  const deliveryIncome = Number(summary?.deliveryIncome ?? 0);
  const deliveryExpenses = Number(summary?.deliveryExpenses ?? 0);
  const deliveryBalance = summary?.balanceDelivery ?? deliveryIncome - deliveryExpenses;

  return {
    income: summary?.ingresos ?? 0,
    expenses: summary?.gastos ?? 0,
    investments: summary?.inversiones ?? 0,
    utility: summary?.utilidad ?? 0,
    deliveryIncome: deliveryIncome,
    deliveryExpenses: deliveryExpenses,
    deliveryBalance: deliveryBalance,
    caja: summary?.caja ?? 0,
  };
};
