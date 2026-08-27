import { useEffect, useMemo, useState } from "react";
import { Button, InputNumber, Modal, Popconfirm, Table, Typography, message } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined, StopOutlined } from "@ant-design/icons";

import { createEntryAPI } from "../../api/entry.ts";
import { createVariantAPI, registerProductAPI, updateSubvariantStockAPI } from "../../api/product";
import { generateVariantQRAPI } from "../../api/qr";
import {
  clearTempProducts,
  clearTempStock,
  clearTempVariants,
  getTempStock,
  getTempVariants,
  saveTempStock
} from "../../utils/storageHelpers";
import QRScanner from "../Sales/QRScanner";

const { Text, Title } = Typography;

const SCAN_MODE_META = {
  ingress: {
    label: "Ingresos",
    actionLabel: "Escaner QR de ingresos",
    description: "Cada lectura suma una unidad a la variante y la deja lista en el ajuste pendiente.",
    successLabel: "Variante agregada a ingresos",
    groupSuccessLabel: "Variante del grupo sumada a ingresos",
    tagColor: "green",
    delta: 1,
    buttonStyle: {
      background: "linear-gradient(135deg, #52c41a 0%, #389e0d 100%)",
      borderColor: "#389e0d",
      color: "#ffffff"
    }
  },
  egress: {
    label: "Salidas",
    actionLabel: "Escaner QR de salidas",
    description: "Cada lectura descuenta una unidad. El sistema bloquea salidas que dejarian stock negativo.",
    successLabel: "Variante agregada a salidas",
    groupSuccessLabel: "Variante del grupo descontada",
    tagColor: "red",
    delta: -1,
    buttonStyle: {
      background: "linear-gradient(135deg, #ff7875 0%, #cf1322 100%)",
      borderColor: "#cf1322",
      color: "#ffffff"
    }
  }
} as const;

const toVariantMap = (input: any): Record<string, string> => {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return input as Record<string, string>;
};

const getVariantValuesLabel = (variantes: Record<string, string>) =>
  Object.values(toVariantMap(variantes))
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" / ");

const getVariantFullLabel = (variantes: Record<string, string>) => {
  const valuesLabel = getVariantValuesLabel(variantes);
  return valuesLabel ? ` - ${valuesLabel}` : "";
};

const areVariantsEqual = (a: Record<string, string>, b: Record<string, string>) => {
  const keysA = Object.keys(a || {});
  const keysB = Object.keys(b || {});
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => a[key] === b[key]);
};

const buildDraftKey = (record: any) => {
  const productId = String(record?.product?._id || record?.product?.id_producto || "");
  const variantKey = String(record?.product?.variantKey || "");
  const variantHash = JSON.stringify(toVariantMap(record?.product?.variantes));
  return `${productId}::${variantKey || variantHash}`;
};

const normalizeNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeVariantRecord = (variants: Record<string, string> | any) =>
  Object.fromEntries(
    Object.entries(variants || {})
      .map(([key, value]) => [String(key).trim().toLowerCase(), String(value || "").trim().toLowerCase()] as const)
      .sort(([left], [right]) => left.localeCompare(right))
  );

const sameVariantRecord = (left: Record<string, string>, right: Record<string, string>) => {
  const normalizedLeft = normalizeVariantRecord(left);
  const normalizedRight = normalizeVariantRecord(right);
  const leftKeys = Object.keys(normalizedLeft);
  const rightKeys = Object.keys(normalizedRight);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => normalizedLeft[key] === normalizedRight[key]);
};

const getBranchId = (branch: any) => String(branch?.id_sucursal?._id || branch?.id_sucursal || branch?.sucursalId || "").trim();

const getProductBranchCombinations = (product: any, branchId?: string) => {
  const branches = Array.isArray(product?.sucursales) ? product.sucursales : [];
  if (branchId) {
    const branch = branches.find((candidate: any) => getBranchId(candidate) === String(branchId));
    if (branch) return Array.isArray(branch.combinaciones) ? branch.combinaciones : [];
  }

  return branches.flatMap((branch: any) => (Array.isArray(branch?.combinaciones) ? branch.combinaciones : []));
};

const resolveSavedProduct = (response: any) => response?.result || response?.newProduct || response?.data || response;

const buildQrItemKey = (productId: string, variantKey: string) => `${productId}::${variantKey}`;

const normalizeStockDraftEntries = (items: any[] = []) =>
  items.map((item: any) => ({
    ...item,
    product: {
      ...item?.product,
      variantes: item?.product?.variantes || item?.product?.variantes_obj || {}
    }
  }));

const ConfirmProductsModal = ({
  visible,
  onClose,
  onSuccess,
  productosConSucursales,
  selectedSeller,
  onStockDraftChange,
  newStock = []
}: any) => {
  const [stockData, setStockData] = useState<any[]>([]);
  const [variantData, setVariantData] = useState<any[]>([]);
  const [productData, setProductData] = useState<any[]>([]);
  const [loadingSave, setLoadingSave] = useState(false);
  const [activeScannerMode, setActiveScannerMode] = useState<"ingress" | "egress" | null>(null);
  const [scannerSession, setScannerSession] = useState(0);
  const sucursalId = localStorage.getItem("sucursalId");

  useEffect(() => {
    if (!visible) return;

    const tempProducts = JSON.parse(localStorage.getItem("newProducts") || "[]");
    const filteredProducts = tempProducts.map((item: any) => {
      const product = item.productData || item;
      const filteredSucursales = (product.sucursales || [])
        .map((sucursal: any) => ({
          ...sucursal,
          combinaciones:
            String(sucursal.id_sucursal) === String(sucursalId)
              ? (sucursal.combinaciones || []).filter((comb: any) => normalizeNumber(comb.stock) > 0)
              : []
        }))
        .filter((sucursal: any) => (sucursal.combinaciones || []).length > 0);

      return { ...item, productData: { ...product, sucursales: filteredSucursales } };
    });

    setStockData(normalizeStockDraftEntries(Array.isArray(newStock) ? newStock : getTempStock()));
    setVariantData(getTempVariants());
    setProductData(filteredProducts);
    setActiveScannerMode(null);
  }, [visible, sucursalId]);

  useEffect(() => {
    if (!visible) return;
    saveTempStock(stockData);
    onStockDraftChange?.(stockData);
  }, [stockData, visible, onStockDraftChange]);

  const closeScannerPanel = () => {
    setActiveScannerMode(null);
    setScannerSession((current) => current + 1);
  };

  const openScanner = (mode: "ingress" | "egress") => {
    setActiveScannerMode(mode);
    setScannerSession((current) => current + 1);
  };

  const handleDeleteStockRecord = (record: any) => {
    setStockData((current) => current.filter((item) => buildDraftKey(item) !== buildDraftKey(record)));
  };

  const applyStockDelta = (record: any, nextDelta: number) => {
    const currentStock = normalizeNumber(record?.product?.stock);
    if (currentStock + nextDelta < 0) {
      message.warning("No puedes registrar una salida mayor al stock disponible en esta sucursal.");
      return;
    }

    setStockData((current) =>
      current.flatMap((item) => {
        if (buildDraftKey(item) !== buildDraftKey(record)) return [item];
        if (!nextDelta) return [];
        return [{ ...item, newStock: { ...item.newStock, stock: nextDelta } }];
      })
    );
  };

  const handleEditStock = (record: any, value: number | null) => {
    applyStockDelta(record, normalizeNumber(value));
  };

  const handleEditProduct = (
    productId: string,
    branchId: string,
    combinationIndex: number,
    field: "stock" | "precio",
    value: number | null
  ) => {
    const parsedValue = normalizeNumber(value);
    setProductData((current) =>
      current.map((rawItem: any) => {
        const product = rawItem.productData || rawItem;
        if (String(product._id) !== String(productId)) return rawItem;

        const nextSucursales = (product.sucursales || []).map((sucursal: any) => {
          if (String(sucursal.id_sucursal) !== String(branchId)) return sucursal;
          const nextCombinaciones = [...(sucursal.combinaciones || [])];
          nextCombinaciones[combinationIndex] = {
            ...nextCombinaciones[combinationIndex],
            [field]: parsedValue
          };
          return { ...sucursal, combinaciones: nextCombinaciones };
        });

        return { ...rawItem, productData: { ...product, sucursales: nextSucursales } };
      })
    );
  };

  const flattenedCombinations = useMemo(() => {
    return productData.flatMap((rawItem: any) => {
      const product = rawItem.productData || rawItem;
      const branch = (product.sucursales || []).find(
        (sucursal: any) => String(sucursal.id_sucursal) === String(sucursalId)
      );
      if (!branch) return [];

      return (branch.combinaciones || []).map((combination: any, index: number) => ({
        key: `${product._id}-${branch.id_sucursal}-${index}`,
        nombre_producto: product.nombre_producto,
        sucursalId: branch.id_sucursal,
        index,
        variantes: Object.entries(toVariantMap(combination.variantes))
          .map(([key, value]) => `${key[0]}: ${value}`)
          .join(" / "),
        precio: normalizeNumber(combination.precio),
        stock: normalizeNumber(combination.stock),
        productId: product._id
      }));
    });
  }, [productData, sucursalId]);

  const movementRows = useMemo(() => stockData.filter((item) => normalizeNumber(item?.newStock?.stock) !== 0), [stockData]);

  const clearAll = () => {
    clearTempStock();
    clearTempProducts();
    clearTempVariants();
    onStockDraftChange?.([]);
    setStockData([]);
    setVariantData([]);
    setProductData([]);
    setActiveScannerMode(null);
    onClose?.();
  };

  const isCompactScannerLayout = typeof window !== "undefined" && window.innerWidth < 1180;

  const getScannerButtonStyle = (mode: "ingress" | "egress") => {
    const isActive = activeScannerMode === mode;
    const isIngress = mode === "ingress";
    const activeColor = isIngress ? "#389e0d" : "#cf1322";
    const inactiveColor = isIngress ? "#52c41a" : "#ff4d4f";

    return {
      background: isActive ? activeColor : "#ffffff",
      borderColor: isActive ? activeColor : inactiveColor,
      color: isActive ? "#ffffff" : inactiveColor,
      boxShadow: "none"
    };
  };

  const getMovementTone = (value: number) => {
    if (value > 0) {
      return {
        color: "#389e0d",
        borderColor: "#b7eb8f",
        background: "#f6ffed"
      };
    }

    if (value < 0) {
      return {
        color: "#cf1322",
        borderColor: "#ffa39e",
        background: "#fff1f0"
      };
    }

    return {
      color: "#262626",
      borderColor: "#d9d9d9",
      background: "#ffffff"
    };
  };

  const handleScannedVariant = (item: any) => {
    if (!activeScannerMode) return;

    if (selectedSeller?._id && String(item?.id_vendedor || "") !== String(selectedSeller._id)) {
      message.error("El QR escaneado no pertenece al vendedor seleccionado.");
      return;
    }

    const delta = SCAN_MODE_META[activeScannerMode].delta;
    const scannedVariants = toVariantMap(item?.variantes);
    const scannedStock = normalizeNumber(item?.stock);

    setStockData((current) => {
      const foundIndex = current.findIndex((entry) => {
        const entryVariants = toVariantMap(entry?.product?.variantes);
        return (
          String(entry?.product?._id || entry?.product?.id_producto || "") === String(item?.id_producto || "") &&
          (String(entry?.product?.variantKey || "") === String(item?.variantKey || "") ||
            areVariantsEqual(entryVariants, scannedVariants))
        );
      });

      if (foundIndex >= 0) {
        const existing = current[foundIndex];
        const nextDelta = normalizeNumber(existing?.newStock?.stock) + delta;
        const currentStock = normalizeNumber(existing?.product?.stock);

        if (currentStock + nextDelta < 0) {
          message.warning("No puedes registrar una salida mayor al stock disponible en esta sucursal.");
          return current;
        }

        if (!nextDelta) {
          return current.filter((_, index) => index !== foundIndex);
        }

        const next = [...current];
        next[foundIndex] = {
          ...existing,
          newStock: {
            ...existing.newStock,
            stock: nextDelta
          }
        };
        return next;
      }

      if (scannedStock + delta < 0) {
        message.warning("No puedes registrar una salida mayor al stock disponible en esta sucursal.");
        return current;
      }

      return [
        ...current,
        {
          product: {
            _id: String(item?.id_producto || ""),
            nombre_producto: String(item?.nombre_producto || "Producto"),
            nombre_categoria: String(item?.nombre_categoria || item?.categoria || "Sin categoria"),
            categoria: item?.categoria,
            variantes: scannedVariants,
            variantKey: String(item?.variantKey || ""),
            variantLabel: String(item?.variantLabel || ""),
            precio: normalizeNumber(item?.precio),
            stock: scannedStock,
            sucursalId: item?.sucursalId ? String(item.sucursalId) : sucursalId
          },
          newStock: {
            productId: String(item?.id_producto || ""),
            sucursalId: item?.sucursalId ? String(item.sucursalId) : sucursalId,
            stock: delta
          }
        }
      ];
    });
  };

  const saveProducts = async () => {
    try {
      const createdProducts: any[] = [];
      const qrItems: any[] = [];
      const qrQuantities: Record<string, number> = {};
      const seenQrKeys = new Set<string>();

      const pushQrItem = async ({
        productId,
        productName,
        sellerId,
        variantKey,
        variantLabel,
        quantity,
      }: {
        productId: string;
        productName: string;
        sellerId: string;
        variantKey: string;
        variantLabel: string;
        quantity: number;
      }) => {
        const safeQuantity = Math.max(0, Math.floor(Number(quantity || 0)));
        const safeProductId = String(productId || "").trim();
        const safeVariantKey = String(variantKey || "").trim();
        if (!safeProductId || !safeVariantKey || safeQuantity <= 0) return;

        const dedupeKey = buildQrItemKey(safeProductId, safeVariantKey);
        if (seenQrKeys.has(dedupeKey)) {
          qrQuantities[dedupeKey] = (qrQuantities[dedupeKey] || 0) + safeQuantity;
          return;
        }

        const response = await generateVariantQRAPI({ productId: safeProductId, variantKey: safeVariantKey });
        const qrData = response?.qrData;
        if (!qrData?.qrImagePath) return;

        const item = {
          productId: String(qrData.productId || safeProductId),
          productName: String(qrData.productName || productName || "Producto"),
          sellerId: String(sellerId || selectedSeller?._id || ""),
          variantKey: String(qrData.variantKey || safeVariantKey),
          variantLabel: String(qrData.variantLabel || variantLabel || "Variante"),
          qrCode: String(qrData.qrCode || ""),
          qrImagePath: String(qrData.qrImagePath || ""),
        };

        qrItems.push(item);
        qrQuantities[buildQrItemKey(item.productId, item.variantKey)] = safeQuantity;
        seenQrKeys.add(buildQrItemKey(item.productId, item.variantKey));
      };

      for (const variant of variantData) {
        const response = await createVariantAPI({
          productId: variant.product._id,
          sucursalId,
          combinaciones: variant.combinaciones
        });

        const savedProduct = resolveSavedProduct(response);
        if (!savedProduct?._id) continue;

        const branchId = String(variant?.sucursalId || sucursalId || "").trim();
        const sourceCombinations = Array.isArray(variant?.combinaciones) ? variant.combinaciones : [];
        const savedCombinations = getProductBranchCombinations(savedProduct, branchId);

        for (const combination of sourceCombinations) {
          const quantity = normalizeNumber(combination?.stock);
          if (quantity <= 0) continue;

          const match = savedCombinations.find((candidate: any) =>
            sameVariantRecord(candidate?.variantes || {}, combination?.variantes || {})
          );

          if (!match?.variantKey) continue;

          await pushQrItem({
            productId: String(savedProduct._id),
            productName: String(savedProduct?.nombre_producto || variant?.product?.nombre_producto || "Producto"),
            sellerId: String(savedProduct?.id_vendedor || variant?.product?.id_vendedor || selectedSeller?._id || ""),
            variantKey: String(match.variantKey),
            variantLabel: String(match?.variantLabel || Object.values(combination?.variantes || {}).filter(Boolean).join(" / ") || "Variante"),
            quantity,
          });
        }
      }

      for (const rawItem of productData) {
        const product = rawItem.productData || rawItem;
        const response = await registerProductAPI(product);
        const savedProduct = resolveSavedProduct(response);
        if (savedProduct?._id) {
          createdProducts.push(savedProduct);
        }

        if (!savedProduct?._id) continue;

        const branchId = String(sucursalId || product?.sucursalId || product?._idSucursal || "").trim();
        const sourceCombinations = getProductBranchCombinations(product, branchId);
        const savedCombinations = getProductBranchCombinations(savedProduct, branchId);

        for (const combination of sourceCombinations) {
          const quantity = normalizeNumber(combination?.stock);
          if (quantity <= 0) continue;

          const match = savedCombinations.find((candidate: any) =>
            sameVariantRecord(candidate?.variantes || {}, combination?.variantes || {})
          );

          if (!match?.variantKey) continue;

          await pushQrItem({
            productId: String(savedProduct._id),
            productName: String(savedProduct?.nombre_producto || product?.nombre_producto || "Producto"),
            sellerId: String(savedProduct?.id_vendedor || product?.id_vendedor || selectedSeller?._id || ""),
            variantKey: String(match.variantKey),
            variantLabel: String(match?.variantLabel || Object.values(combination?.variantes || {}).filter(Boolean).join(" / ") || "Variante"),
            quantity,
          });
        }
      }

      const entriesToPersist = stockData.filter((entry) => normalizeNumber(entry?.newStock?.stock) !== 0);

      for (const entry of entriesToPersist) {
        const product = entry.product || {};
        const variantes = toVariantMap(product.variantes);
        const delta = normalizeNumber(entry?.newStock?.stock);
        const productId = String(product._id || product.id_producto || "");

        if (!productId) {
          console.error("No se pudo identificar el producto para actualizar stock.");
          continue;
        }

        if (!Object.keys(variantes).length) {
          console.error("No se encontraron variantes validas para actualizar stock:", productId);
          continue;
        }

        const originalProduct = (productosConSucursales || []).find(
          (candidate: any) => String(candidate?._id) === productId || String(candidate?.id_producto) === productId
        );

        const branch = (originalProduct?.sucursales || []).find((candidate: any) => {
          const branchId =
            typeof candidate?.id_sucursal === "string"
              ? candidate.id_sucursal
              : candidate?.id_sucursal?._id || candidate?.id_sucursal?.$oid || candidate?.id_sucursal?.toString?.();
          return String(branchId) === String(sucursalId);
        });

        const combination = (branch?.combinaciones || []).find((candidate: any) =>
          areVariantsEqual(toVariantMap(candidate?.variantes), variantes)
        );

        const currentStock = normalizeNumber(combination?.stock ?? product?.stock);
        const nextStock = currentStock + delta;

        if (nextStock < 0) {
          throw new Error(
            `La variante ${product.nombre_producto}${getVariantFullLabel(variantes)} quedaria con stock negativo.`
          );
        }

        await updateSubvariantStockAPI({
          productId,
          sucursalId,
          variantes,
          stock: delta,
          stockMode: "delta"
        });

        await createEntryAPI({
          producto: productId,
          sucursal: sucursalId,
          nombre_variante: `${product.nombre_producto || "Producto"}${getVariantFullLabel(variantes)}`,
          cantidad_ingreso: delta,
          estado: delta >= 0 ? "confirmado" : "salida_qr",
          categoria: product.categoria || product.nombre_categoria || "Ropa",
          fecha: new Date().toISOString()
        });

        if (delta > 0) {
          await pushQrItem({
            productId,
            productName: String(product?.nombre_producto || "Producto"),
            sellerId: String(product?.id_vendedor || selectedSeller?._id || ""),
            variantKey: String(product?.variantKey || combination?.variantKey || product?.variant_key || ""),
            variantLabel: String(product?.variantLabel || combination?.variantLabel || Object.values(variantes).filter(Boolean).join(" / ") || "Variante"),
            quantity: delta,
          });
        }
      }

      clearAll();

      const createdProductIds = createdProducts
        .map((product: any) => String(product?._id || ""))
        .filter(Boolean);

      if (createdProductIds.length > 0) {
        message.success(`Cambios aplicados. Productos nuevos: ${createdProductIds.length}`);
      } else {
        message.success("Todos los cambios fueron aplicados correctamente.");
      }

      onSuccess?.({
        createdProductIds,
        qrItems,
        qrQuantities,
      });
    } catch (error: any) {
      console.error("Error al guardar productos:", error);
      message.error(error?.message || "Ocurrio un error al guardar los cambios.");
      throw error;
    }
  };

  return (
    <Modal
      title={null}
      visible={visible}
      onCancel={onClose}
      width={activeScannerMode ? (isCompactScannerLayout ? "96%" : 1340) : isCompactScannerLayout ? "96%" : 980}
      destroyOnClose
      footer={[
        <Button key="clear" danger onClick={clearAll} data-testid="stock-confirm-clear-button">
          Limpiar cambios
        </Button>,
        <Button key="cancel" onClick={onClose} data-testid="stock-confirm-cancel-button">
          Cancelar
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={loadingSave}
          disabled={loadingSave}
          data-testid="stock-confirm-save-button"
          onClick={async () => {
            setLoadingSave(true);
            try {
              await saveProducts();
            } catch (error) {
              console.error("Error al guardar productos:", error);
            } finally {
              setLoadingSave(false);
            }
          }}
        >
          Confirmar cambios
        </Button>
      ]}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }} data-tour-id="stock-ingress-modal" data-testid="stock-confirm-content">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Actualizar stock
            </Title>
          </div>
        </div>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 10
            }}
          >
            <div>
              <Title level={5} style={{ margin: 0 }}>
                Ingresos
              </Title>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button
                icon={<ArrowUpOutlined />}
                style={getScannerButtonStyle("ingress")}
                data-testid="stock-scanner-ingress-button"
                onClick={() => openScanner("ingress")}
              >
                Ingresos
              </Button>
              <Button
                icon={<ArrowDownOutlined />}
                style={getScannerButtonStyle("egress")}
                data-testid="stock-scanner-egress-button"
                onClick={() => openScanner("egress")}
              >
                Salidas
              </Button>
              {activeScannerMode && (
                <Button icon={<StopOutlined />} onClick={closeScannerPanel}>
                  Cerrar escaner
                </Button>
              )}
            </div>
          </div>

          {activeScannerMode && (
            <div style={{ marginBottom: 12, maxWidth: 760, marginInline: "auto" }}>
              <QRScanner
                key={`stock-qr-${activeScannerMode}-${scannerSession}`}
                onProductScanned={handleScannedVariant}
                onClose={closeScannerPanel}
                title={SCAN_MODE_META[activeScannerMode].actionLabel}
                description={SCAN_MODE_META[activeScannerMode].description}
                successLabel={SCAN_MODE_META[activeScannerMode].successLabel}
                groupSuccessLabel={SCAN_MODE_META[activeScannerMode].groupSuccessLabel}
                appearance="simple"
                simpleVideoMinHeight={260}
              />
            </div>
          )}

          {movementRows.length > 0 ? (
            <Table
              data-testid="stock-confirm-movements-table"
              dataSource={movementRows}
              rowKey={buildDraftKey}
              pagination={false}
              scroll={{ x: "max-content" }}
              columns={[
                {
                  title: "Producto",
                  render: (_: any, record: any) => {
                    const variantes = toVariantMap(record?.product?.variantes);
                    return `${record?.product?.nombre_producto || "Producto"}${getVariantFullLabel(variantes)}`;
                  }
                },
                {
                  title: "Stock actual",
                  render: (_: any, record: any) => <span>{normalizeNumber(record?.product?.stock)}</span>
                },
                {
                  title: "Precio unitario",
                  render: (_: any, record: any) => <span>Bs. {normalizeNumber(record?.product?.precio).toFixed(2)}</span>
                },
                {
                  title: "Ingresos",
                  render: (_: any, record: any) => {
                    const delta = normalizeNumber(record?.newStock?.stock);
                    const tone = getMovementTone(delta);
                    return (
                      <InputNumber
                        min={-9999}
                        max={9999}
                        value={delta}
                        formatter={(value) => {
                          if (value === null || value === undefined || value === "") return "";
                          const numericValue = normalizeNumber(value);
                          return numericValue > 0 ? `+${numericValue}` : `${numericValue}`;
                        }}
                        parser={(value) => String(value || "").replace(/[^\d-]/g, "")}
                        onChange={(value) => handleEditStock(record, value)}
                        style={{
                          width: 120,
                          color: tone.color,
                          borderColor: tone.borderColor,
                          background: tone.background
                        }}
                      />
                    );
                  }
                },
                {
                  title: "Stock final",
                  render: (_: any, record: any) => {
                    const currentStock = normalizeNumber(record?.product?.stock);
                    const delta = normalizeNumber(record?.newStock?.stock);
                    const tone = getMovementTone(delta);
                    return <Text strong style={{ color: tone.color }}>{currentStock + delta}</Text>;
                  }
                },
                {
                  title: "Categoria",
                  render: (_: any, record: any) => (
                    <span>{record?.product?.categoria || record?.product?.nombre_categoria || "Sin categoria"}</span>
                  )
                },
                {
                  title: "Acciones",
                  render: (_: any, record: any) => (
                    <Popconfirm
                      title="Eliminar movimiento"
                      onConfirm={() => handleDeleteStockRecord(record)}
                    >
                      <Button danger>Eliminar</Button>
                    </Popconfirm>
                  )
                }
              ]}
            />
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              No hay movimientos pendientes.
            </Text>
          )}
        </div>

        <div>
          <Title level={5} style={{ marginBottom: 10 }}>
            Variantes nuevas
          </Title>
          {variantData.length > 0 ? (
            <Table
              data-testid="stock-confirm-new-variants-table"
              dataSource={variantData.flatMap((record: any, recordIndex: number) =>
                (record.combinaciones || []).map((combination: any, combinationIndex: number) => ({
                  key: `${recordIndex}-${combinationIndex}`,
                  nombre_producto: record.product.nombre_producto,
                  variantes: Object.entries(toVariantMap(combination.variantes))
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(" / "),
                  precio: normalizeNumber(combination.precio),
                  stock: normalizeNumber(combination.stock),
                  variantRecord: record,
                  combinationIndex
                }))
              )}
              rowKey="key"
              pagination={false}
              columns={[
                { title: "Producto", dataIndex: "nombre_producto" },
                { title: "Variantes", dataIndex: "variantes" },
                {
                  title: "Stock",
                  render: (_: any, record: any) => (
                    <InputNumber
                      min={0}
                      value={record.stock}
                      onChange={(value) => {
                        const parsedValue = normalizeNumber(value);
                        setVariantData((current) =>
                          current.map((variantItem: any) => {
                            if (variantItem !== record.variantRecord) return variantItem;
                            const nextCombinations = [...variantItem.combinaciones];
                            nextCombinations[record.combinationIndex] = {
                              ...nextCombinations[record.combinationIndex],
                              stock: parsedValue
                            };
                            return { ...variantItem, combinaciones: nextCombinations };
                          })
                        );
                      }}
                    />
                  )
                },
                {
                  title: "Precio",
                  render: (_: any, record: any) => (
                    <InputNumber
                      min={0}
                      value={record.precio}
                      onChange={(value) => {
                        const parsedValue = normalizeNumber(value);
                        setVariantData((current) =>
                          current.map((variantItem: any) => {
                            if (variantItem !== record.variantRecord) return variantItem;
                            const nextCombinations = [...variantItem.combinaciones];
                            nextCombinations[record.combinationIndex] = {
                              ...nextCombinations[record.combinationIndex],
                              precio: parsedValue
                            };
                            return { ...variantItem, combinaciones: nextCombinations };
                          })
                        );
                      }}
                    />
                  )
                },
                {
                  title: "Acciones",
                  render: (_: any, record: any) => (
                    <Popconfirm
                      title="Eliminar variante"
                      onConfirm={() => {
                        setVariantData((current) =>
                          current.map((variantItem: any) => {
                            if (variantItem !== record.variantRecord) return variantItem;
                            return {
                              ...variantItem,
                              combinaciones: variantItem.combinaciones.filter(
                                (_: any, index: number) => index !== record.combinationIndex
                              )
                            };
                          })
                        );
                      }}
                    >
                      <Button danger>Eliminar</Button>
                    </Popconfirm>
                  )
                }
              ]}
            />
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              No hay variantes nuevas.
            </Text>
          )}
        </div>

        <div>
          <Title level={5} style={{ marginBottom: 10 }}>
            Productos nuevos
          </Title>
          {flattenedCombinations.length > 0 ? (
            <Table
              data-testid="stock-confirm-new-products-table"
              dataSource={flattenedCombinations}
              rowKey="key"
              pagination={false}
              columns={[
                { title: "Producto", dataIndex: "nombre_producto" },
                { title: "Variantes", dataIndex: "variantes" },
                {
                  title: "Stock",
                  render: (_: any, record: any) => (
                    <InputNumber
                      min={0}
                      value={record.stock}
                      onChange={(value) =>
                        handleEditProduct(record.productId, record.sucursalId, record.index, "stock", value)
                      }
                    />
                  )
                },
                {
                  title: "Precio",
                  render: (_: any, record: any) => (
                    <InputNumber
                      min={0}
                      value={record.precio}
                      onChange={(value) =>
                        handleEditProduct(record.productId, record.sucursalId, record.index, "precio", value)
                      }
                    />
                  )
                },
                {
                  title: "Acciones",
                  render: (_: any, record: any) => (
                    <Popconfirm
                      title="Eliminar combinacion"
                      onConfirm={() => {
                        setProductData((current) =>
                          current.map((rawItem: any) => {
                            const product = rawItem.productData || rawItem;
                            if (String(product._id) !== String(record.productId)) return rawItem;

                            const nextSucursales = (product.sucursales || []).map((sucursal: any) => {
                              if (String(sucursal.id_sucursal) !== String(record.sucursalId)) return sucursal;
                              return {
                                ...sucursal,
                                combinaciones: (sucursal.combinaciones || []).filter(
                                  (_: any, index: number) => index !== record.index
                                )
                              };
                            });

                            return {
                              ...rawItem,
                              productData: {
                                ...product,
                                sucursales: nextSucursales
                              }
                            };
                          })
                        );
                      }}
                    >
                      <Button danger>Eliminar</Button>
                    </Popconfirm>
                  )
                }
              ]}
            />
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              No hay productos nuevos.
            </Text>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmProductsModal;
