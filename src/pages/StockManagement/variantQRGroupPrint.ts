import { message } from "antd";
import { SERVER_URL } from "../../config/config";

export interface PrintableGroupItem {
  id: string;
  name: string;
  sellerLabel: string;
  itemCount: number;
  qrImagePath: string;
}

export interface GroupPreviewItem {
  id: string;
  title: string;
  subtitle: string;
  dataUrl: string;
  heightMm: number;
}

const MM_TO_INCH = 1 / 25.4;
const TM_L90_DPI = 203;

const mmToPx = (mm: number) => Math.max(1, Math.round(mm * MM_TO_INCH * TM_L90_DPI));

const getQrScale = (qrSizeMm: number) => Math.max(0.85, Math.min(qrSizeMm / 12, 1.7));

const escapeHtml = (value: string) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const truncateText = (value: string, max = 34) => {
  const text = (value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}...`;
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

    if (currentChunk) chunks.push(currentChunk);
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

const buildGroupPrintHtml = (
  items: PrintableGroupItem[],
  options: { ticketWidthMm: number; qrSizeMm: number }
) => {
  const qrScale = getQrScale(options.qrSizeMm);
  const sections = items
    .map((item) => {
      return `
        <div class="label">
          <img class="qr-img" src="${escapeHtml(item.qrImagePath)}" alt="QR ${escapeHtml(item.name)}" />
          <div class="meta">
            <div class="group-name">${escapeHtml(item.name)}</div>
            <div class="group-subtitle">${escapeHtml(item.sellerLabel)}</div>
            <div class="group-counter">${item.itemCount} variante(s)</div>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <html>
      <head>
        <title>Etiquetas QR de Grupos</title>
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
          .label {
            display: grid;
            grid-template-columns: ${options.qrSizeMm}mm 1fr;
            column-gap: ${(1.4 * qrScale).toFixed(2)}mm;
            align-items: center;
            padding: ${(1 * qrScale).toFixed(2)}mm 0;
            border-bottom: 1px dashed #ddd;
            page-break-inside: avoid;
          }
          .label:last-child {
            border-bottom: 0;
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
          }
          .meta div {
            margin: 0 0 ${(0.35 * qrScale).toFixed(2)}mm;
          }
          .meta div:last-child {
            margin-bottom: 0;
          }
          .group-name {
            font-weight: 700;
          }
          .group-subtitle {
            font-weight: 600;
            color: #6b6b6b;
          }
          .group-counter {
            color: #8d5c1e;
            font-weight: 700;
          }
        </style>
      </head>
      <body>${sections}</body>
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

export const openGroupPrintWindow = (
  items: PrintableGroupItem[],
  options: { ticketWidthMm: number; qrSizeMm: number }
) => {
  if (!items.length) {
    message.warning("No hay grupos con QR para imprimir");
    return;
  }

  const html = buildGroupPrintHtml(items, options);
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

export const buildDirectGroupLabelImageData = async (
  item: PrintableGroupItem,
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
  const sideMarginPx = mmToPx(1.1 * qrScale);
  const gapPx = mmToPx(1.2 * qrScale);
  const qrPx = Math.max(mmToPx(options.qrSizeMm), 30);
  const textStartX = sideMarginPx + qrPx + gapPx;
  const textMaxWidth = Math.max(widthPx - textStartX - sideMarginPx, 48);
  const lineHeight = Math.round(mmToPx(1.75 * qrScale));
  const titleFontPx = Math.max(11, Math.round(11 * qrScale));
  const subtitleFontPx = Math.max(9, Math.round(9 * qrScale));

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) throw new Error("No se pudo inicializar canvas");

  measureCtx.font = `bold ${titleFontPx}px Arial`;
  const titleLines = wrapByWidth(measureCtx, truncateText(item.name, 54), textMaxWidth).slice(0, 3);
  measureCtx.font = `${subtitleFontPx}px Arial`;
  const subtitleLines = wrapByWidth(measureCtx, truncateText(item.sellerLabel, 56), textMaxWidth).slice(0, 2);
  const counterLines = wrapByWidth(measureCtx, `${item.itemCount} variante(s)`, textMaxWidth).slice(0, 1);

  const textBlockHeight = (titleLines.length + subtitleLines.length + counterLines.length) * lineHeight;
  const heightPx = Math.max(qrPx, textBlockHeight);

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

  let y = Math.round((heightPx - textBlockHeight) / 2) + lineHeight;
  ctx.fillStyle = "#111111";
  ctx.font = `bold ${titleFontPx}px Arial`;
  for (const line of titleLines) {
    ctx.fillText(line, textStartX, y);
    y += lineHeight;
  }

  ctx.fillStyle = "#666666";
  ctx.font = `${subtitleFontPx}px Arial`;
  for (const line of subtitleLines) {
    ctx.fillText(line, textStartX, y);
    y += lineHeight;
  }

  ctx.fillStyle = "#8d5c1e";
  ctx.font = `bold ${subtitleFontPx}px Arial`;
  for (const line of counterLines) {
    ctx.fillText(line, textStartX, y);
    y += lineHeight;
  }

  return {
    dataUrl: canvas.toDataURL("image/png"),
    heightMm: Number(((heightPx / TM_L90_DPI) * 25.4).toFixed(2))
  };
};

export const toBase64Png = (dataUrl: string) =>
  String(dataUrl || "").replace(/^data:image\/png;base64,/, "");
