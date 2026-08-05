type ActionTraceLike = {
  actionType?: string;
  sourceModule?: string;
  entityType?: string;
  metadata?: Record<string, unknown>;
};

type ActionTraceDefinition = {
  categoryKey: string;
  categoryLabel: string;
  actionLabel: string;
  moduleLabel: string;
  entityLabel: string;
};

type ActionTracePresentation = ActionTraceDefinition & {
  sourceActionType: string;
};

const OTHER_CATEGORY_KEY = "other";

const CATEGORY_LABELS: Record<string, string> = {
  sales: "Ventas",
  shipping: "Entregas",
  entries: "Entradas",
  withdrawals: "Salidas",
  finance: "Ingresos y gastos",
  other: "Otros",
};

const ACTION_TRACE_DEFINITIONS: Record<string, ActionTraceDefinition> = {
  "sale.register": {
    categoryKey: "sales",
    categoryLabel: CATEGORY_LABELS.sales,
    actionLabel: "Venta registrada",
    moduleLabel: "Ventas",
    entityLabel: "Venta",
  },
  "sale.update": {
    categoryKey: "sales",
    categoryLabel: CATEGORY_LABELS.sales,
    actionLabel: "Venta actualizada",
    moduleLabel: "Ventas",
    entityLabel: "Venta",
  },
  "sale.delete": {
    categoryKey: "sales",
    categoryLabel: CATEGORY_LABELS.sales,
    actionLabel: "Venta eliminada",
    moduleLabel: "Ventas",
    entityLabel: "Venta",
  },
  "shipping.create": {
    categoryKey: "shipping",
    categoryLabel: CATEGORY_LABELS.shipping,
    actionLabel: "Pedido realizado",
    moduleLabel: "Entregas",
    entityLabel: "Pedido de entrega",
  },
  "shipping.attach_sales": {
    categoryKey: "shipping",
    categoryLabel: CATEGORY_LABELS.shipping,
    actionLabel: "Ventas asociadas al pedido",
    moduleLabel: "Entregas",
    entityLabel: "Pedido de entrega",
  },
  "shipping.update": {
    categoryKey: "shipping",
    categoryLabel: CATEGORY_LABELS.shipping,
    actionLabel: "Pedido actualizado",
    moduleLabel: "Entregas",
    entityLabel: "Pedido de entrega",
  },
  "shipping.delete": {
    categoryKey: "shipping",
    categoryLabel: CATEGORY_LABELS.shipping,
    actionLabel: "Pedido eliminado",
    moduleLabel: "Entregas",
    entityLabel: "Pedido de entrega",
  },
  "shipping.qr_generate": {
    categoryKey: "shipping",
    categoryLabel: CATEGORY_LABELS.shipping,
    actionLabel: "QR de entrega generado",
    moduleLabel: "Entregas",
    entityLabel: "Pedido de entrega",
  },
  "shipping.qr_resolve": {
    categoryKey: "shipping",
    categoryLabel: CATEGORY_LABELS.shipping,
    actionLabel: "QR de entrega procesado",
    moduleLabel: "Entregas",
    entityLabel: "Pedido de entrega",
  },
  "shipping.status_change": {
    categoryKey: "shipping",
    categoryLabel: CATEGORY_LABELS.shipping,
    actionLabel: "Estado de entrega actualizado",
    moduleLabel: "Entregas",
    entityLabel: "Pedido de entrega",
  },
  "shipping.seller_withdrawal": {
    categoryKey: "shipping",
    categoryLabel: CATEGORY_LABELS.shipping,
    actionLabel: "Retiro por vendedor marcado",
    moduleLabel: "Entregas",
    entityLabel: "Pedido de entrega",
  },
  "entry.create": {
    categoryKey: "entries",
    categoryLabel: CATEGORY_LABELS.entries,
    actionLabel: "Entrada de producto registrada",
    moduleLabel: "Inventario",
    entityLabel: "Entrada de producto",
  },
  "entry.update": {
    categoryKey: "entries",
    categoryLabel: CATEGORY_LABELS.entries,
    actionLabel: "Entrada de producto actualizada",
    moduleLabel: "Inventario",
    entityLabel: "Entrada de producto",
  },
  "entry.delete": {
    categoryKey: "entries",
    categoryLabel: CATEGORY_LABELS.entries,
    actionLabel: "Entrada eliminada",
    moduleLabel: "Inventario",
    entityLabel: "Entrada de producto",
  },
  "entry.update_products": {
    categoryKey: "entries",
    categoryLabel: CATEGORY_LABELS.entries,
    actionLabel: "Productos de entrada actualizados",
    moduleLabel: "Inventario",
    entityLabel: "Entrada de producto",
  },
  "entry.delete_products": {
    categoryKey: "entries",
    categoryLabel: CATEGORY_LABELS.entries,
    actionLabel: "Productos de entrada eliminados",
    moduleLabel: "Inventario",
    entityLabel: "Entrada de producto",
  },
  "stock_withdrawal.list": {
    categoryKey: "withdrawals",
    categoryLabel: CATEGORY_LABELS.withdrawals,
    actionLabel: "Solicitudes de salida consultadas",
    moduleLabel: "Inventario",
    entityLabel: "Solicitud de salida",
  },
  "stock_withdrawal.create_request": {
    categoryKey: "withdrawals",
    categoryLabel: CATEGORY_LABELS.withdrawals,
    actionLabel: "Solicitud de salida registrada",
    moduleLabel: "Inventario",
    entityLabel: "Solicitud de salida",
  },
  "stock_withdrawal.approve_request": {
    categoryKey: "withdrawals",
    categoryLabel: CATEGORY_LABELS.withdrawals,
    actionLabel: "Solicitud de salida aprobada",
    moduleLabel: "Inventario",
    entityLabel: "Solicitud de salida",
  },
  "stock_withdrawal.reject_request": {
    categoryKey: "withdrawals",
    categoryLabel: CATEGORY_LABELS.withdrawals,
    actionLabel: "Solicitud de salida rechazada",
    moduleLabel: "Inventario",
    entityLabel: "Solicitud de salida",
  },
  "finance_flux.create": {
    categoryKey: "finance",
    categoryLabel: CATEGORY_LABELS.finance,
    actionLabel: "Movimiento financiero registrado",
    moduleLabel: "Finanzas",
    entityLabel: "Movimiento financiero",
  },
  "finance_flux.update": {
    categoryKey: "finance",
    categoryLabel: CATEGORY_LABELS.finance,
    actionLabel: "Movimiento financiero actualizado",
    moduleLabel: "Finanzas",
    entityLabel: "Movimiento financiero",
  },
  "finance_debt.pay": {
    categoryKey: "finance",
    categoryLabel: CATEGORY_LABELS.finance,
    actionLabel: "Pago de deuda registrado",
    moduleLabel: "Finanzas",
    entityLabel: "Movimiento financiero",
  },
};

const toStartCase = (value: string) =>
  value
    .replace(/[._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getFinanceActionLabel = (metadata?: Record<string, unknown>) => {
  const rawType = String(metadata?.tipo || "").trim().toLowerCase();
  if (!rawType) return "Movimiento financiero registrado";
  if (rawType.includes("egreso") || rawType.includes("gasto")) return "Gasto registrado";
  if (rawType.includes("ingreso")) return "Ingreso registrado";
  return "Movimiento financiero registrado";
};

export const getActionTracePresentation = (row: ActionTraceLike): ActionTracePresentation => {
  const actionType = String(row.actionType || "").trim();
  const baseDefinition = ACTION_TRACE_DEFINITIONS[actionType];

  if (actionType === "finance_flux.create") {
    return {
      ...(baseDefinition || ACTION_TRACE_DEFINITIONS["finance_flux.create"]),
      actionLabel: getFinanceActionLabel(row.metadata),
      sourceActionType: actionType,
    };
  }

  if (baseDefinition) {
    return {
      ...baseDefinition,
      sourceActionType: actionType,
    };
  }

  return {
    categoryKey: OTHER_CATEGORY_KEY,
    categoryLabel: CATEGORY_LABELS[OTHER_CATEGORY_KEY],
    actionLabel: toStartCase(actionType || "accion desconocida"),
    moduleLabel: toStartCase(String(row.sourceModule || "").trim() || "area no definida"),
    entityLabel: toStartCase(String(row.entityType || "").trim() || "registro no definido"),
    sourceActionType: actionType,
  };
};

export const ACTION_TRACE_CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const ACTION_TRACE_ACTION_OPTIONS = ACTION_TRACE_CATEGORY_OPTIONS.map((category) => {
  const actionMap = new Map<string, { value: string; label: string }>();

  Object.entries(ACTION_TRACE_DEFINITIONS).forEach(([actionType, definition]) => {
    if (definition.categoryKey !== category.value) return;
    actionMap.set(actionType, {
      value: actionType,
      label: definition.actionLabel,
    });
  });

  return {
    categoryKey: category.value,
    categoryLabel: category.label,
    actions: Array.from(actionMap.values()).sort((left, right) => left.label.localeCompare(right.label, "es")),
  };
});

export const getActionTypesByCategory = (categoryKey?: string) => {
  if (!categoryKey) return [];
  const category = ACTION_TRACE_ACTION_OPTIONS.find((item) => item.categoryKey === categoryKey);
  return category ? category.actions.map((item) => item.value) : [];
};
