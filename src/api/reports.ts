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

export async function downloadOperacionMensualXlsx(params: ReportParams) {
    const { data } = await apiClientNoJSON.get("/reports/operacion-mensual/xlsx", {
        params: {
            mes: params.mes,
            meses: params.meses?.join(","),
            modoTop: params.modoTop,
            sucursales: params.sucursales?.join(","),
            reportes: params.reportes?.join(","),
            columnas: params.columnas ? JSON.stringify(params.columnas) : undefined,
        },
        responseType: "blob",
        withCredentials: true,
    });

    if (typeof window === "undefined") return;

    const blob = new Blob([data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // eslint-disable-next-line no-undef
    const URLx = (window.URL || (window as any).webkitURL);
    const objectUrl = URLx.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = objectUrl;
    const nombreMes =
        params.meses && params.meses.length > 1
            ? `${params.meses[0]}_a_${params.meses[params.meses.length - 1]}`
            : (params.meses?.[0] || params.mes || "sin_mes");
    a.download = `operacion_mensual_${nombreMes}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URLx.revokeObjectURL(objectUrl), 200);
}
