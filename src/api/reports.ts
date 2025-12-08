import { apiClient, apiClientNoJSON } from "./apiClient";

export type ReportParams = {
    mes: string;
    sucursales?: string[];
    modoTop?: "clientes" | "vendedores";
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
            modoTop: params.modoTop,
            sucursales: params.sucursales?.join(","),
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
    a.download = `operacion_mensual_${params.mes}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URLx.revokeObjectURL(objectUrl), 200);
}
