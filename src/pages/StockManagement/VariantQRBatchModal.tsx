import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Collapse, Modal, Select, Switch, Typography, message } from "antd";
import { batchGenerateVariantQRAPI, listVariantQRAPI } from "../../api/qr";
import { getSucursalsAPI } from "../../api/sucursal";

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
  resolveSellerLabel: (sellerId?: string) => string
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
      <section class="seller-section">
        <h3 class="seller-title">${escapeHtml(group.label)}</h3>
        <div class="grid">${labels}</div>
      </section>
    `;
    })
    .join("");

  return `
    <html>
      <head>
        <title>Etiquetas QR</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 16px; color: #111; }
          .seller-section { margin-bottom: 18px; }
          .seller-title { margin: 0 0 10px; font-size: 14px; font-weight: 700; }
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
  resolveSellerLabel: (sellerId?: string) => string
) => {
  if (!items.length) {
    message.warning("No hay etiquetas para imprimir");
    return;
  }

  const html = buildPrintHtml(items, resolveSellerLabel);
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
  const [sucursalId, setSucursalId] = useState<string | undefined>(
    localStorage.getItem("sucursalId") || undefined
  );
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [forceRegenerate, setForceRegenerate] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
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
                      <Button onClick={() => openPrintWindow(printableItems, resolveSellerLabel)} size="small">
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
                            label: `${group.label} (${group.items.length})`,
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
                                      <Button size="small" onClick={() => openPrintWindow([item], resolveSellerLabel)}>
                                        Imprimir
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
                            <Button size="small" onClick={() => openPrintWindow([item], resolveSellerLabel)}>
                              Imprimir
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
