import { SERVER_URL } from "../config/config";

declare global {
  interface Window {
    qz?: any;
  }
}

const QZ_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js";

let qzScriptPromise: Promise<any> | null = null;
let qzSecurityConfigured = false;
let qzSigningChecked = false;
let qzSigningAvailable = false;

const isQzReady = () => typeof window !== "undefined" && Boolean(window.qz);
const waitMs = (delayMs: number) => new Promise((resolve) => window.setTimeout(resolve, delayMs));
const serverBase = String(SERVER_URL || "").replace(/\/+$/, "");
const qzCertificateUrl = `${serverBase}/qr/certificate`;
const qzSignUrl = `${serverBase}/qr/sign`;

const ensureQzSecurity = async (qz: any) => {
  if (qzSecurityConfigured) return;

  if (!qzSigningChecked) {
    qzSigningChecked = true;
    try {
      const response = await fetch(qzCertificateUrl, {
        method: "GET",
        credentials: "include",
        cache: "no-store"
      });
      qzSigningAvailable = response.ok;
      if (!response.ok) {
        console.warn(`[QZ] certificate endpoint unavailable (${response.status})`);
      }
    } catch {
      qzSigningAvailable = false;
      console.warn("[QZ] certificate endpoint unreachable");
    }
  }

  if (!qzSigningAvailable) return;

  qz.security.setSignatureAlgorithm("SHA512");
  qz.security.setCertificatePromise(async () => {
    const response = await fetch(qzCertificateUrl, {
      method: "GET",
      credentials: "include",
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`No se pudo obtener certificado QZ (${response.status})`);
    }
    return response.text();
  });
  qz.security.setSignaturePromise(async (toSign: string) => {
    const response = await fetch(qzSignUrl, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "text/plain"
      },
      body: String(toSign ?? "")
    });
    if (!response.ok) {
      throw new Error(`No se pudo firmar payload QZ (${response.status})`);
    }
    return response.text();
  });
  qzSecurityConfigured = true;
};

export const ensureQzLoaded = async (): Promise<any> => {
  if (isQzReady()) {
    return window.qz;
  }

  if (qzScriptPromise) {
    return qzScriptPromise;
  }

  qzScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${QZ_SCRIPT_URL}"]`) as
      | HTMLScriptElement
      | null;

    if (existing) {
      existing.addEventListener("load", () => {
        if (!window.qz) {
          reject(new Error("QZ Tray script cargado pero no disponible"));
          return;
        }
        resolve(window.qz);
      });
      existing.addEventListener("error", () => reject(new Error("No se pudo cargar QZ Tray")));
      return;
    }

    const script = document.createElement("script");
    script.src = QZ_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (!window.qz) {
        reject(new Error("QZ Tray script cargado pero no disponible"));
        return;
      }
      resolve(window.qz);
    };
    script.onerror = () => reject(new Error("No se pudo cargar QZ Tray"));
    document.head.appendChild(script);
  });

  return qzScriptPromise;
};

export const connectQz = async (options?: { forceReconnect?: boolean }): Promise<any> => {
  const qz = await ensureQzLoaded();
  await ensureQzSecurity(qz);
  if (options?.forceReconnect && qz.websocket.isActive()) {
    await qz.websocket.disconnect();
    await waitMs(250);
  }
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect({
      retries: 2,
      delay: 1
    });
  }
  return qz;
};

export const disconnectQz = async (): Promise<void> => {
  const qz = await ensureQzLoaded();
  if (qz.websocket.isActive()) {
    await qz.websocket.disconnect();
  }
};

const normalizePrinterName = (value: unknown): string => String(value || "").trim();

const addPrinterNames = (target: Set<string>, value: unknown) => {
  if (Array.isArray(value)) {
    value.forEach((item) => addPrinterNames(target, item));
    return;
  }

  if (typeof value === "string") {
    const name = normalizePrinterName(value);
    if (name) target.add(name);
    return;
  }

  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    const name = normalizePrinterName(row.name || row.printerName || row.printer || row.id);
    if (name) target.add(name);
  }
};

export const findQzPrinters = async (options?: { refresh?: boolean }): Promise<string[]> => {
  const qz = await connectQz({ forceReconnect: options?.refresh });
  const names = new Set<string>();

  const printers = await qz.printers.find();
  addPrinterNames(names, printers);

  try {
    const details = await qz.printers.details();
    addPrinterNames(names, details);
  } catch (error) {
    console.warn("[QZ] No se pudo obtener detalle de impresoras", error);
  }

  return Array.from(names).sort((a, b) => a.localeCompare(b));
};

export const createEscPosConfig = async (
  printerName: string,
  options?: { forceRaw?: boolean }
) => {
  const qz = await connectQz();
  return qz.configs.create(printerName, {
    encoding: "CP437",
    forceRaw: Boolean(options?.forceRaw),
    spool: {
      end: ""   
    }
  });
};

export const createPixelConfig = async (
  printerName: string,
  options?: { widthMm?: number; heightMm?: number }
) => {
  const qz = await connectQz();
  return qz.configs.create(printerName, {
    units: "mm",
    size:
      options?.widthMm && options?.heightMm
        ? {
            width: options.widthMm,
            height: options.heightMm
          }
        : undefined,
    margins: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    },
    orientation: "portrait",
    colorType: "blackwhite",
  });
};

export const qzPrint = async (config: any, data: any[]) => {
  const qz = await connectQz();
  return qz.print(config, data);
};

export const isQzConnected = async (): Promise<boolean> => {
  try {
    const qz = await ensureQzLoaded();
    return Boolean(qz?.websocket?.isActive?.());
  } catch {
    return false;
  }
};
