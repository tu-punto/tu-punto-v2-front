import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, InputNumber, Modal, Select, Switch, Typography, message } from "antd";
import { CheckCircleFilled, EyeOutlined, InboxOutlined, QrcodeOutlined } from "@ant-design/icons";
import { batchGenerateVariantQRAPI, listVariantQRAPI, listVariantQRGroupAPI } from "../../api/qr";
import { SERVER_URL } from "../../config/config";
import { getSucursalsAPI } from "../../api/sucursal";
import { getFlatProductListAPI } from "../../api/product";
import VariantQRGroupManagerModal from "./VariantQRGroupManagerModal";
import {
  buildDirectGroupLabelImageData,
  PrintableGroupItem,
  toBase64Png as toBase64GroupPng
} from "./variantQRGroupPrint";
import {
  connectQz,
  createPixelConfig,
  findQzPrinters,
  isQzConnected,
  qzPrint
} from "../../utils/qzTray";

const { Text } = Typography;

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

interface DirectPreviewItem {
  id: string;
  title: string;
  subtitle: string;
  kind: "variant" | "group";
  dataUrl: string;
  heightMm: number;
}

interface GroupSummaryResultItem extends PrintableGroupItem {
  groupCode?: string;
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
  const qrScale = getQrScale(options.qrSizeMm);
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
              <div class="product-name">${productName}</div>
              <div class="variant-name">${variantText}</div>
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
            width: ${Math.max(options.ticketWidthMm - 1, 32)}mm;
            margin: 0 auto;
            color: #111;
            font-size: ${Math.round(9 * qrScale)}px;
          }
          .seller-section {
            margin-bottom: 1.2mm;
          }
          .seller-title {
            margin: 0 0 0.6mm;
            font-size: ${Math.round(9 * qrScale)}px;
            font-weight: 700;
            padding-bottom: 0;
          }
          .list {
            display: block;
          }
          .label {
            display: grid;
            grid-template-columns: ${options.qrSizeMm}mm 1fr;
            column-gap: ${(1.2 * qrScale).toFixed(2)}mm;
            align-items: center;
            padding: ${(0.7 * qrScale).toFixed(2)}mm 0;
            page-break-inside: avoid;
          }
          .qr-img {
            width: ${options.qrSizeMm}mm;
            height: ${options.qrSizeMm}mm;
            object-fit: contain;
            display: block;
          }
          .meta {
            font-size: ${Math.round(8 * qrScale)}px;
            line-height: ${Math.min(1.25, 1.05 + qrScale * 0.08).toFixed(2)};
            word-break: break-word;
            overflow-wrap: anywhere;
            white-space: normal;
          }
          .meta div {
            margin: 0 0 ${(0.3 * qrScale).toFixed(2)}mm;
          }
          .meta div:last-child {
            margin-bottom: 0;
          }
          .product-name {
            font-weight: 700;
          }
          .variant-name {
            font-weight: 600;
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

export const openPrintWindow = (
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
const waitMs = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const getQrScale = (qrSizeMm: number) => Math.max(0.85, Math.min(qrSizeMm / 12, 1.7));

const truncateText = (value: string, max = 34) => {
  const text = (value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
};

const wrapByWidth = (ctx: CanvasRenderingContext2D, text: string, maxWidthPx: number) => {
  const words = (text || "").split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  const splitLongToken = (token: string) => {
    const chunks: string[] = [];
    let currentChunk = "";

    for (const char of token) {
      const nextChunk = currentChunk ? `${currentChunk}${char}` : char;
      if (ctx.measureText(nextChunk).width <= maxWidthPx || !currentChunk) {
        currentChunk = nextChunk;
        continue;
      }
      chunks.push(currentChunk);
      currentChunk = char;
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  };

  for (const word of words) {
    if (ctx.measureText(word).width > maxWidthPx) {
      if (current) {
        lines.push(current);
        current = "";
      }
      lines.push(...splitLongToken(word));
      continue;
    }

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
): Promise<{ dataUrl: string; heightMm: number }> => {
  const qrScale = getQrScale(options.qrSizeMm);
  const qrDataUrl = await imageToDataUrl(item.qrImagePath);
  const qrImg = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo renderizar imagen QR"));
    img.src = qrDataUrl;
  });

  const widthPx = mmToPx(options.ticketWidthMm);
  const topMarginPx = 0;
  const bottomMarginPx = 0;
  const sideMarginPx = mmToPx(0.8 * qrScale);
  const gapPx = mmToPx(1.2 * qrScale);
  const qrPx = Math.max(mmToPx(options.qrSizeMm), 24);
  const textStartX = sideMarginPx + qrPx + gapPx;
  const textMaxWidth = Math.max(widthPx - textStartX - sideMarginPx, 42);
  const lineHeight = Math.round(mmToPx(1.6 * qrScale));
  const productFontPx = Math.max(10, Math.round(11 * qrScale));
  const variantFontPx = Math.max(9, Math.round(10 * qrScale));

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) throw new Error("No se pudo inicializar canvas");
  measureCtx.font = `bold ${productFontPx}px Arial`;
  const productLines = wrapByWidth(
    measureCtx,
    truncateText(item.productName || item.productId || "Producto", 52),
    textMaxWidth
  ).slice(0, 3);
  measureCtx.font = `bold ${variantFontPx}px Arial`;
  const variantLines = wrapByWidth(
    measureCtx,
    truncateText(item.variantLabel || item.variantKey || "Variante", 52),
    textMaxWidth
  ).slice(0, 3);

  const textBlockHeight = (productLines.length + variantLines.length) * lineHeight;
  const contentHeight = Math.max(qrPx, textBlockHeight);
  const heightPx = contentHeight + topMarginPx + bottomMarginPx;

  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo inicializar canvas");

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const qrY = Math.round((heightPx - qrPx) / 2);
  ctx.drawImage(qrImg, sideMarginPx, qrY, qrPx, qrPx);

  let y = topMarginPx + lineHeight;
  ctx.fillStyle = "#111111";
  ctx.font = `bold ${productFontPx}px Arial`;
  for (const line of productLines) {
    ctx.fillText(line, textStartX, y);
    y += lineHeight;
  }

  ctx.font = `bold ${variantFontPx}px Arial`;
  for (const line of variantLines) {
    ctx.fillText(line, textStartX, y);
    y += lineHeight;
  }

  return {
    dataUrl: canvas.toDataURL("image/png"),
    heightMm: Number(((heightPx / TM_L90_DPI) * 25.4).toFixed(2))
  };
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
  const [ticketWidthMm, setTicketWidthMm] = useState<number>(40);
  const [qrSizeMm, setQrSizeMm] = useState<number>(16);
  const [printDelayMs, setPrintDelayMs] = useState<number>(500);
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [forceRegenerate, setForceRegenerate] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [qzBusy, setQzBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [qzConnected, setQzConnected] = useState(false);
  const [qzPrinters, setQzPrinters] = useState<string[]>([]);
  const [selectedQzPrinter, setSelectedQzPrinter] = useState<string | undefined>(
    localStorage.getItem("qzPrinterName") || undefined
  );
  const [directPreviewVisible, setDirectPreviewVisible] = useState(false);
  const [directPreviewItems, setDirectPreviewItems] = useState<DirectPreviewItem[]>([]);
  const [stockByItemKey, setStockByItemKey] = useState<Record<string, number>>({});
  const [printQuantities, setPrintQuantities] = useState<Record<string, number>>({});
  const [groupPrintQuantities, setGroupPrintQuantities] = useState<Record<string, number>>({});
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [resultGroups, setResultGroups] = useState<GroupSummaryResultItem[]>([]);
  const [result, setResult] = useState<any>(null);
  const [groupManagerVisible, setGroupManagerVisible] = useState(false);
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
      map.set(String(seller._id), `${seller.nombre || ""} ${seller.apellido || ""}`.trim());
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
  const hasInitialProductIds = initialProductIds.length > 0;
  const effectiveProductIds = hasInitialProductIds ? initialProductIds : undefined;
  const hasScopedSelection = Boolean(sellerId) || Boolean(effectiveProductIds?.length);
  const qzPrinterOptions = useMemo(
    () => qzPrinters.map((name) => ({ value: name, label: name })),
    [qzPrinters]
  );
  const itemPrintKey = (item: QRItem) => `${item.productId}::${item.variantKey}`;
  const getItemSystemStock = (item: QRItem) => {
    const value = stockByItemKey[itemPrintKey(item)];
    return Number.isFinite(value) ? Math.max(0, Number(value)) : 0;
  };
  const getItemPrintQuantity = (item: QRItem) => {
    const stored = printQuantities[itemPrintKey(item)];
    if (Number.isFinite(stored)) return Math.max(0, Number(stored));
    return 1;
  };
  const printableQueue = useMemo(
    () =>
      printableItems.flatMap((item) => {
        const quantity = getItemPrintQuantity(item);
        if (quantity <= 0) return [];
        return Array.from({ length: quantity }, () => item);
      }),
    [printableItems, printQuantities, stockByItemKey]
  );
  const totalPrintQuantity = useMemo(
    () => printableItems.reduce((acc, item) => acc + getItemPrintQuantity(item), 0),
    [printableItems, printQuantities, stockByItemKey]
  );
  const getGroupPrintQuantity = (group: GroupSummaryResultItem) => {
    const stored = groupPrintQuantities[group.id];
    if (Number.isFinite(stored)) return Math.max(0, Number(stored));
    return 0;
  };
  const printableGroupQueue = useMemo(
    () =>
      resultGroups.flatMap((group) => {
        const quantity = getGroupPrintQuantity(group);
        if (quantity <= 0) return [];
        return Array.from({ length: quantity }, () => group);
      }),
    [resultGroups, groupPrintQuantities]
  );
  const totalGroupPrintQuantity = useMemo(
    () => resultGroups.reduce((acc, group) => acc + getGroupPrintQuantity(group), 0),
    [resultGroups, groupPrintQuantities]
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
    if (!hasScopedSelection) {
      message.warning("Selecciona un vendedor o entra con productos concretos antes de generar.");
      return;
    }
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
    if (!hasScopedSelection) {
      message.warning("Selecciona un vendedor o entra con productos concretos antes de listar QRs.");
      return;
    }
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

  const handleQuantityChange = (item: QRItem, value?: number | null) => {
    const next = Math.max(0, Math.floor(Number(value || 0)));
    setPrintQuantities((current) => ({
      ...current,
      [itemPrintKey(item)]: next
    }));
  };

  const applySystemStockToItem = (item: QRItem) => {
    handleQuantityChange(item, getItemSystemStock(item));
  };

  const handleGroupQuantityChange = (groupId: string, value?: number | null) => {
    const next = Math.max(0, Math.floor(Number(value || 0)));
    setGroupPrintQuantities((current) => ({
      ...current,
      [groupId]: next
    }));
  };

  const applySystemStockToAll = () => {
    if (!printableItems.length) {
      message.warning("No hay QRs en resultado para ajustar");
      return;
    }

    const nextState = printableItems.reduce<Record<string, number>>((acc, item) => {
      acc[itemPrintKey(item)] = getItemSystemStock(item);
      return acc;
    }, {});

    setPrintQuantities((current) => ({
      ...current,
      ...nextState
    }));
    message.success("Se cargo el stock actual como cantidad de impresion");
  };

  const loadPrintableStocks = async () => {
    if (!printableItems.length) {
      setStockByItemKey({});
      return;
    }

    setLoadingStocks(true);
    try {
      const rows = await getFlatProductListAPI({
        sucursalId: sucursalId || undefined,
        sellerId: sellerId || undefined
      });

      const requestedKeys = new Set(printableItems.map((item) => itemPrintKey(item)));
      const nextMap = (Array.isArray(rows) ? rows : []).reduce<Record<string, number>>((acc, row: any) => {
        const key = `${String(row?._id || "")}::${String(row?.variantKey || "")}`;
        if (!requestedKeys.has(key)) return acc;
        acc[key] = Math.max(0, Number(row?.stock || 0));
        return acc;
      }, {});

      setStockByItemKey(nextMap);
    } catch (error) {
      console.error(error);
      message.error("No se pudo consultar el stock actual para los QRs listados");
      setStockByItemKey({});
    } finally {
      setLoadingStocks(false);
    }
  };

  const loadResultGroups = async () => {
    if (!sellerId) {
      setResultGroups([]);
      setGroupPrintQuantities({});
      return;
    }

    setLoadingGroups(true);
    try {
      const response = await listVariantQRGroupAPI({
        sellerId,
        active: true,
        limit: 100
      });
      const groups = Array.isArray(response?.result?.items) ? response.result.items : [];
      const normalized = groups
        .filter((group: any) => group?.qrImagePath)
        .map((group: any) => ({
          id: String(group.id),
          name: group.name || "Grupo QR",
          sellerLabel: resolveSellerLabel(String(group.sellerId || sellerId)),
          itemCount: Number(group.totalItems || 0),
          qrImagePath: String(group.qrImagePath),
          groupCode: group.groupCode ? String(group.groupCode) : undefined
        }));

      setResultGroups(normalized);
      setGroupPrintQuantities((current) =>
        normalized.reduce<Record<string, number>>((acc, group) => {
          acc[group.id] = current[group.id] ?? 0;
          return acc;
        }, {})
      );
    } catch (error) {
      console.error(error);
      message.error("No se pudieron cargar los grupos QR del vendedor");
      setResultGroups([]);
      setGroupPrintQuantities({});
    } finally {
      setLoadingGroups(false);
    }
  };

  const handlePrintResultDirect = async () => {
    if (!printableQueue.length) {
      message.warning("Define al menos una cantidad a imprimir");
      return;
    }
    await handlePrintDirect(printableQueue, false);
  };

  const handlePrintGroupsDirect = async () => {
    if (!selectedQzPrinter) {
      message.warning("Selecciona una impresora para impresion directa");
      return;
    }
    if (!printableGroupQueue.length) {
      message.warning("Define al menos una cantidad para los grupos");
      return;
    }

    setQzBusy(true);
    try {
      for (const [index, group] of printableGroupQueue.entries()) {
        const labelImage = await buildDirectGroupLabelImageData(group, {
          ticketWidthMm,
          qrSizeMm
        });

        const pixelConfig = await createPixelConfig(selectedQzPrinter, {
          widthMm: ticketWidthMm,
          heightMm: labelImage.heightMm
        });

        await qzPrint(pixelConfig, [
          {
            type: "pixel",
            format: "image",
            flavor: "base64",
            data: toBase64GroupPng(labelImage.dataUrl),
            options: { interpolation: "nearest-neighbor" }
          }
        ]);

        if (printDelayMs > 0 && index < printableGroupQueue.length - 1) {
          await waitMs(printDelayMs);
        }
      }

      message.success(`Impresion de grupos completada: ${printableGroupQueue.length} etiqueta(s)`);
    } catch (error) {
      console.error(error);
      message.error("Error al imprimir grupos QR. Revisa QZ Tray o la impresora.");
    } finally {
      setQzBusy(false);
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

      for (const [index, item] of targetItems.entries()) {
        const labelImage = await buildDirectLabelImageData(item, {
          ticketWidthMm,
          qrSizeMm
        });

        const pixelConfig = await createPixelConfig(selectedQzPrinter, {
          widthMm: ticketWidthMm,
          heightMm: labelImage.heightMm
        });

        await qzPrint(pixelConfig, [
          {
            type: "pixel",
            format: "image",
            flavor: "base64",
            data: toBase64Png(labelImage.dataUrl),
            options: { interpolation: "nearest-neighbor" }
          }
        ]);

        if (printDelayMs > 0 && index < targetItems.length - 1) {
          await waitMs(printDelayMs);
        }
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

  const handleOpenDirectPreview = async (
    items: QRItem[],
    groups: GroupSummaryResultItem[] = [],
    isTest = false
  ) => {
    if (!items.length && !groups.length) {
      message.warning("No hay etiquetas para previsualizar");
      return;
    }

    setPreviewBusy(true);
    try {
      const targetItems = isTest ? items.slice(0, 1) : items;
      const targetGroups = isTest && !targetItems.length ? groups.slice(0, 1) : groups;

      const variantPreviewItems = await Promise.all(
        targetItems.map(async (item) => {
          const labelImage = await buildDirectLabelImageData(item, {
            ticketWidthMm,
            qrSizeMm
          });

          return {
            id: `${item.productId}-${item.variantKey}-${item.qrCode}`,
            title: item.productName || item.productId || "Producto",
            subtitle: item.variantLabel || item.variantKey || "Variante",
            kind: "variant" as const,
            dataUrl: labelImage.dataUrl,
            heightMm: labelImage.heightMm
          };
        })
      );

      const groupPreviewItems = await Promise.all(
        targetGroups.map(async (group) => {
          const labelImage = await buildDirectGroupLabelImageData(group, {
            ticketWidthMm,
            qrSizeMm
          });

          return {
            id: `group-${group.id}`,
            title: group.name || "Grupo QR",
            subtitle: `${group.itemCount} variante(s)`,
            kind: "group" as const,
            dataUrl: labelImage.dataUrl,
            heightMm: labelImage.heightMm
          };
        })
      );

      setDirectPreviewItems([...variantPreviewItems, ...groupPreviewItems]);
      setDirectPreviewVisible(true);
    } catch (error) {
      console.error(error);
      message.error("No se pudo generar la vista previa 1x1.");
    } finally {
      setPreviewBusy(false);
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

  useEffect(() => {
    if (!visible) return;
    if (!printableItems.length) {
      setStockByItemKey({});
      setPrintQuantities({});
      return;
    }
    void loadPrintableStocks();
  }, [visible, printableItems, sellerId, sucursalId]);

  useEffect(() => {
    if (!visible || !result) {
      setResultGroups([]);
      setGroupPrintQuantities({});
      return;
    }
    void loadResultGroups();
  }, [visible, result, sellerId, groupManagerVisible]);

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      title="Generacion Masiva de QRs por Variante"
      footer={null}
      destroyOnClose
      width={760}
    >
      <div className="space-y-3">
        <div
          style={{
            border: "1px solid #f0d8bd",
            borderRadius: 14,
            background: "linear-gradient(180deg, #fffaf4 0%, #fff 100%)",
            padding: 14
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <Text strong style={{ fontSize: 15 }}>
                Filtros de generacion
              </Text>
              <div style={{ color: "#8c6b45", fontSize: 12, marginTop: 2 }}>
                Busca vendedor, filtra sucursal y define si quieres generar o solo revisar QRs.
              </div>
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#fff1de",
                color: "#c77822",
                fontSize: 20,
                flexShrink: 0
              }}
            >
              <QrcodeOutlined />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3.5">
            <div>
              <Text strong>Vendedor</Text>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                className="w-full mt-1"
                value={sellerId}
                onChange={(value) => setSellerId(value)}
                options={sellerOptions}
                placeholder="Buscar vendedor"
                filterOption={(input, option) =>
                  String(option?.label || "")
                    .toLowerCase()
                    .includes(String(input || "").toLowerCase())
                }
              />
            </div>
            <div>
              <Text strong>Sucursal</Text>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                className="w-full mt-1"
                value={sucursalId}
                onChange={(value) => setSucursalId(value)}
                options={branchOptions}
                placeholder="Todas las sucursales"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-3">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: 12,
                background: "#ffffff",
                border: "1px solid #f1e2cf"
              }}
            >
              <div>
                <Text>Generar solo faltantes</Text>
                <div style={{ fontSize: 12, color: "#8c8c8c" }}>Solo crea QR donde aun no existe.</div>
              </div>
              <Switch
                checked={onlyMissing}
                onChange={(value) => {
                  setOnlyMissing(value);
                  if (value) setForceRegenerate(false);
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: 12,
                background: "#ffffff",
                border: "1px solid #f1e2cf"
              }}
            >
              <div>
                <Text>Forzar regeneracion</Text>
                <div style={{ fontSize: 12, color: "#8c8c8c" }}>Reemplaza QRs existentes por nuevos.</div>
              </div>
              <Switch
                checked={forceRegenerate}
                onChange={(value) => {
                  setForceRegenerate(value);
                  if (value) setOnlyMissing(false);
                }}
              />
            </div>
          </div>
        </div>

        {forceRegenerate && (
          <Alert
            type="warning"
            showIcon
            message="Regeneracion forzada activa"
            description="Los QRs previos de esas variantes dejaran de ser validos."
          />
        )}

        {!hasScopedSelection && (
          <Alert
            type="info"
            showIcon
            message="Alcance requerido"
            description="Para evitar una generacion masiva accidental, primero selecciona un vendedor o abre este modal desde productos concretos."
          />
        )}

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleShowExisting}
            loading={loadingList}
            style={{ borderRadius: 12, height: 40 }}
          >
            Mostrar QRs
          </Button>
          <Button
            icon={<InboxOutlined />}
            onClick={() => setGroupManagerVisible(true)}
            style={{ borderRadius: 12, height: 40 }}
          >
            Grupos QR
          </Button>
          <Button
            type="primary"
            onClick={handleGenerate}
            loading={loadingGenerate}
            icon={<QrcodeOutlined />}
            style={{
              borderRadius: 12,
              height: 40,
              background: "linear-gradient(135deg, #ff9b45 0%, #ff7f2a 100%)",
              borderColor: "#ff8b34",
              boxShadow: "0 10px 20px rgba(255, 127, 42, 0.22)"
            }}
          >
            Generar
          </Button>
        </div>

        <div
          style={{
            border: "1px solid #eadfce",
            borderRadius: 14,
            background: "#fffdfa",
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 12
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Text strong>Ancho ticket</Text>
              <Select
                className="w-full mt-1"
                value={ticketWidthMm}
                onChange={(value) => setTicketWidthMm(Number(value))}
                options={[
                  { value: 40, label: "40 mm (papel pequeno)" },
                  { value: 58, label: "58 mm" },
                  { value: 80, label: "80 mm" }
                ]}
              />
            </div>
            <div>
              <Text strong>Tamano QR</Text>
              <Select
                className="w-full mt-1"
                value={qrSizeMm}
                onChange={(value) => setQrSizeMm(Number(value))}
                options={[
                  { value: 8, label: "8 mm (nano)" },
                  { value: 9, label: "9 mm (mini)" },
                  { value: 10, label: "10 mm (micro)" },
                  { value: 12, label: "12 mm" },
                  { value: 14, label: "14 mm (muy compacto)" },
                  { value: 16, label: "16 mm" },
                  { value: 18, label: "18 mm" },
                  { value: 20, label: "20 mm" },
                  { value: 22, label: "22 mm" }
                ]}
              />
            </div>
            <div>
              <Text strong>Pausa</Text>
              <Select
                className="w-full mt-1"
                value={printDelayMs}
                onChange={(value) => setPrintDelayMs(Number(value))}
                options={[
                  { value: 0, label: "Sin pausa" },
                  { value: 250, label: "250 ms" },
                  { value: 500, label: "500 ms (recomendado)" },
                  { value: 800, label: "800 ms" },
                  { value: 1200, label: "1200 ms" }
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr] gap-2 items-end">
            <div>
              <Text strong>Conexion</Text>
              <div className="flex gap-2 mt-1 items-center flex-wrap">
                <Button onClick={handleConnectQz} loading={qzBusy} style={{ borderRadius: 12 }}>
                  {qzConnected ? "Reconectar QZ" : "Conectar QZ"}
                </Button>
                {qzConnected ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      color: "#389e0d",
                      fontWeight: 600,
                      fontSize: 13
                    }}
                  >
                    <CheckCircleFilled />
                    Conectado
                  </span>
                ) : (
                  <span style={{ color: "#8c8c8c", fontSize: 12 }}>Sin conexion</span>
                )}
              </div>
            </div>

            <div>
              <Text strong>Impresoras</Text>
              <div className="mt-1">
                <Button
                  onClick={handleLoadQzPrinters}
                  loading={qzBusy}
                  disabled={!qzConnected}
                  style={{ borderRadius: 12 }}
                >
                  Buscar impresoras
                </Button>
              </div>
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
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              icon={<EyeOutlined />}
              onClick={() => void handleOpenDirectPreview(printableItems, resultGroups, false)}
              loading={previewBusy}
              disabled={(printableItems.length === 0 && resultGroups.length === 0) || qzBusy}
              style={{ borderRadius: 12 }}
            >
              Vista previa
            </Button>
          </div>
        </div>

        {result && (
          <div
            style={{
              border: "1px solid #d9e6f5",
              borderRadius: 14,
              background: "linear-gradient(180deg, #f7fbff 0%, #ffffff 100%)",
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <Text strong style={{ fontSize: 15 }}>Resultado</Text>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  {hasMetrics
                    ? `Procesadas ${result.variantsProcessed || 0} variantes | generadas ${result.generated || 0}`
                    : `QRs disponibles: ${result.count || 0}`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {hasMetrics && <div style={{ fontSize: 12, color: "#6b7280" }}>Errores: {(result.errors || []).length}</div>}
                <Button onClick={applySystemStockToAll} disabled={!printableItems.length || loadingStocks} style={{ borderRadius: 12 }}>
                  Stock actual en todos
                </Button>
                <Button
                  type="primary"
                  onClick={() => void handlePrintResultDirect()}
                  loading={qzBusy}
                  disabled={!qzConnected || !selectedQzPrinter || totalPrintQuantity === 0 || previewBusy}
                  style={{
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #ff9b45 0%, #ff7f2a 100%)",
                    borderColor: "#ff8b34"
                  }}
                >
                  Impresion directa 1x1
                </Button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "#4b5563" }}>
              {hasMetrics && <span>Productos: {result.products || 0}</span>}
              {hasMetrics && <span>Omitidos: {result.skipped || 0}</span>}
              <span>Total a imprimir: {totalPrintQuantity}</span>
              <span>{loadingStocks ? "Consultando stock actual..." : "Stock actual cargado"}</span>
            </div>

            {printableItems.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {printableItems.slice(0, 20).map((item: QRItem) => {
                  const label = item.variantLabel || item.variantKey;
                  const productName = item.productName || item.productId;
                  const systemStock = getItemSystemStock(item);
                  return (
                    <div
                      key={`${item.productId}-${item.variantKey}-${item.qrCode}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1.5fr) auto auto",
                        gap: 12,
                        alignItems: "center",
                        padding: "12px 14px",
                        borderRadius: 12,
                        background: "#ffffff",
                        border: "1px solid #e7eef7"
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <a href={item.qrImagePath} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                          {productName} - {label}
                        </a>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>
                          Stock sistema: {systemStock}
                        </div>
                      </div>
                      <InputNumber
                        min={0}
                        value={getItemPrintQuantity(item)}
                        onChange={(value) => handleQuantityChange(item, value)}
                        style={{ width: 92 }}
                      />
                      <Button size="small" onClick={() => applySystemStockToItem(item)} disabled={loadingStocks}>
                        Usar stock
                      </Button>
                    </div>
                  );
                })}
                {printableItems.length > 20 && (
                  <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                    Se muestran las primeras 20 variantes del resultado.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#8c8c8c" }}>No hay QRs en resultado.</div>
            )}

            <div
              style={{
                borderTop: "1px solid #e7eef7",
                paddingTop: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <Text strong style={{ fontSize: 14 }}>Grupos QR</Text>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    {sellerId
                      ? "Etiquetas de grupos guardados para este vendedor."
                      : "Selecciona un vendedor para listar grupos QR."}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#4b5563" }}>
                    Total grupos a imprimir: {totalGroupPrintQuantity}
                  </span>
                  <Button
                    type="primary"
                    onClick={() => void handlePrintGroupsDirect()}
                    loading={qzBusy}
                    disabled={!qzConnected || !selectedQzPrinter || totalGroupPrintQuantity === 0 || loadingGroups}
                    style={{
                      borderRadius: 12,
                      background: "linear-gradient(135deg, #ff9b45 0%, #ff7f2a 100%)",
                      borderColor: "#ff8b34"
                    }}
                  >
                    Imprimir grupos 1x1
                  </Button>
                </div>
              </div>

              {loadingGroups ? (
                <div style={{ fontSize: 12, color: "#6b7280" }}>Cargando grupos QR...</div>
              ) : resultGroups.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {resultGroups.map((group) => (
                    <div
                      key={group.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1.5fr) auto",
                        gap: 12,
                        alignItems: "center",
                        padding: "12px 14px",
                        borderRadius: 12,
                        background: "#ffffff",
                        border: "1px solid #e7eef7"
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <a href={group.qrImagePath} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                          {group.name}
                        </a>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>
                          {group.groupCode ? `${group.groupCode} | ` : ""}
                          {group.itemCount} variante(s)
                        </div>
                      </div>
                      <InputNumber
                        min={0}
                        value={getGroupPrintQuantity(group)}
                        onChange={(value) => handleGroupQuantityChange(group.id, value)}
                        style={{ width: 92 }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "#8c8c8c" }}>
                  {sellerId ? "No hay grupos QR activos con imagen para este vendedor." : "Sin vendedor seleccionado."}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={directPreviewVisible}
        onCancel={() => setDirectPreviewVisible(false)}
        footer={null}
        width={760}
        title="Vista previa 1x1"
        destroyOnClose
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "70vh", overflowY: "auto" }}>
          <Alert
            type="info"
            showIcon
            message="Este preview usa el mismo render PNG que se manda a QZ Tray"
            description="Si aqui no aparece blanco arriba, entonces el espacio extra no lo esta agregando esta imagen sino el flujo de impresion o la impresora."
          />

          {directPreviewItems.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid #e8e8e8",
                borderRadius: 12,
                padding: 12,
                background: "#fafafa"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, color: "#666" }}>
                  <span style={{ fontWeight: 600, color: "#344054" }}>{item.title}</span>
                  <span> | {item.subtitle}</span>
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {item.kind === "group" ? "Grupo QR" : "QR variante"} | alto render: {item.heightMm} mm
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: item.kind === "group" ? "#8d5c1e" : "#4f46e5",
                  marginBottom: 8
                }}
              >
                {item.kind === "group" ? "Etiqueta de grupo" : "Etiqueta de variante"}
              </div>
              <div
                style={{
                  background: "#fff",
                  border: "1px dashed #d9d9d9",
                  borderRadius: 10,
                  padding: 8,
                  overflowX: "auto"
                }}
              >
                <img
                  src={item.dataUrl}
                  alt={`${item.title} ${item.subtitle}`}
                  style={{
                    display: "block",
                    width: `${ticketWidthMm}mm`,
                    maxWidth: "100%",
                    height: "auto",
                    background: "#fff"
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <VariantQRGroupManagerModal
        open={groupManagerVisible}
        onClose={() => setGroupManagerVisible(false)}
        sellers={sellers}
        selectedSellerId={sellerId}
        selectedSucursalId={sucursalId}
      />
    </Modal>
  );
};

export default VariantQRBatchModal;
