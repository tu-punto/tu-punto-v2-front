import dayjs from "dayjs";
import { getShippingsAPI } from "../api/shipping";
import { Shipping } from "../models/shippingModel";
import { ESTADO_PEDIDO, TIPO_PAGO } from "../constants/shippingConsts";
import { getProductByShippingAPI } from "../api/sales";
import { ISale } from "../models/saleModel";

export interface IDailySummary {
  cash: number;
  bank: number;
  total: number;
}
export const getDailySummary = async (): Promise<IDailySummary> => {
  const shippings: Shipping[] = await getShippingsAPI();
  let cash = 0;
  let bank = 0;
  const today = dayjs().startOf("day");
  for (const shipping of shippings) {
    const shippingDate = dayjs(shipping.fecha_pedido);
    if (!shippingDate.isSame(today, "day")) {
      continue;
    }
    if (
      shipping.estado_pedido.toLowerCase() !==
      ESTADO_PEDIDO.ENTREGADO.toLowerCase()
    ) {
      continue;
    }

    const sales = await getProductByShippingAPI(shipping.id_pedido);
    if (!Array.isArray(sales)) {
      continue;
    }

    const total = sales.reduce((acc: number, sale: ISale) => {
      return acc + sale.cantidad * sale.precio_unitario;
    }, 0);

    const pending = total - shipping.adelanto_cliente + shipping.cargo_delivery;
    const tipoPago = shipping.tipo_de_pago.toLowerCase().trim();

    if (tipoPago === TIPO_PAGO.EFECTIVO.toLowerCase().trim()) {
      cash += pending;
    }
    if (tipoPago === TIPO_PAGO.TRANSFERENCIA_O_QR.toLowerCase()) {
      bank += pending;
    }
  }
  const res = {
    cash: cash,
    bank: bank,
    total: cash + bank,
  };
  return res;
};
