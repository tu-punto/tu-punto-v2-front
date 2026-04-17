export type SimplePackageDraftRow = {
  key: string;
  comprador: string;
  telefono_comprador: string;
  descripcion_paquete: string;
  package_size: "estandar" | "grande";
  destino_sucursal_id?: string;
  precio_paquete_unitario: number;
  precio_paquete: number;
  amortizacion_vendedor: number;
  saldo_por_paquete: number;
  deuda_comprador: number;
  precio_entre_sucursal: number;
  precio_total?: number;
  esta_pagado?: "si" | "no";
  metodo_pago?: "" | "efectivo" | "qr";
  _id?: string;
};

export const roundCurrency = (value: number) => +Number(value || 0).toFixed(2);

export const buildPackagePricing = (
  unitPrice: number,
  amortizacion: number,
  saldoPorPaquete: number,
  packageSize: "estandar" | "grande",
  branchRoutePrice = 0
) => {
  const multiplier = packageSize === "grande" ? 2 : 1;
  const precioPaqueteUnitario = roundCurrency(unitPrice);
  const precioPaquete = roundCurrency(precioPaqueteUnitario * multiplier);
  const deudaVendedor = roundCurrency(amortizacion);
  const precioEntreSucursal = roundCurrency(branchRoutePrice);
  const deudaComprador = roundCurrency(Math.max(0, precioPaquete + precioEntreSucursal - deudaVendedor));

  return {
    precio_paquete_unitario: precioPaqueteUnitario,
    precio_paquete: precioPaquete,
    amortizacion_vendedor: deudaVendedor,
    saldo_por_paquete: roundCurrency(saldoPorPaquete),
    deuda_comprador: deudaComprador,
    precio_entre_sucursal: precioEntreSucursal,
    precio_total: roundCurrency(precioPaquete + precioEntreSucursal),
  };
};

export const createDraftRow = (
  index: number,
  config: { precio_paquete: number; amortizacion: number; saldo_por_paquete: number },
  existing?: Partial<SimplePackageDraftRow>
): SimplePackageDraftRow => {
  const packageSize = existing?.package_size === "grande" ? "grande" : "estandar";
  const routePrice = Number(existing?.precio_entre_sucursal || 0);
  const saldoPorPaquete = Number(existing?.saldo_por_paquete ?? config.saldo_por_paquete ?? 0);
  const amortizacion = Number(existing?.amortizacion_vendedor ?? config.amortizacion ?? 0);
  const initialPaymentMethod =
    existing?.metodo_pago === "qr" || existing?.metodo_pago === "efectivo"
      ? existing.metodo_pago
      : "efectivo";
  return {
    key: existing?.key || existing?._id || `draft-${index}-${Date.now()}`,
    comprador: existing?.comprador || "",
    telefono_comprador: existing?.telefono_comprador || "",
    descripcion_paquete: existing?.descripcion_paquete || "",
    package_size: packageSize,
    destino_sucursal_id: existing?.destino_sucursal_id || "",
    esta_pagado: existing?.esta_pagado || "no",
    metodo_pago: initialPaymentMethod,
    _id: existing?._id,
    ...buildPackagePricing(
      config.precio_paquete,
      amortizacion,
      saldoPorPaquete,
      packageSize,
      routePrice
    ),
  };
};

export const resizeDraftRows = (
  count: number,
  rows: SimplePackageDraftRow[],
  config: { precio_paquete: number; amortizacion: number; saldo_por_paquete: number }
) => {
  return Array.from({ length: count }, (_, index) => createDraftRow(index, config, rows[index]));
};

export const calculateSimplePackageTotals = (rows: SimplePackageDraftRow[]) =>
  rows.reduce(
    (acc, row) => ({
      precio_paquete: roundCurrency(acc.precio_paquete + Number(row?.precio_paquete || 0)),
      amortizacion_vendedor: roundCurrency(
        acc.amortizacion_vendedor + Number(row?.amortizacion_vendedor || 0)
      ),
      saldo_por_paquete: roundCurrency(acc.saldo_por_paquete + Number(row?.saldo_por_paquete || 0)),
      deuda_comprador: roundCurrency(acc.deuda_comprador + Number(row?.deuda_comprador || 0)),
      precio_entre_sucursal: roundCurrency(
        acc.precio_entre_sucursal + Number(row?.precio_entre_sucursal || 0)
      ),
      precio_total: roundCurrency(acc.precio_total + Number(row?.precio_total || 0)),
    }),
    {
      precio_paquete: 0,
      amortizacion_vendedor: 0,
      saldo_por_paquete: 0,
      deuda_comprador: 0,
      precio_entre_sucursal: 0,
      precio_total: 0,
    }
  );

export const applyPackagePatch = (
  row: any,
  patch: Record<string, unknown>,
  config?: { precio_paquete?: number; amortizacion?: number; saldo_por_paquete?: number }
) => {
  const nextSize =
    patch.package_size === "grande"
      ? "grande"
      : patch.package_size === "estandar"
        ? "estandar"
        : row.package_size;
  const unitPrice = Number(config?.precio_paquete ?? (row?.precio_paquete_unitario || 0));
  const amortizacion = Number(
    patch.amortizacion_vendedor ?? config?.amortizacion ?? (row?.amortizacion_vendedor || 0)
  );
  const saldoPorPaquete = Number(
    patch.saldo_por_paquete ?? config?.saldo_por_paquete ?? (row?.saldo_por_paquete || 0)
  );
  const branchRoutePrice = Number(patch.precio_entre_sucursal ?? (row?.precio_entre_sucursal || 0));
  const pricing = buildPackagePricing(
    unitPrice,
    amortizacion,
    saldoPorPaquete,
    nextSize,
    branchRoutePrice
  );
  const paid = patch.esta_pagado === "si" || patch.esta_pagado === "no" ? patch.esta_pagado : row.esta_pagado;
  const metodoPago =
    paid === "si"
      ? String(patch.metodo_pago ?? row.metodo_pago ?? "").trim().toLowerCase()
      : String(patch.metodo_pago ?? row.metodo_pago ?? "efectivo").trim().toLowerCase();

  return {
    ...row,
    ...patch,
    package_size: nextSize,
    ...pricing,
    esta_pagado: paid,
    metodo_pago: metodoPago === "qr" ? "qr" : "efectivo",
    saldo_cobrar: paid === "si" ? 0 : pricing.deuda_comprador,
  };
};
