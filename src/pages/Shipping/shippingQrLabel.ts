const escapeHtml = (value: string) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

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
          .qr {
            width: 84px;
            height: 84px;
            object-fit: contain;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 4px;
            background: #fff;
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
            ${
              params.qrImagePath
                ? `<img class="qr" src="${escapeHtml(params.qrImagePath)}" alt="QR del pedido" />`
                : ""
            }
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
