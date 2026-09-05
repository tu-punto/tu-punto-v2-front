export const READY_FOR_PICKUP_STATUS = "LISTO PARA RECOGER";
export const IN_TRANSIT_STATUS = "En camino";
export const SEND_TO_BRANCH_STATUS = "PARA ENVIAR A OTRA SUCURSAL";
export const PICKED_UP_BY_VENDOR_LABEL = "Recogido por vendedor";

const normalizeText = (value: unknown) => String(value || "").trim();
export const INTERNAL_SALE_STATUS = "interno";
export const WAITING_RAW_STATUS = "En Espera";

const isPickedUpEligibleOrder = (order?: any) => Boolean(
  order?.simple_package_order ||
  order?.simple_package_source_id ||
  order?.is_external ||
  String(order?.service_origin || "").trim() === "simple_package" ||
  String(order?.service_origin || "").trim() === "external"
);

export const isPickedUpByVendorVisualStatus = (status: unknown, order?: any) =>
  isPickedUpEligibleOrder(order) &&
  normalizeText(status).toLowerCase() === "entregado" &&
  order?.mostrar_recogido_por_vendedor === true;

export const isDeliveredLikeStatus = (status: unknown) =>
  ["entregado", PICKED_UP_BY_VENDOR_LABEL.toLowerCase()].includes(normalizeText(status).toLowerCase());

export const resolvePickupStatus = (status: unknown, order?: any) => {
  const normalizedStatus = normalizeText(status);
  if (isPickedUpByVendorVisualStatus(normalizedStatus, order)) return PICKED_UP_BY_VENDOR_LABEL;
  if (normalizedStatus && normalizedStatus !== WAITING_RAW_STATUS) return normalizedStatus;

  return READY_FOR_PICKUP_STATUS;
};
