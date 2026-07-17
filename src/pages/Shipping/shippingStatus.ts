export const READY_FOR_PICKUP_STATUS = "LISTO PARA RECOGER";
export const IN_TRANSIT_STATUS = "En camino";
export const SEND_TO_BRANCH_STATUS = "PARA ENVIAR A OTRA SUCURSAL";

const normalizeText = (value: unknown) => String(value || "").trim();
export const INTERNAL_SALE_STATUS = "interno";
export const WAITING_RAW_STATUS = "En Espera";

export const resolvePickupStatus = (status: unknown, order?: any) => {
  const normalizedStatus = normalizeText(status);
  if (normalizedStatus && normalizedStatus !== WAITING_RAW_STATUS) return normalizedStatus;

  return READY_FOR_PICKUP_STATUS;
};
