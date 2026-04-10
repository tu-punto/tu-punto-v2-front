export type SimplePackageDraftRow = {
  key: string;
  comprador: string;
  telefono_comprador: string;
  descripcion_paquete: string;
  package_size: "estandar" | "grande";
  precio_paquete_unitario: number;
  precio_paquete: number;
  amortizacion_vendedor: number;
  deuda_comprador: number;
  esta_pagado?: "si" | "no";
  metodo_pago?: "" | "efectivo" | "qr";
  _id?: string;
};

export const roundCurrency = (value: number) => +Number(value || 0).toFixed(2);

export const buildPackagePricing = (
  unitPrice: number,
  amortizacion: number,
  packageSize: "estandar" | "grande"
) => {
  const multiplier = packageSize === "grande" ? 2 : 1;
  const precioPaqueteUnitario = roundCurrency(unitPrice);
  const precioPaquete = roundCurrency(precioPaqueteUnitario * multiplier);
  const deudaVendedor = roundCurrency(amortizacion);
  const deudaComprador = roundCurrency(Math.max(0, precioPaquete - deudaVendedor));

  return {
    precio_paquete_unitario: precioPaqueteUnitario,
    precio_paquete: precioPaquete,
    amortizacion_vendedor: deudaVendedor,
    deuda_comprador: deudaComprador,
  };
};

export const createDraftRow = (
  index: number,
  config: { precio_paquete: number; amortizacion: number },
  existing?: Partial<SimplePackageDraftRow>
): SimplePackageDraftRow => {
  const packageSize = existing?.package_size === "grande" ? "grande" : "estandar";
  return {
    key: existing?.key || existing?._id || `draft-${index}-${Date.now()}`,
    comprador: existing?.comprador || "",
    telefono_comprador: existing?.telefono_comprador || "",
    descripcion_paquete: existing?.descripcion_paquete || "",
    package_size: packageSize,
    esta_pagado: existing?.esta_pagado || "no",
    metodo_pago: existing?.metodo_pago || "",
    _id: existing?._id,
    ...buildPackagePricing(config.precio_paquete, config.amortizacion, packageSize),
  };
};

export const resizeDraftRows = (
  count: number,
  rows: SimplePackageDraftRow[],
  config: { precio_paquete: number; amortizacion: number }
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
      deuda_comprador: roundCurrency(acc.deuda_comprador + Number(row?.deuda_comprador || 0)),
    }),
    {
      precio_paquete: 0,
      amortizacion_vendedor: 0,
      deuda_comprador: 0,
    }
  );

export const applyPackagePatch = (row: any, patch: Record<string, unknown>) => {
  const nextSize = patch.package_size === "grande" ? "grande" : patch.package_size === "estandar" ? "estandar" : row.package_size;
  const pricing = buildPackagePricing(
    Number(row?.precio_paquete_unitario || 0),
    Number(row?.amortizacion_vendedor || 0),
    nextSize
  );
  const paid = patch.esta_pagado === "si" || patch.esta_pagado === "no" ? patch.esta_pagado : row.esta_pagado;
  const metodoPago =
    paid === "si"
      ? String(patch.metodo_pago ?? row.metodo_pago ?? "").trim().toLowerCase()
      : "";

  return {
    ...row,
    ...patch,
    package_size: nextSize,
    ...pricing,
    esta_pagado: paid,
    metodo_pago: metodoPago === "efectivo" || metodoPago === "qr" ? metodoPago : "",
    saldo_cobrar: paid === "si" ? 0 : pricing.deuda_comprador,
  };
};
