export const READY_FOR_PICKUP_STATUS = "LISTO PARA RECOGER";
export const IN_TRANSIT_STATUS = "En camino";

const normalizeText = (value: unknown) => String(value || "").trim();

const resolveBranchId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value?._id || value?.id_sucursal || value?.$oid || "").trim();
};

export const resolvePickupStatus = (status: unknown, order?: any) => {
  const normalizedStatus = normalizeText(status);
  if (normalizedStatus && normalizedStatus !== "En Espera") return normalizedStatus;

  const originBranchId =
    resolveBranchId(order?.lugar_origen) ||
    resolveBranchId(order?.origen_sucursal) ||
    resolveBranchId(order?.sucursal);
  const destinationBranchId =
    resolveBranchId(order?.destino_sucursal) ||
    resolveBranchId(order?.sucursal);

  if (originBranchId && destinationBranchId && originBranchId !== destinationBranchId) {
    return IN_TRANSIT_STATUS;
  }

  return READY_FOR_PICKUP_STATUS;
};
