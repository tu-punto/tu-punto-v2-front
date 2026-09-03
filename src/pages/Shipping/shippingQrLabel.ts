const escapeHtml = (value: string) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const MM_TO_INCH = 1 / 25.4;
const TM_L90_DPI = 203;
const mmToPx = (mm: number) => Math.max(1, Math.round(mm * MM_TO_INCH * TM_L90_DPI));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

export type ShippingLabelPrintOptions = {
  ticketWidthMm: number;
  qrSizeMm: number;
  printDelayMs: number;
};

export const DEFAULT_SHIPPING_LABEL_PRINT_OPTIONS: ShippingLabelPrintOptions = {
  ticketWidthMm: 40,
  qrSizeMm: 16,
  printDelayMs: 0,
};

const wrapByWidth = (ctx: CanvasRenderingContext2D, text: string, maxWidthPx: number) => {
  const words = String(text || "").split(" ").filter(Boolean);
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

    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines;
};

const cleanLabelValue = (value: unknown, fallback = "") =>
  String(value ?? "").replace(/\s+/g, " ").trim() || fallback;

export const toBase64Png = (dataUrl: string) =>
  String(dataUrl || "").replace(/^data:image\/png;base64,/, "");

export const buildDirectShippingLabelImageData = async (params: {
  guideNumber: string;
  clientName?: string;
  clientPhone?: string;
  clientCi?: string;
  origin?: string;
  destination?: string;
  qrImagePath?: string;
  ticketWidthMm?: number;
  qrSizeMm?: number;
}): Promise<{ dataUrl: string; heightMm: number; widthMm: number }> => {
  const ticketWidthMm = params.ticketWidthMm ?? 40;
  const qrSizeMm = params.qrSizeMm ?? DEFAULT_SHIPPING_LABEL_PRINT_OPTIONS.qrSizeMm;
  const sizeScale = clamp(qrSizeMm / 16, 0.96, 1.28);

  const widthPx = mmToPx(ticketWidthMm);
  const sidePaddingPx = mmToPx(ticketWidthMm <= 40 ? 0.8 : 1.05);
  const columnGapPx = mmToPx(1.1);
  const innerWidthPx = widthPx - sidePaddingPx * 2 - columnGapPx;
  const leftWidthPx = Math.max(44, Math.round(innerWidthPx * 0.4));
  const rightWidthPx = Math.max(44, innerWidthPx - leftWidthPx);
  const codeFontPx = Math.round(26 * sizeScale);
  const phoneFontPx = Math.round(20 * sizeScale);
  const nameFontPx = Math.round(16 * sizeScale);
  const codeLineHeight = mmToPx(6.2 * sizeScale);
  const phoneLineHeight = mmToPx(5.4 * sizeScale);
  const nameLineHeight = mmToPx(4.6 * sizeScale);

  const guideNumber = cleanLabelValue(params.guideNumber, "Sin guia");
  const clientPhone = cleanLabelValue(params.clientPhone);
  const clientName = cleanLabelValue(params.clientName);
  const detailItems = [
    clientPhone ? { text: `T: ${clientPhone}`, fontPx: phoneFontPx, lineHeight: phoneLineHeight } : null,
    clientName ? { text: `N: ${clientName}`, fontPx: nameFontPx, lineHeight: nameLineHeight } : null,
  ].filter(Boolean) as Array<{ text: string; fontPx: number; lineHeight: number }>;

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) throw new Error("No se pudo inicializar canvas");

  const codeParts = guideNumber.match(/^([A-Z]+-)(\d+-?.*)$/i);
  measureCtx.font = `bold ${codeFontPx}px Arial`;
  const codeLines = codeParts
    ? [codeParts[1].toUpperCase(), codeParts[2]]
    : wrapByWidth(measureCtx, guideNumber, leftWidthPx).slice(0, 2);
  const detailLines = detailItems.flatMap((item) => {
    measureCtx.font = `bold ${item.fontPx}px Arial`;
    return wrapByWidth(measureCtx, item.text, rightWidthPx).map((line) => ({
      ...item,
      text: line,
    }));
  }).slice(0, 3);
  const verticalPaddingPx = mmToPx(0.85 * sizeScale);
  const codeBlockHeight = codeLines.length * codeLineHeight;
  const detailBlockHeight = detailLines.reduce((sum, item) => sum + item.lineHeight, 0);
  const heightPx = Math.max(mmToPx(20), Math.max(codeBlockHeight, detailBlockHeight) + verticalPaddingPx * 2 + mmToPx(1.2));

  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo inicializar canvas");

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const codeStartY = verticalPaddingPx + Math.round(codeLineHeight * 0.86);
  const detailStartY = verticalPaddingPx + mmToPx(0.8 * sizeScale);
  const leftCenterX = sidePaddingPx + leftWidthPx / 2;
  const rightStartX = sidePaddingPx + leftWidthPx + columnGapPx;
  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  codeLines.forEach((line, index) => {
    ctx.font = `bold ${codeFontPx}px Arial`;
    ctx.fillText(line, leftCenterX, codeStartY + index * codeLineHeight);
  });
  ctx.textAlign = "left";
  let currentDetailY = detailStartY;
  detailLines.forEach((item) => {
    ctx.font = `bold ${item.fontPx}px Arial`;
    ctx.fillText(item.text, rightStartX, currentDetailY + item.lineHeight * 0.9);
    currentDetailY += item.lineHeight;
  });

  return {
    dataUrl: canvas.toDataURL("image/png"),
    heightMm: Number(((heightPx / TM_L90_DPI) * 25.4).toFixed(2)),
    widthMm: ticketWidthMm,
  };
};

const printWithIframe = (html: string) => {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  window.setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(() => iframe.remove(), 1200);
  }, 300);
};

export const printShippingTemporaryLabel = (params: {
  shippingId: string;
  clientName?: string;
  clientPhone?: string;
  destination?: string;
  qrImagePath?: string;
  items: Array<{
    name: string;
    quantity: number;
  }>;
}) => {
  const itemsHtml = params.items
    .map(
      (item) => `
        <div class="item-row">
          <span class="qty">${escapeHtml(String(item.quantity))}x</span>
          <span class="name">${escapeHtml(item.name)}</span>
        </div>
      `
    )
    .join("");

  const html = `
    <html>
      <head>
        <title>Etiqueta pedido ${escapeHtml(params.shippingId)}</title>
        <style>
          @page {
            size: 100mm auto;
            margin: 6mm;
          }
          body {
            font-family: Arial, sans-serif;
            color: #111827;
            margin: 0;
          }
          .label {
            border: 1px solid #d1d5db;
            border-radius: 10px;
            padding: 10px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            align-items: flex-start;
            margin-bottom: 10px;
          }
          .title {
            font-size: 18px;
            font-weight: 700;
            margin: 0 0 4px;
          }
          .meta {
            font-size: 12px;
            color: #4b5563;
            margin: 0 0 2px;
          }
          .section-title {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            color: #374151;
            margin: 12px 0 6px;
          }
          .item-row {
            display: grid;
            grid-template-columns: 42px 1fr;
            gap: 8px;
            padding: 6px 0;
            border-bottom: 1px solid #f3f4f6;
            font-size: 13px;
          }
          .item-row:last-child {
            border-bottom: 0;
          }
          .qty {
            font-weight: 700;
          }
          .footer {
            margin-top: 10px;
            font-size: 11px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="header">
            <div>
              <div class="title">Pedido ${escapeHtml(params.shippingId)}</div>
              <div class="meta">Cliente: ${escapeHtml(params.clientName || "Sin cliente")}</div>
              <div class="meta">Celular: ${escapeHtml(params.clientPhone || "Sin celular")}</div>
              <div class="meta">Destino: ${escapeHtml(params.destination || "Sin destino")}</div>
            </div>
          </div>
          <div class="section-title">Productos temporales</div>
          <div>${itemsHtml || `<div class="meta">Sin productos temporales</div>`}</div>
          <div class="footer">Etiqueta generada para preparacion y entrega.</div>
        </div>
      </body>
    </html>
  `;

  const win = window.open("", "_blank");
  if (win?.document) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    window.setTimeout(() => {
      try {
        win.print();
      } catch {
        printWithIframe(html);
      }
    }, 300);
    return;
  }

  printWithIframe(html);
};
