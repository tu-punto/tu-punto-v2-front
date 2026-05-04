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
  origin?: string;
  destination?: string;
  qrImagePath?: string;
  ticketWidthMm?: number;
  qrSizeMm?: number;
}): Promise<{ dataUrl: string; heightMm: number; widthMm: number }> => {
  const ticketWidthMm = params.ticketWidthMm ?? 40;

  const widthPx = mmToPx(ticketWidthMm);
  const sideMarginPx = mmToPx(0.8);
  const textStartX = sideMarginPx;
  const textMaxWidth = Math.max(widthPx - textStartX - sideMarginPx, 42);
  const lineHeight = mmToPx(1.45);
  const titleFontPx = 11;
  const bodyFontPx = 9;

  const rows = [
    cleanLabelValue(params.guideNumber, "Sin guia"),
    cleanLabelValue(params.clientPhone),
    cleanLabelValue(params.clientName),
    `O: ${cleanLabelValue(params.origin, "Sin origen")}`,
    `D: ${cleanLabelValue(params.destination, "Sin destino")}`,
  ].filter(Boolean);

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) throw new Error("No se pudo inicializar canvas");

  const textLines: Array<{ text: string; title?: boolean }> = [];
  rows.forEach((row, index) => {
    measureCtx.font = `${index === 0 ? "bold" : "normal"} ${index === 0 ? titleFontPx : bodyFontPx}px Arial`;
    wrapByWidth(measureCtx, row, textMaxWidth).slice(0, index === 0 ? 2 : 1).forEach((line) => {
      textLines.push({ text: line, title: index === 0 });
    });
  });

  const textBlockHeight = textLines.length * lineHeight;
  const heightPx = Math.max(mmToPx(7), textBlockHeight);

  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo inicializar canvas");

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let y = Math.round((heightPx - textBlockHeight) / 2) + lineHeight - 2;
  ctx.fillStyle = "#111111";
  for (const line of textLines) {
    ctx.font = `${line.title ? "bold" : "normal"} ${line.title ? titleFontPx : bodyFontPx}px Arial`;
    ctx.fillText(line.text, textStartX, y);
    y += lineHeight;
  }

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
