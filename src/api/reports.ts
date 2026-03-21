import { apiClient, apiClientNoJSON } from "./apiClient";

export type ReportParams = {
  mes?: string;
  meses?: string[];
  sucursales?: string[];
  modoTop?: "clientes" | "vendedores";
  reportes?: string[];
  columnas?: Record<string, string[]>;
};

export async function getOperacionMensualAPI(params: ReportParams) {
  const { data } = await apiClient.post("/reports/operacion-mensual", params, {
    withCredentials: true,
  });
  return data;
}

type MesFinParams = {
  mes?: string;
  meses?: string[];
  mesFin?: string;
  sucursales?: string[];
};

type VentasQrParams = {
  meses: string[];
  sucursales?: string[];
};

function extractFilename(contentDisposition?: string) {
  if (!contentDisposition) return null;

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);

  const simpleMatch = /filename="?([^\";]+)"?/i.exec(contentDisposition);
  if (simpleMatch?.[1]) return simpleMatch[1];

  return null;
}

function saveBlobAsXlsx(data: BlobPart, fallbackFilename: string, contentDisposition?: string) {
  if (typeof window === "undefined") return;

  const blob = new Blob([data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const URLx = window.URL || (window as any).webkitURL;
  const objectUrl = URLx.createObjectURL(blob);
  const filename = extractFilename(contentDisposition) || fallbackFilename;

  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URLx.revokeObjectURL(objectUrl), 200);
}

async function downloadXlsxFromGet(endpoint: string, params: Record<string, any> | undefined, fallbackFilename: string) {
  const res = await apiClientNoJSON.get(endpoint, {
    params,
    responseType: "blob",
    withCredentials: true,
  });

  saveBlobAsXlsx(res.data, fallbackFilename, res.headers?.["content-disposition"]);
}

export async function downloadOperacionMensualXlsx(params: ReportParams) {
  const nombreMes =
    params.meses && params.meses.length > 1
      ? `${params.meses[0]}_a_${params.meses[params.meses.length - 1]}`
      : params.meses?.[0] || params.mes || "sin_mes";

  await downloadXlsxFromGet(
    "/reports/operacion-mensual/xlsx",
    {
      mes: params.mes,
      meses: params.meses?.join(","),
      modoTop: params.modoTop,
      sucursales: params.sucursales?.join(","),
      reportes: params.reportes?.join(","),
      columnas: params.columnas ? JSON.stringify(params.columnas) : undefined,
    },
    `operacion_mensual_${nombreMes}.xlsx`,
  );
}

export async function downloadStockProductosXlsx(idSucursal: string) {
  await downloadXlsxFromGet(
    "/reports/stock-productos/xlsx",
    { idSucursal },
    `stock_productos_${idSucursal}.xlsx`,
  );
}

export async function getInventarioActualAPI(params: { idSucursal: string; sellerId?: string }) {
  const { data } = await apiClient.post("/reports/inventario-actual", params, {
    withCredentials: true,
  });
  return data;
}

export async function downloadInventarioActualXlsx(params: { idSucursal: string; sellerId?: string }) {
  await downloadXlsxFromGet(
    "/reports/inventario-actual/xlsx",
    params,
    `inventario_actual_${params.idSucursal}${params.sellerId ? `_${params.sellerId}` : "_todos"}.xlsx`,
  );
}

export async function downloadComisiones3MesesXlsx(params: MesFinParams) {
  const nombreMeses =
    params.meses && params.meses.length > 1
      ? `${params.meses[0]}_a_${params.meses[params.meses.length - 1]}`
      : params.meses?.[0] || params.mes || params.mesFin || "sin_mes";
  await downloadXlsxFromGet(
    "/reports/comisiones-3m/xlsx",
    {
      mes: params.mes,
      meses: params.meses?.join(","),
      mesFin: params.mesFin,
      sucursales: params.sucursales?.join(","),
    },
    `comisiones_${nombreMeses}.xlsx`,
  );
}

export async function downloadIngresos3MesesXlsx(params: { mes?: string; meses?: string[]; mesFin?: string; incluirDeuda?: boolean }) {
  const nombreMeses =
    params.meses && params.meses.length > 1
      ? `${params.meses[0]}_a_${params.meses[params.meses.length - 1]}`
      : params.meses?.[0] || params.mes || params.mesFin || "sin_mes";
  await downloadXlsxFromGet(
    "/reports/ingresos-3m/xlsx",
    {
      mes: params.mes,
      meses: params.meses?.join(","),
      mesFin: params.mesFin,
      incluirDeuda: !!params.incluirDeuda,
    },
    `ingresos_flujo_${nombreMeses}.xlsx`,
  );
}

export async function downloadClientesActivos3MesesXlsx(params: { mes?: string; meses?: string[]; mesFin?: string }) {
  const nombreMeses =
    params.meses && params.meses.length > 1
      ? `${params.meses[0]}_a_${params.meses[params.meses.length - 1]}`
      : params.meses?.[0] || params.mes || params.mesFin || "sin_mes";
  await downloadXlsxFromGet(
    "/reports/clientes-activos/xlsx",
    { mes: params.mes, meses: params.meses?.join(","), mesFin: params.mesFin },
    `clientes_activos_${nombreMeses}.xlsx`,
  );
}

export async function downloadVentasVendedores4mXlsx(params?: { mes?: string; meses?: string[]; mesFin?: string }) {
  const nombreMeses =
    params?.meses && params.meses.length > 1
      ? `${params.meses[0]}_a_${params.meses[params.meses.length - 1]}`
      : params?.meses?.[0] || params?.mes || params?.mesFin || "sin_mes";
  await downloadXlsxFromGet(
    "/reports/ventas-vendedores-4m/xlsx",
    {
      mes: params?.mes,
      meses: params?.meses?.join(","),
      mesFin: params?.mesFin,
    },
    `ventas_vendedores_${nombreMeses}.xlsx`,
  );
}

export async function getComisionesMesesAPI(params: { mes?: string; meses?: string[]; sucursales?: string[] }) {
  const { data } = await apiClient.post("/reports/comisiones", params, { withCredentials: true });
  return data;
}

export async function getIngresosMesesAPI(params: { mes?: string; meses?: string[]; mesFin?: string; incluirDeuda?: boolean }) {
  const { data } = await apiClient.post("/reports/ingresos", params, { withCredentials: true });
  return data;
}

export async function getClientesActivosMesesAPI(params: { mes?: string; meses?: string[]; mesFin?: string }) {
  const { data } = await apiClient.post("/reports/clientes-activos", params, { withCredentials: true });
  return data;
}

export async function getVentasVendedoresMesesAPI(params: { mes?: string; meses?: string[]; mesFin?: string }) {
  const { data } = await apiClient.post("/reports/ventas-vendedores", params, { withCredentials: true });
  return data;
}

export async function getVentasQrAPI(params: { mes?: string; meses?: string[]; sucursales?: string[] }) {
  const { data } = await apiClient.post("/reports/ventas-qr", params, {
    withCredentials: true,
  });
  return data;
}

export async function downloadVentasQrXlsx(params: VentasQrParams) {
  const nombreMeses =
    params.meses.length <= 1
      ? params.meses[0] || "sin_mes"
      : `${params.meses[0]}_a_${params.meses[params.meses.length - 1]}`;

  await downloadXlsxFromGet(
    "/reports/ventas-qr/xlsx",
    {
      meses: params.meses.join(","),
      sucursales: params.sucursales?.join(","),
    },
    `ventas_qr_${nombreMeses}.xlsx`,
  );
}

export async function downloadClientesStatusXlsx() {
  await downloadXlsxFromGet(
    "/reports/clientes-status/xlsx",
    undefined,
    "clientes_status.xlsx",
  );
}
