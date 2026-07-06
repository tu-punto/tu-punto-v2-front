type DeliveryRecordLike = {
  estado_pedido?: unknown;
  delivered?: unknown;
  hora_entrega_real?: unknown;
  fecha_pedido?: unknown;
};

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

const toDateOrNull = (value: unknown): Date | null => {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value as any);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isDeliveryEditLockedAfterFiveDays = (record?: DeliveryRecordLike | null): boolean => {
  if (!record) return false;

  const isDelivered =
    String(record.estado_pedido || "").trim().toLowerCase() === "entregado" || record.delivered === true;
  if (!isDelivered) return false;

  const deliveredAt = toDateOrNull(record.hora_entrega_real) || toDateOrNull(record.fecha_pedido);
  if (!deliveredAt) return false;

  return Date.now() - deliveredAt.getTime() >= FIVE_DAYS_MS;
};
