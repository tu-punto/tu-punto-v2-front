import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Modal, Select, Switch, Typography, message } from "antd";
import { batchGenerateVariantQRAPI, listVariantQRAPI } from "../../api/qr";

const { Text } = Typography;

interface QRItem {
  productId: string;
  productName?: string;
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

const buildPrintHtml = (items: QRItem[]) => {
  const labels = items
    .map((item) => {
      const productName = escapeHtml(item.productName || item.productId || "Producto");
      const variantText = escapeHtml(item.variantLabel || item.variantKey || "Variante");

      return `
      <div class="label">
        <img src="${escapeHtml(item.qrImagePath)}" alt="QR ${variantText}" />
        <div class="meta">
          <div><strong>Producto:</strong> ${productName}</div>
          <div><strong>Variante:</strong> ${variantText}</div>
        </div>
      </div>
    `;
    })
    .join("");

  return `
    <html>
      <head>
        <title>Etiquetas QR</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 16px; color: #111; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
          .label { border: 1px solid #ddd; border-radius: 10px; padding: 12px; break-inside: avoid; }
          .label img { width: 100%; max-width: 220px; display: block; margin: 0 auto 8px; }
          .meta { font-size: 12px; line-height: 1.3; word-break: break-word; }
          @media print {
            body { margin: 0; }
            .grid { gap: 8px; }
            .label { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="grid">${labels}</div>
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

const openPrintWindow = (items: QRItem[]) => {
  if (!items.length) {
    message.warning("No hay etiquetas para imprimir");
    return;
  }

  const html = buildPrintHtml(items);
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
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [forceRegenerate, setForceRegenerate] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [result, setResult] = useState<any>(null);
  const autoRunDoneRef = useRef(false);

  const sellerOptions = useMemo(
    () =>
      sellers.map((s) => ({
        value: String(s._id),
        label: `${s.nombre} ${s.apellido}`
      })),
    [sellers]
  );

  const generatedItems: QRItem[] = (result?.generatedItems || []) as QRItem[];
  const listedItems: QRItem[] = (result?.items || []) as QRItem[];
  const printableItems: QRItem[] = listedItems.length > 0 ? listedItems : generatedItems;
  const hasMetrics = typeof result?.products === "number";
  const isListMode = typeof result?.count === "number" && !hasMetrics;
  const hasInitialProductIds = initialProductIds.length > 0;
  const effectiveProductIds = hasInitialProductIds ? initialProductIds : undefined;

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
        productIds: effectiveProductIds,
        limit: 1000
      });
      setResult(response?.result || null);
    } finally {
      setLoadingList(false);
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
                      <Button onClick={() => openPrintWindow(printableItems)} size="small">
                        Imprimir todos / Guardar PDF
                      </Button>
                    </div>

                    <Text strong>
                      {isListMode ? "QRs existentes (primeros 20):" : "Etiquetas generadas (primeras 20):"}
                    </Text>
                    {printableItems.slice(0, 20).map((item: QRItem) => {
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
                          <Button size="small" onClick={() => openPrintWindow([item])}>
                            Imprimir
                          </Button>
                        </div>
                      );
                    })}
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
