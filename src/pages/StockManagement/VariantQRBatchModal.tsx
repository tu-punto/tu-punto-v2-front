import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Collapse, Modal, Select, Switch, Typography, message } from "antd";
import { batchGenerateVariantQRAPI, listVariantQRAPI } from "../../api/qr";
import { SERVER_URL } from "../../config/config";
import { getSucursalsAPI } from "../../api/sucursal";
import {
  connectQz,
  createEscPosConfig,
  createPixelConfig,
  findQzPrinters,
  isQzConnected,
  qzPrint
} from "../../utils/qzTray";

const { Text } = Typography;
const ESC = "\x1B";

interface QRItem {
  productId: string;
  productName?: string;
  sellerId?: string;
  variantKey: string;
  variantLabel?: string;
  qrCode: string;
  qrImagePath: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  sellers: any[];
  selectedSellerId?: string | null;
  initialProductIds?: string[];
  autoGenerateOnOpen?: boolean;
}

const escapeHtml = (value: string) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const groupItemsBySeller = (
  items: QRItem[],
  resolveSellerLabel: (sellerId?: string) => string
) => {
  const groups = new Map<string, { key: string; label: string; items: QRItem[] }>();
  for (const item of items) {
    const key = item.sellerId || "sin_vendedor";
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: resolveSellerLabel(item.sellerId),
        items: []
      });
    }
    groups.get(key)!.items.push(item);
  }
  return Array.from(groups.values());
};

const buildPrintHtml = (
  items: QRItem[],
  resolveSellerLabel: (sellerId?: string) => string,
  options: { ticketWidthMm: number; qrSizeMm: number }
) => {
  const groups = groupItemsBySeller(items, resolveSellerLabel);
  const sections = groups
    .map((group) => {
      const labels = group.items
        .map((item) => {
          const productName = escapeHtml(item.productName || item.productId || "Producto");
          const variantText = escapeHtml(item.variantLabel || item.variantKey || "Variante");

          return `
          <div class="label">
            <img class="qr-img" src="${escapeHtml(item.qrImagePath)}" alt="QR ${variantText}" />
            <div class="meta">
              <div><strong>Producto:</strong> ${productName}</div>
              <div><strong>Variante:</strong> ${variantText}</div>
            </div>
          </div>
        `;
        })
        .join("");

      return `
      <section class="seller-section">
        <h3 class="seller-title">${escapeHtml(group.label)}</h3>
        <div class="list">${labels}</div>
      </section>
    `;
    })
    .join("");

  return `
    <html>
      <head>
        <title>Etiquetas QR</title>
        <style>
          @page {
            size: ${options.ticketWidthMm}mm auto;
            margin: 0;
          }
          body {
            font-family: Arial, sans-serif;
            width: ${Math.max(options.ticketWidthMm - 2, 40)}mm;
            margin: 0 auto;
            color: #111;
            font-size: 11px;
          }
          .seller-section {
            margin-bottom: 2mm;
          }
          .seller-title {
            margin: 0 0 1.5mm;
            font-size: 11px;
            font-weight: 700;
            border-bottom: 1px dashed #999;
            padding-bottom: 1mm;
          }
          .list {
            display: block;
          }
          .label {
            display: grid;
            grid-template-columns: ${options.qrSizeMm}mm 1fr;
            column-gap: 2.2mm;
            align-items: center;
            padding: 1.5mm 0;
            border-bottom: 1px dashed #ddd;
            page-break-inside: avoid;
          }
          .qr-img {
            width: ${options.qrSizeMm}mm;
            height: ${options.qrSizeMm}mm;
            object-fit: contain;
            display: block;
          }
          .meta {
            font-size: 10px;
            line-height: 1.2;
            word-break: break-word;
          }
          .meta div {
            margin: 0 0 0.6mm;
          }
          .meta div:last-child {
            margin-bottom: 0;
          }
          @media print {
            body {
              margin: 0 auto;
            }
          }
        </style>
      </head>
      <body>
        ${sections}
      </body>
    </html>
  `;
};

const printWithIframeFallback = (html: string) => {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    iframe.remove();
    message.error("No se pudo preparar la impresion");
    return;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  window.setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(() => iframe.remove(), 1200);
  }, 350);
};

const openPrintWindow = (
  items: QRItem[],
  resolveSellerLabel: (sellerId?: string) => string,
  options: { ticketWidthMm: number; qrSizeMm: number }
) => {
  if (!items.length) {
    message.warning("No hay etiquetas para imprimir");
    return;
  }

  const html = buildPrintHtml(items, resolveSellerLabel, options);
  const win = window.open("", "_blank");

  if (win && win.document) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    window.setTimeout(() => {
      try {
        win.print();
      } catch {
        printWithIframeFallback(html);
      }
    }, 350);
    return;
  }

  printWithIframeFallback(html);
};

const MM_TO_INCH = 1 / 25.4;
const TM_L90_DPI = 203;
const mmToPx = (mm: number) => Math.max(1, Math.round(mm * MM_TO_INCH * TM_L90_DPI));

const truncateText = (value: string, max = 34) => {
  const text = (value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
};

const wrapByWidth = (ctx: CanvasRenderingContext2D, text: string, maxWidthPx: number) => {
  const words = (text || "").split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidthPx) {
      current = next;
      continue;
    }
    if (current) {
      lines.push(current);
      current = word;
    } else {
      lines.push(word);
      current = "";
    }
  }
  if (current) lines.push(current);
  return lines;
};

const buildQrDownloadUrl = (qrImagePath: string) => {
  const serverBase = String(SERVER_URL || "").replace(/\/+$/, "");
  const raw = String(qrImagePath || "").trim();
  if (!raw) return "";
  const normalized = (() => {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  })();

  if (/\/qr\/download-qr(\?|$)/i.test(normalized)) {
    if (/^https?:\/\//i.test(normalized)) return normalized;
    return `${serverBase}${normalized.startsWith("/") ? "" : "/"}${normalized}`;
  }
  return `${serverBase}/qr/download-qr?url=${encodeURIComponent(normalized)}`;
};

const imageToDataUrl = async (url: string): Promise<string> => {
  const proxyUrl = buildQrDownloadUrl(url);
  if (!proxyUrl) {
    throw new Error("QR sin URL de imagen");
  }
  const res = await fetch(proxyUrl, { credentials: "include" });
  if (!res.ok) {
    throw new Error(`No se pudo cargar imagen QR (${res.status})`);
  }
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo convertir imagen QR"));
    reader.readAsDataURL(blob);
  });
};

const buildDirectLabelImageData = async (
  item: QRItem,
  options: { ticketWidthMm: number; qrSizeMm: number }
): Promise<string> => {
  const qrDataUrl = await imageToDataUrl(item.qrImagePath);
  const qrImg = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo renderizar imagen QR"));
    img.src = qrDataUrl;
  });

  const widthPx = mmToPx(options.ticketWidthMm);
  const marginPx = mmToPx(1.5);
  const gapPx = mmToPx(2);
  const qrPx = Math.max(mmToPx(options.qrSizeMm), 24);
  const textStartX = marginPx + qrPx + gapPx;
  const textMaxWidth = Math.max(widthPx - textStartX - marginPx, 60);
  const lineHeight = Math.round(mmToPx(1.9));

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) throw new Error("No se pudo inicializar canvas");
  measureCtx.font = "bold 13px Arial";
  const prodPrefix = "Producto: ";
  const variantPrefix = "Variante: ";
  const productLines = wrapByWidth(
    measureCtx,
    `${prodPrefix}${truncateText(item.productName || item.productId || "Producto", 80)}`,
    textMaxWidth
  ).slice(0, 2);
  measureCtx.font = "bold 12px Arial";
  const variantLines = wrapByWidth(
    measureCtx,
    `${variantPrefix}${truncateText(item.variantLabel || item.variantKey || "Variante", 80)}`,
    textMaxWidth
  ).slice(0, 2);

  const textBlockHeight = (productLines.length + variantLines.length) * lineHeight + mmToPx(0.8);
  const contentHeight = Math.max(qrPx, textBlockHeight);
  const heightPx = contentHeight + marginPx * 2;

  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo inicializar canvas");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, widthPx, heightPx);

  const qrY = Math.round((heightPx - qrPx) / 2);
  ctx.drawImage(qrImg, marginPx, qrY, qrPx, qrPx);

  let y = marginPx + lineHeight;
  ctx.fillStyle = "#111111";
  ctx.font = "bold 13px Arial";
  for (const line of productLines) {
    ctx.fillText(line, textStartX, y);
    y += lineHeight;
  }

  ctx.font = "bold 12px Arial";
  for (const line of variantLines) {
    ctx.fillText(line, textStartX, y);
    y += lineHeight;
  }

  return canvas.toDataURL("image/png");
};

const toBase64Png = (dataUrl: string) =>
  String(dataUrl || "").replace(/^data:image\/png;base64,/, "");

const VariantQRBatchModal = ({
  visible,
  onClose,
  sellers,
  selectedSellerId,
  initialProductIds = [],
  autoGenerateOnOpen = false
}: Props) => {
  const [sellerId, setSellerId] = useState<string | undefined>(
    selectedSellerId ? String(selectedSellerId) : undefined
  );
  const [sucursalId, setSucursalId] = useState<string | undefined>(
    localStorage.getItem("sucursalId") || undefined
  );
  const [ticketWidthMm, setTicketWidthMm] = useState<number>(58);
  const [qrSizeMm, setQrSizeMm] = useState<number>(16);
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [forceRegenerate, setForceRegenerate] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [qzBusy, setQzBusy] = useState(false);
  const [qzConnected, setQzConnected] = useState(false);
  const [qzPrinters, setQzPrinters] = useState<string[]>([]);
  const [selectedQzPrinter, setSelectedQzPrinter] = useState<string | undefined>(
    localStorage.getItem("qzPrinterName") || undefined
  );
  const [result, setResult] = useState<any>(null);
  const autoRunDoneRef = useRef(false);
  const [branches, setBranches] = useState<any[]>([]);

  const sellerOptions = useMemo(
    () =>
      sellers.map((s) => ({
        value: String(s._id),
        label: `${s.nombre} ${s.apellido}`
      })),
    [sellers]
  );

  const branchOptions = useMemo(
    () =>
      (branches || []).map((b: any) => ({
        value: String(b._id),
        label: b.nombre || b.sucursal || b.nombre_sucursal || `Sucursal ${String(b._id).slice(-6)}`
      })),
    [branches]
  );

  const sellerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const seller of sellers || []) {
      map.set(String(seller._id), `${seller.nombre} ${seller.apellido}`.trim());
    }
    return map;
  }, [sellers]);

  const resolveSellerLabel = (sellerIdValue?: string) => {
    if (!sellerIdValue) return "Sin vendedor";
    return sellerNameById.get(String(sellerIdValue)) || `Vendedor ${String(sellerIdValue).slice(-6)}`;
  };

  const generatedItems: QRItem[] = (result?.generatedItems || []) as QRItem[];
  const listedItems: QRItem[] = (result?.items || []) as QRItem[];
  const printableItems: QRItem[] = listedItems.length > 0 ? listedItems : generatedItems;
  const hasMetrics = typeof result?.products === "number";
  const isListMode = typeof result?.count === "number" && !hasMetrics;
  const hasInitialProductIds = initialProductIds.length > 0;
  const effectiveProductIds = hasInitialProductIds ? initialProductIds : undefined;
  const groupedPrintableItems = useMemo(
    () => groupItemsBySeller(printableItems, resolveSellerLabel),
    [printableItems, sellerNameById]
  );
  const qzPrinterOptions = useMemo(
    () => qzPrinters.map((name) => ({ value: name, label: name })),
    [qzPrinters]
  );

  const confirmForceRegeneration = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      Modal.confirm({
        title: "Advertencia de regeneracion",
        content:
          "Si fuerzas la regeneracion, los QRs anteriores de esos productos/variantes dejaran de ser validos. Deseas continuar?",
        okText: "Si, regenerar",
        cancelText: "Cancelar",
        onOk: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  };

  const handleGenerate = async (options?: {
    onlyMissing?: boolean;
    forceRegenerate?: boolean;
    skipConfirm?: boolean;
  }) => {
    const onlyMissingParam = options?.onlyMissing ?? onlyMissing;
    const forceRegenerateParam = options?.forceRegenerate ?? forceRegenerate;
    if (forceRegenerateParam && !options?.skipConfirm) {
      const accepted = await confirmForceRegeneration();
      if (!accepted) return;
    }

    setLoadingGenerate(true);
    setResult(null);
    try {
      const response = await batchGenerateVariantQRAPI({
        sellerId,
        sucursalId,
        productIds: effectiveProductIds,
        onlyMissing: onlyMissingParam,
        forceRegenerate: forceRegenerateParam
      });
      setResult(response?.result || null);
    } finally {
      setLoadingGenerate(false);
    }
  };

  const handleShowExisting = async () => {
    setLoadingList(true);
    setResult(null);
    try {
      const response = await listVariantQRAPI({
        sellerId,
        sucursalId,
        productIds: effectiveProductIds,
        limit: 1000
      });
      setResult(response?.result || null);
    } finally {
      setLoadingList(false);
    }
  };

  const handleConnectQz = async () => {
    setQzBusy(true);
    try {
      await connectQz();
      setQzConnected(true);
      message.success("QZ Tray conectado");
    } catch (error) {
      console.error(error);
      setQzConnected(false);
      message.error("No se pudo conectar con QZ Tray. Verifica que esté abierto.");
    } finally {
      setQzBusy(false);
    }
  };

  const handleLoadQzPrinters = async () => {
    setQzBusy(true);
    try {
      const printers = await findQzPrinters();
      setQzPrinters(printers);

      if (!printers.length) {
        message.warning("No se encontraron impresoras en QZ Tray");
        return;
      }

      if (selectedQzPrinter && printers.includes(selectedQzPrinter)) {
        return;
      }

      const epsonPrinter =
        printers.find((name) => /epson|tm-l90|m313a/i.test(name)) || printers[0];
      setSelectedQzPrinter(epsonPrinter);
      localStorage.setItem("qzPrinterName", epsonPrinter);
    } catch (error) {
      console.error(error);
      message.error("No se pudo obtener la lista de impresoras");
    } finally {
      setQzBusy(false);
    }
  };

  const handlePrintDirect = async (items: QRItem[], isTest = false) => {
    if (!selectedQzPrinter) {
      message.warning("Selecciona una impresora para impresion directa");
      return;
    }
    if (!items.length) {
      message.warning("No hay etiquetas para imprimir");
      return;
    }

    setQzBusy(true);
    try {
      const targetItems = isTest ? [items[0]] : items;
      const pixelConfig = await createPixelConfig(selectedQzPrinter);
      const rawConfig = await createEscPosConfig(selectedQzPrinter);
      const GS = "\x1D";

      // Enviar etiqueta y corte una por una para asegurar 1x1 real en TM-L90.
      for (const item of targetItems) {
        const labelPng = await buildDirectLabelImageData(item, {
          ticketWidthMm,
          qrSizeMm
        });

        await qzPrint(pixelConfig, [
          {
            type: "pixel",
            format: "image",
            flavor: "base64",
            data: toBase64Png(labelPng),
            options: {
              interpolation: "nearest-neighbor"
            }
          }
        ]);

        // Feed corto + intentos de corte (ESC i y GS V) para mayor compatibilidad.
        await qzPrint(rawConfig, [
          `${ESC}@`,
          `${ESC}d${String.fromCharCode(3)}`,
          `${ESC}i`,
          `${GS}V${String.fromCharCode(0)}`
        ]);
      }

      message.success(
        isTest
          ? "Etiqueta de prueba enviada (con corte)"
          : `Impresion directa completada: ${targetItems.length} etiqueta(s)`
      );
    } catch (error) {
      console.error(error);
      message.error("Error en impresion directa. Revisa QZ Tray o impresora.");
    } finally {
      setQzBusy(false);
    }
  };

  useEffect(() => {
    if (!visible) {
      autoRunDoneRef.current = false;
      return;
    }

    if (selectedSellerId) {
      setSellerId(String(selectedSellerId));
    }

    if (!autoGenerateOnOpen || autoRunDoneRef.current) return;
    autoRunDoneRef.current = true;

    setOnlyMissing(true);
    setForceRegenerate(false);
    void handleGenerate({
      onlyMissing: true,
      forceRegenerate: false,
      skipConfirm: true
    });
  }, [visible, autoGenerateOnOpen, selectedSellerId]);

  useEffect(() => {
    if (!visible) return;
    const loadBranches = async () => {
      const response = await getSucursalsAPI();
      if (Array.isArray(response)) {
        setBranches(response);
      }
    };
    void loadBranches();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const syncQzStatus = async () => {
      const connected = await isQzConnected();
      setQzConnected(connected);
      if (connected) {
        const printers = await findQzPrinters();
        setQzPrinters(printers);
      }
    };
    void syncQzStatus();
  }, [visible]);

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      title="Generacion Masiva de QRs por Variante"
      footer={null}
      destroyOnClose
    >
      <div className="space-y-3">
        <div>
          <Text strong>Vendedor</Text>
          <Select
            allowClear
            className="w-full mt-1"
            value={sellerId}
            onChange={(value) => setSellerId(value)}
            options={sellerOptions}
            placeholder="Todos los vendedores"
          />
        </div>
        <div>
          <Text strong>Sucursal</Text>
          <Select
            allowClear
            className="w-full mt-1"
            value={sucursalId}
            onChange={(value) => setSucursalId(value)}
            options={branchOptions}
            placeholder="Todas las sucursales"
          />
        </div>

        <div className="flex items-center justify-between">
          <Text>Generar solo faltantes</Text>
          <Switch
            checked={onlyMissing}
            onChange={(value) => {
              setOnlyMissing(value);
              if (value) setForceRegenerate(false);
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <Text>Forzar regeneracion</Text>
          <Switch
            checked={forceRegenerate}
            onChange={(value) => {
              setForceRegenerate(value);
              if (value) setOnlyMissing(false);
            }}
          />
        </div>
        {forceRegenerate && (
          <Alert
            type="warning"
            showIcon
            message="Regeneracion forzada activa"
            description="Los QRs previos de esas variantes dejaran de ser validos."
          />
        )}

        <div className="flex gap-2">
          <Button onClick={handleShowExisting} loading={loadingList}>
            Mostrar QRs
          </Button>
          <Button type="primary" onClick={handleGenerate} loading={loadingGenerate}>
            Generar QRs
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Text strong>Ancho ticket</Text>
            <Select
              className="w-full mt-1"
              value={ticketWidthMm}
              onChange={(value) => setTicketWidthMm(Number(value))}
              options={[
                { value: 58, label: "58 mm (recomendado ahorro)" },
                { value: 80, label: "80 mm" }
              ]}
            />
          </div>
          <div className="flex-1">
            <Text strong>Tamaño QR</Text>
            <Select
              className="w-full mt-1"
              value={qrSizeMm}
              onChange={(value) => setQrSizeMm(Number(value))}
              options={[
                { value: 12, label: "12 mm (ultra compacto)" },
                { value: 14, label: "14 mm (muy compacto)" },
                { value: 16, label: "16 mm (recomendado)" },
                { value: 18, label: "18 mm" },
                { value: 20, label: "20 mm" },
                { value: 22, label: "22 mm" }
              ]}
            />
          </div>
        </div>

        <Alert
          type={qzConnected ? "success" : "warning"}
          showIcon
          message="Impresion directa 1x1 (QZ Tray + TM-L90)"
          description={
            qzConnected
              ? "QZ Tray conectado. Puedes imprimir y cortar etiqueta por etiqueta."
              : "QZ Tray no conectado. Abre QZ Tray y usa el boton Conectar."
          }
        />

        <div className="flex gap-2">
          <Button onClick={handleConnectQz} loading={qzBusy}>
            {qzConnected ? "Reconectar QZ" : "Conectar QZ"}
          </Button>
          <Button onClick={handleLoadQzPrinters} loading={qzBusy} disabled={!qzConnected}>
            Buscar impresoras
          </Button>
        </div>

        <div>
          <Text strong>Impresora directa</Text>
          <Select
            className="w-full mt-1"
            value={selectedQzPrinter}
            onChange={(value) => {
              setSelectedQzPrinter(value);
              localStorage.setItem("qzPrinterName", value);
            }}
            options={qzPrinterOptions}
            placeholder="Selecciona una impresora (EPSON TM-L90...)"
            showSearch
            optionFilterProp="label"
          />
        </div>

        <Alert
          type="info"
          showIcon
          message="Confianza del sitio en QZ Tray"
          description="Si sigue pidiendo Allow en cada impresión, necesitas registrar el sitio como confiable en QZ (o firmar digitalmente los mensajes)."
        />

        <div className="flex gap-2">
          <Button
            onClick={() => handlePrintDirect(printableItems, true)}
            loading={qzBusy}
            disabled={!qzConnected || !selectedQzPrinter || printableItems.length === 0}
          >
            Probar 1 etiqueta (corte)
          </Button>
          <Button
            type="primary"
            onClick={() => handlePrintDirect(printableItems, false)}
            loading={qzBusy}
            disabled={!qzConnected || !selectedQzPrinter || printableItems.length === 0}
          >
            Imprimir 1x1 con corte
          </Button>
        </div>

        {result && (
          <Alert
            type="info"
            showIcon
            message="Resultado"
            description={
              <div>
                {hasMetrics && (
                  <>
                    <div>Productos: {result.products || 0}</div>
                    <div>Variantes procesadas: {result.variantsProcessed || 0}</div>
                    <div>Generados: {result.generated || 0}</div>
                    <div>Omitidos: {result.skipped || 0}</div>
                    <div>Errores: {(result.errors || []).length}</div>
                  </>
                )}

                {isListMode && (
                  <div>QRs existentes: {result.count || 0}</div>
                )}

                {printableItems.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ marginBottom: 8 }}>
                      <Button
                        onClick={() =>
                          openPrintWindow(printableItems, resolveSellerLabel, {
                            ticketWidthMm,
                            qrSizeMm
                          })
                        }
                        size="small"
                      >
                        Imprimir todos / Guardar PDF
                      </Button>
                    </div>

                    <Text strong>
                      {isListMode ? "QRs existentes (primeros 20):" : "Etiquetas generadas (primeras 20):"}
                    </Text>
                    {!sellerId && groupedPrintableItems.length > 1 ? (
                      <div style={{ marginTop: 8 }}>
                        <Collapse
                          size="small"
                          defaultActiveKey={groupedPrintableItems.map((group) => group.key)}
                          items={groupedPrintableItems.map((group) => ({
                            key: group.key,
                            label: (
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                <span>{group.label} ({group.items.length})</span>
                                <Button
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handlePrintDirect(group.items, false);
                                  }}
                                  disabled={!qzConnected || !selectedQzPrinter || group.items.length === 0}
                                >
                                  Directo vendedor
                                </Button>
                              </div>
                            ),
                            children: (
                              <div>
                                {group.items.slice(0, 20).map((item: QRItem) => {
                                  const label = item.variantLabel || item.variantKey;
                                  const productName = item.productName || item.productId;
                                  return (
                                    <div
                                      key={`${item.productId}-${item.variantKey}-${item.qrCode}`}
                                      style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}
                                    >
                                      <a href={item.qrImagePath} target="_blank" rel="noreferrer">
                                        {productName} - {label}
                                      </a>
                                      <Button
                                        size="small"
                                        onClick={() =>
                                          openPrintWindow([item], resolveSellerLabel, {
                                            ticketWidthMm,
                                            qrSizeMm
                                          })
                                        }
                                      >
                                        Imprimir
                                      </Button>
                                      <Button
                                        size="small"
                                        onClick={() => void handlePrintDirect([item], false)}
                                        disabled={!qzConnected || !selectedQzPrinter}
                                      >
                                        Directo 1x1
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            )
                          }))}
                        />
                      </div>
                    ) : (
                      printableItems.slice(0, 20).map((item: QRItem) => {
                        const label = item.variantLabel || item.variantKey;
                        const productName = item.productName || item.productId;
                        return (
                          <div
                            key={`${item.productId}-${item.variantKey}-${item.qrCode}`}
                            style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}
                          >
                            <a href={item.qrImagePath} target="_blank" rel="noreferrer">
                              {productName} - {label}
                            </a>
                            <Button
                              size="small"
                              onClick={() =>
                                openPrintWindow([item], resolveSellerLabel, {
                                  ticketWidthMm,
                                  qrSizeMm
                                })
                              }
                            >
                              Imprimir
                            </Button>
                            <Button
                              size="small"
                              onClick={() => void handlePrintDirect([item], false)}
                              disabled={!qzConnected || !selectedQzPrinter}
                            >
                              Directo 1x1
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            }
          />
        )}
      </div>
    </Modal>
  );
};

export default VariantQRBatchModal;

