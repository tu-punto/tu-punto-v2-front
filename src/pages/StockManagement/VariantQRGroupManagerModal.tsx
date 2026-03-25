import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Collapse,
  Empty,
  Input,
  Modal,
  Select,
  Spin,
  Switch,
  Tag,
  Typography,
  message
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FolderOpenOutlined,
  InboxOutlined,
  PrinterOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  SaveOutlined
} from "@ant-design/icons";
import { getFlatProductListAPI } from "../../api/product";
import {
  createVariantQRGroupAPI,
  generateVariantQRGroupAPI,
  getVariantQRGroupByIdAPI,
  listVariantQRGroupAPI,
  updateVariantQRGroupAPI
} from "../../api/qr";
import {
  buildDirectGroupLabelImageData,
  GroupPreviewItem,
  openGroupPrintWindow,
  PrintableGroupItem,
  toBase64Png
} from "./variantQRGroupPrint";
import {
  connectQz,
  createPixelConfig,
  findQzPrinters,
  isQzConnected,
  qzPrint
} from "../../utils/qzTray";

const { Text } = Typography;

interface SellerItem {
  _id: string;
  nombre?: string;
  apellido?: string;
}

interface InventoryVariantItem {
  key: string;
  productId: string;
  productName: string;
  sellerId: string;
  sellerName: string;
  variantKey: string;
  variantLabel: string;
  stock: number;
  price: number;
  sucursalId?: string;
}

interface GroupSummaryItem {
  id: string;
  name: string;
  sellerId: string;
  groupCode: string;
  qrImagePath: string;
  active: boolean;
  totalItems: number;
  previewItems: Array<{
    productId: string;
    variantKey: string;
    productName: string;
    variantLabel: string;
  }>;
  updatedAt?: string;
}

interface GroupResolvedItem {
  productId: string;
  productName: string;
  sellerId: string;
  variantKey: string;
  variantLabel: string;
  variantes: Record<string, string>;
  precio: number;
  stock: number;
  sucursalId?: string;
  status: "available" | "out_of_stock" | "missing_product" | "missing_variant" | "branch_unavailable";
  message?: string;
}

interface GroupDetail {
  id: string;
  name: string;
  sellerId: string;
  groupCode: string;
  qrPayload: string;
  qrImagePath: string;
  active: boolean;
  totalItems: number;
  availableItems: number;
  unavailableItems: number;
  items: GroupResolvedItem[];
  updatedAt?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  sellers: SellerItem[];
  selectedSellerId?: string;
  selectedSucursalId?: string;
}

const waitMs = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const formatPrice = (value: number) => `Bs. ${Number(value || 0).toFixed(2)}`;

const VariantQRGroupManagerModal = ({
  open,
  onClose,
  sellers,
  selectedSellerId,
  selectedSucursalId
}: Props) => {
  const [sellerId, setSellerId] = useState<string | undefined>(
    selectedSellerId ? String(selectedSellerId) : undefined
  );
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventorySearchDebounced, setInventorySearchDebounced] = useState("");
  const [groupsSearch, setGroupsSearch] = useState("");
  const [groupsSearchDebounced, setGroupsSearchDebounced] = useState("");
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryVariantItem[]>([]);
  const [groups, setGroups] = useState<GroupSummaryItem[]>([]);
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);
  const [groupDetailsById, setGroupDetailsById] = useState<Record<string, GroupDetail>>({});
  const [draftGroupName, setDraftGroupName] = useState("");
  const [draftItems, setDraftItems] = useState<InventoryVariantItem[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [draftGroupActive, setDraftGroupActive] = useState(true);
  const [generatingGroupId, setGeneratingGroupId] = useState<string | null>(null);
  const [ticketWidthMm, setTicketWidthMm] = useState<number>(40);
  const [qrSizeMm, setQrSizeMm] = useState<number>(16);
  const [printDelayMs, setPrintDelayMs] = useState<number>(0);
  const [qzBusy, setQzBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [qzConnected, setQzConnected] = useState(false);
  const [qzPrinters, setQzPrinters] = useState<string[]>([]);
  const [selectedQzPrinter, setSelectedQzPrinter] = useState<string | undefined>(
    localStorage.getItem("qzPrinterName") || undefined
  );
  const [directPreviewVisible, setDirectPreviewVisible] = useState(false);
  const [directPreviewItems, setDirectPreviewItems] = useState<GroupPreviewItem[]>([]);

  const sellerLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const seller of sellers || []) {
      map.set(String(seller._id), `${seller.nombre || ""} ${seller.apellido || ""}`.trim());
    }
    return map;
  }, [sellers]);

  const sellerOptions = useMemo(
    () =>
      (sellers || []).map((seller) => ({
        value: String(seller._id),
        label: `${seller.nombre || ""} ${seller.apellido || ""}`.trim()
      })),
    [sellers]
  );

  const selectedKeys = useMemo(() => new Set(draftItems.map((item) => item.key)), [draftItems]);

  const groupedDraftItems = useMemo(() => {
    const map = new Map<string, { key: string; title: string; items: InventoryVariantItem[] }>();
    for (const item of draftItems) {
      if (!map.has(item.productId)) {
        map.set(item.productId, {
          key: item.productId,
          title: item.productName,
          items: []
        });
      }
      map.get(item.productId)?.items.push(item);
    }
    return Array.from(map.values());
  }, [draftItems]);

  const printableGroups = useMemo(
    () =>
      groups
        .filter((group) => group.qrImagePath)
        .map((group) => ({
          id: group.id,
          name: group.name,
          sellerLabel: sellerLabelById.get(String(group.sellerId)) || "Sin vendedor",
          itemCount: group.totalItems,
          qrImagePath: group.qrImagePath
        })),
    [groups, sellerLabelById]
  );

  const resetDraft = () => {
    setDraftGroupName("");
    setDraftItems([]);
    setEditingGroupId(null);
    setDraftGroupActive(true);
  };

  const loadInventory = async (sellerIdValue?: string, qValue?: string) => {
    if (!sellerIdValue) {
      setInventoryItems([]);
      return;
    }

    setInventoryLoading(true);
    try {
      const rows = await getFlatProductListAPI({
        sellerId: sellerIdValue,
        sucursalId: selectedSucursalId,
        q: qValue,
        inStock: undefined
      });

      const normalizedRows = (Array.isArray(rows) ? rows : [])
        .filter((row: any) => row?.variantKey)
        .map((row: any) => ({
          key: `${String(row._id)}::${String(row.variantKey)}`,
          productId: String(row._id),
          productName: row.nombre_producto || "Producto",
          sellerId: String(row.id_vendedor || sellerIdValue),
          sellerName: row.vendedor || sellerLabelById.get(String(row.id_vendedor || sellerIdValue)) || "Vendedor",
          variantKey: String(row.variantKey),
          variantLabel: row.variante || String(row.variantKey),
          stock: Number(row.stock || 0),
          price: Number(row.precio || 0),
          sucursalId: row.sucursalId ? String(row.sucursalId) : undefined
        }))
        .sort((a: InventoryVariantItem, b: InventoryVariantItem) => {
          if (a.productName !== b.productName) return a.productName.localeCompare(b.productName);
          return a.variantLabel.localeCompare(b.variantLabel);
        });

      setInventoryItems(normalizedRows);
    } catch (error) {
      console.error(error);
      message.error("No se pudo cargar el inventario del vendedor");
      setInventoryItems([]);
    } finally {
      setInventoryLoading(false);
    }
  };

  const loadGroups = async (sellerIdValue?: string, qValue?: string) => {
    setGroupsLoading(true);
    try {
      const response = await listVariantQRGroupAPI({
        sellerId: sellerIdValue,
        q: qValue,
        limit: 100
      });
      setGroups((response?.result?.items || []) as GroupSummaryItem[]);
    } catch (error) {
      console.error(error);
      message.error("No se pudo cargar la lista de grupos");
      setGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  };

  const loadGroupDetail = async (groupId: string) => {
    if (groupDetailsById[groupId]) return groupDetailsById[groupId];
    const response = await getVariantQRGroupByIdAPI(groupId, selectedSucursalId);
    const group = response?.group as GroupDetail | undefined;
    if (!group) {
      throw new Error("No se pudo obtener detalle del grupo");
    }
    setGroupDetailsById((current) => ({
      ...current,
      [groupId]: group
    }));
    return group;
  };

  const handleToggleItem = (item: InventoryVariantItem) => {
    setDraftItems((current) => {
      const exists = current.some((draftItem) => draftItem.key === item.key);
      if (exists) {
        return current.filter((draftItem) => draftItem.key !== item.key);
      }
      return [...current, item];
    });
  };

  const handleRemoveDraftItem = (key: string) => {
    setDraftItems((current) => current.filter((item) => item.key !== key));
  };

  const handleEditGroup = async (groupId: string) => {
    try {
      const group = await loadGroupDetail(groupId);
      setSellerId(String(group.sellerId));
      setEditingGroupId(group.id);
      setDraftGroupName(group.name);
      setDraftGroupActive(group.active);
      setDraftItems(
        group.items.map((item) => ({
          key: `${String(item.productId)}::${String(item.variantKey)}`,
          productId: String(item.productId),
          productName: item.productName || "Producto",
          sellerId: String(group.sellerId),
          sellerName: sellerLabelById.get(String(group.sellerId)) || "Vendedor",
          variantKey: String(item.variantKey),
          variantLabel: item.variantLabel || String(item.variantKey),
          stock: Number(item.stock || 0),
          price: Number(item.precio || 0),
          sucursalId: item.sucursalId ? String(item.sucursalId) : undefined
        }))
      );
      message.success("Grupo cargado en la caja actual");
    } catch (error) {
      console.error(error);
      message.error("No se pudo cargar el grupo");
    }
  };

  const handlePersistGroup = async (generateAfterSave = false) => {
    if (!sellerId) {
      message.warning("Selecciona un vendedor antes de guardar el grupo");
      return;
    }
    if (!draftGroupName.trim()) {
      message.warning("Asigna un nombre al grupo");
      return;
    }
    if (!draftItems.length) {
      message.warning("Selecciona al menos una variante para el grupo");
      return;
    }

    setSavingGroup(true);
    try {
      const payload = {
        name: draftGroupName.trim(),
        sellerId,
        items: draftItems.map((item) => ({
          productId: item.productId,
          variantKey: item.variantKey
        }))
      };

      const response = editingGroupId
        ? await updateVariantQRGroupAPI(editingGroupId, {
            name: payload.name,
            items: payload.items,
            active: draftGroupActive
          })
        : await createVariantQRGroupAPI(payload);

      const group = response?.group as GroupDetail | undefined;
      if (!response?.success || !group) {
        message.error("No se pudo guardar el grupo");
        return;
      }

      setEditingGroupId(group.id);
      setDraftGroupActive(group.active);
      setGroupDetailsById((current) => ({
        ...current,
        [group.id]: group
      }));
      await loadGroups(sellerId, groupsSearchDebounced);
      message.success(editingGroupId ? "Grupo actualizado" : "Grupo creado");

      if (generateAfterSave) {
        await handleGenerateGroupQR(group.id);
      }
    } catch (error) {
      console.error(error);
      message.error("Error guardando el grupo");
    } finally {
      setSavingGroup(false);
    }
  };

  const handleGenerateGroupQR = async (groupId: string) => {
    setGeneratingGroupId(groupId);
    try {
      const response = await generateVariantQRGroupAPI(groupId);
      const qrData = response?.qrData as
        | { id: string; qrImagePath: string; name: string; groupCode: string; active: boolean }
        | undefined;
      if (!response?.success || !qrData) {
        message.error("No se pudo generar el QR del grupo");
        return;
      }

      setGroups((current) =>
        current.map((item) =>
          item.id === groupId
            ? {
                ...item,
                qrImagePath: qrData.qrImagePath
              }
            : item
        )
      );
      setGroupDetailsById((current) =>
        current[groupId]
          ? {
              ...current,
              [groupId]: {
                ...current[groupId],
                qrImagePath: qrData.qrImagePath
              }
            }
          : current
      );
      message.success("QR del grupo generado correctamente");
    } catch (error) {
      console.error(error);
      message.error("Error generando QR del grupo");
    } finally {
      setGeneratingGroupId(null);
    }
  };

  const ensurePrintable = (group: GroupSummaryItem | GroupDetail): PrintableGroupItem | null => {
    if (!group.qrImagePath) {
      message.warning("El grupo aun no tiene QR generado");
      return null;
    }

    return {
      id: String(group.id),
      name: group.name,
      sellerLabel: sellerLabelById.get(String(group.sellerId)) || "Sin vendedor",
      itemCount: group.totalItems,
      qrImagePath: group.qrImagePath
    };
  };

  const handleOpenQr = (group: GroupSummaryItem | GroupDetail) => {
    if (!group.qrImagePath) {
      message.warning("El grupo aun no tiene QR generado");
      return;
    }
    window.open(group.qrImagePath, "_blank");
  };

  const handlePrintGroupsDirect = async (items: PrintableGroupItem[], isTest = false) => {
    if (!selectedQzPrinter) {
      message.warning("Selecciona una impresora para impresion directa");
      return;
    }
    if (!items.length) {
      message.warning("No hay grupos para imprimir");
      return;
    }

    setQzBusy(true);
    try {
      const targetItems = isTest ? [items[0]] : items;
      for (const [index, item] of targetItems.entries()) {
        const labelImage = await buildDirectGroupLabelImageData(item, {
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
          ? "Etiqueta de prueba de grupo enviada"
          : `Impresion directa completada: ${targetItems.length} grupo(s)`
      );
    } catch (error) {
      console.error(error);
      message.error("Error en impresion directa del grupo");
    } finally {
      setQzBusy(false);
    }
  };

  const handleOpenDirectPreview = async (items: PrintableGroupItem[], isTest = false) => {
    if (!items.length) {
      message.warning("No hay grupos para previsualizar");
      return;
    }

    setPreviewBusy(true);
    try {
      const targetItems = isTest ? [items[0]] : items;
      const previews = await Promise.all(
        targetItems.map(async (item) => {
          const labelImage = await buildDirectGroupLabelImageData(item, {
            ticketWidthMm,
            qrSizeMm
          });

          return {
            id: item.id,
            title: item.name,
            subtitle: `${item.sellerLabel} | ${item.itemCount} variante(s)`,
            dataUrl: labelImage.dataUrl,
            heightMm: labelImage.heightMm
          };
        })
      );

      setDirectPreviewItems(previews);
      setDirectPreviewVisible(true);
    } catch (error) {
      console.error(error);
      message.error("No se pudo generar la vista previa del grupo");
    } finally {
      setPreviewBusy(false);
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
      message.error("No se pudo conectar con QZ Tray. Verifica que este abierto.");
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setInventorySearchDebounced(inventorySearch.trim());
    }, 280);
    return () => window.clearTimeout(timer);
  }, [inventorySearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setGroupsSearchDebounced(groupsSearch.trim());
    }, 280);
    return () => window.clearTimeout(timer);
  }, [groupsSearch]);

  useEffect(() => {
    if (!open) return;
    setSellerId(selectedSellerId ? String(selectedSellerId) : undefined);
  }, [open, selectedSellerId]);

  useEffect(() => {
    if (!open) return;
    void loadInventory(sellerId, inventorySearchDebounced);
  }, [open, sellerId, selectedSucursalId, inventorySearchDebounced]);

  useEffect(() => {
    if (!open) return;
    void loadGroups(sellerId, groupsSearchDebounced);
  }, [open, sellerId, groupsSearchDebounced]);

  useEffect(() => {
    if (!open) return;
    const syncQzStatus = async () => {
      const connected = await isQzConnected();
      setQzConnected(connected);
      if (connected) {
        const printers = await findQzPrinters();
        setQzPrinters(printers);
      }
    };
    void syncQzStatus();
  }, [open]);

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width={1180}
        destroyOnClose
        title="Grupos QR"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              border: "1px solid #f0d8bd",
              borderRadius: 16,
              background: "linear-gradient(180deg, #fffaf4 0%, #fff 100%)",
              padding: 16
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg, #ffe8c7 0%, #fff5e6 100%)",
                  color: "#b86d17"
                }}
              >
                <InboxOutlined />
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>Arma cajas reutilizables</div>
                <div style={{ fontSize: 12, color: "#8c6b45" }}>
                  Selecciona variantes, guardalas en un grupo y genera un solo QR por caja.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Text strong>Vendedor del grupo</Text>
                <Select
                  className="w-full mt-1"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  value={sellerId}
                  onChange={(value) => {
                    setSellerId(value);
                    resetDraft();
                  }}
                  options={sellerOptions}
                  placeholder="Selecciona un vendedor"
                />
              </div>
              <div>
                <Text strong>Buscar variantes</Text>
                <Input
                  className="mt-1"
                  value={inventorySearch}
                  onChange={(event) => setInventorySearch(event.target.value)}
                  placeholder="Producto o variante"
                />
              </div>
              <div>
                <Text strong>Buscar grupos guardados</Text>
                <Input
                  className="mt-1"
                  value={groupsSearch}
                  onChange={(event) => setGroupsSearch(event.target.value)}
                  placeholder="Nombre o codigo"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <Tag color="gold">{inventoryItems.length} variantes</Tag>
              <Tag color="orange">{draftItems.length} en caja</Tag>
              {selectedSucursalId && <Tag color="blue">Sucursal filtrada</Tag>}
              {editingGroupId ? <Tag color="purple">Editando grupo</Tag> : <Tag>Grupo nuevo</Tag>}
              <Button size="small" icon={<ReloadOutlined />} onClick={() => void loadGroups(sellerId, groupsSearchDebounced)}>
                Recargar
              </Button>
              <Button size="small" onClick={resetDraft}>
                Limpiar caja
              </Button>
            </div>
          </div>

          {!sellerId ? (
            <Alert
              type="info"
              showIcon
              message="Selecciona un vendedor para empezar"
              description="Los grupos solo pueden mezclar variantes del mismo vendedor."
            />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.9fr] gap-4">
              <Card
                bordered={false}
                style={{ borderRadius: 18, boxShadow: "0 10px 30px rgba(201, 127, 32, 0.08)" }}
                bodyStyle={{ padding: 16 }}
                title={
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>Variantes disponibles</div>
                      <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                        Haz clic para meter o sacar variantes de la caja actual.
                      </div>
                    </div>
                    <Badge count={inventoryItems.length} style={{ backgroundColor: "#c77822" }} />
                  </div>
                }
              >
                <Spin spinning={inventoryLoading}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 500, overflowY: "auto", paddingRight: 4 }}>
                    {!inventoryItems.length ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No hay variantes para este filtro" />
                    ) : (
                      inventoryItems.map((item) => {
                        const checked = selectedKeys.has(item.key);
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => handleToggleItem(item)}
                            style={{
                              textAlign: "left",
                              width: "100%",
                              border: checked ? "1px solid #f0b36d" : "1px solid #ececec",
                              borderRadius: 16,
                              padding: 12,
                              background: checked
                                ? "linear-gradient(135deg, #fff4e8 0%, #fffdf8 100%)"
                                : "#fff",
                              boxShadow: checked ? "0 8px 18px rgba(217, 136, 44, 0.12)" : "none",
                              transition: "all 0.18s ease"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                <Checkbox checked={checked} style={{ marginTop: 3, pointerEvents: "none" }} />
                                <div>
                                  <div style={{ fontWeight: 700 }}>{item.productName}</div>
                                  <div style={{ color: "#7a7a7a", fontSize: 13 }}>{item.variantLabel}</div>
                                  <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    <Tag color={item.stock > 0 ? "green" : "volcano"}>Stock: {item.stock}</Tag>
                                    <Tag color="blue">{formatPrice(item.price)}</Tag>
                                  </div>
                                </div>
                              </div>
                              <Tag color={checked ? "gold" : "default"}>
                                {checked ? "En caja" : "Disponible"}
                              </Tag>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </Spin>
              </Card>

              <Card
                bordered={false}
                style={{ borderRadius: 18, boxShadow: "0 10px 30px rgba(90, 92, 101, 0.08)" }}
                bodyStyle={{ padding: 16 }}
                title={
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>Caja actual</div>
                      <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                        Define nombre, revisa contenido y guarda el grupo.
                      </div>
                    </div>
                    <InboxOutlined style={{ fontSize: 20, color: "#b86d17" }} />
                  </div>
                }
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <Text strong>Nombre del grupo</Text>
                    <Input
                      className="mt-1"
                      value={draftGroupName}
                      onChange={(event) => setDraftGroupName(event.target.value)}
                      placeholder="Ej. Caja accesorios mini"
                    />
                  </div>

                  {editingGroupId && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: "1px solid #ebebeb",
                        background: "#fafafa"
                      }}
                    >
                      <div>
                        <Text strong>Grupo activo</Text>
                        <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                          Si lo desactivas, su QR dejara de resolver en ventas.
                        </div>
                      </div>
                      <Switch checked={draftGroupActive} onChange={setDraftGroupActive} />
                    </div>
                  )}

                  <Alert
                    type="info"
                    showIcon
                    message={editingGroupId ? "Editando grupo guardado" : "Preparando grupo nuevo"}
                    description={
                      editingGroupId
                        ? "Puedes ajustar el contenido y luego guardar los cambios sin perder la identidad del QR."
                        : "La caja se guarda primero y despues puedes generar o regenerar su QR."
                    }
                  />

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Button icon={<DeleteOutlined />} onClick={resetDraft}>
                      Vaciar
                    </Button>
                    <Button
                      icon={<SaveOutlined />}
                      onClick={() => void handlePersistGroup(false)}
                      loading={savingGroup}
                      type="primary"
                    >
                      {editingGroupId ? "Guardar cambios" : "Guardar grupo"}
                    </Button>
                    <Button icon={<QrcodeOutlined />} onClick={() => void handlePersistGroup(true)} loading={savingGroup}>
                      Guardar + generar QR
                    </Button>
                  </div>

                  <div style={{ borderRadius: 16, border: "1px solid #ece7de", background: "#fffdf9", padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <Text strong>Contenido de la caja</Text>
                      <Tag color="gold">{draftItems.length} item(s)</Tag>
                    </div>

                    {!draftItems.length ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tu caja esta vacia" />
                    ) : (
                      <Collapse
                        size="small"
                        defaultActiveKey={groupedDraftItems.map((group) => group.key)}
                        items={groupedDraftItems.map((group) => ({
                          key: group.key,
                          label: (
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                              <span>{group.title}</span>
                              <Tag>{group.items.length}</Tag>
                            </div>
                          ),
                          children: (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {group.items.map((item) => (
                                <div
                                  key={item.key}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 8,
                                    alignItems: "center",
                                    padding: "8px 10px",
                                    borderRadius: 12,
                                    background: "#fff",
                                    border: "1px solid #f1f1f1"
                                  }}
                                >
                                  <div>
                                    <div style={{ fontWeight: 600 }}>{item.variantLabel}</div>
                                    <div style={{ color: "#8c8c8c", fontSize: 12 }}>
                                      {formatPrice(item.price)} | stock {item.stock}
                                    </div>
                                  </div>
                                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleRemoveDraftItem(item.key)} />
                                </div>
                              ))}
                            </div>
                          )
                        }))}
                      />
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          <Card bordered={false} style={{ borderRadius: 18, boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)" }} bodyStyle={{ padding: 16 }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Text strong>Ancho ticket</Text>
                <Select
                  className="w-full mt-1"
                  value={ticketWidthMm}
                  onChange={(value) => setTicketWidthMm(Number(value))}
                  options={[
                    { value: 40, label: "40 mm" },
                    { value: 58, label: "58 mm" },
                    { value: 80, label: "80 mm" }
                  ]}
                />
              </div>
              <div>
                <Text strong>Tamaño QR</Text>
                <Select
                  className="w-full mt-1"
                  value={qrSizeMm}
                  onChange={(value) => setQrSizeMm(Number(value))}
                  options={[
                    { value: 12, label: "12 mm" },
                    { value: 14, label: "14 mm" },
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
                    { value: 500, label: "500 ms" },
                    { value: 800, label: "800 ms" }
                  ]}
                />
              </div>
            </div>

            <Alert
              style={{ marginTop: 12 }}
              type={qzConnected ? "success" : "warning"}
              showIcon
              message="Impresion directa 1x1"
              description={
                qzConnected
                  ? "QZ Tray conectado. Puedes imprimir grupos uno por uno con etiqueta compacta."
                  : "Si quieres impresion directa, conecta QZ Tray y busca la impresora."
              }
            />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <Button onClick={handleConnectQz} loading={qzBusy}>
                {qzConnected ? "Reconectar QZ" : "Conectar QZ"}
              </Button>
              <Button onClick={handleLoadQzPrinters} loading={qzBusy} disabled={!qzConnected}>
                Buscar impresoras
              </Button>
              <Select
                style={{ minWidth: 280, flex: 1 }}
                value={selectedQzPrinter}
                onChange={(value) => {
                  setSelectedQzPrinter(value);
                  localStorage.setItem("qzPrinterName", value);
                }}
                options={qzPrinters.map((printer) => ({ value: printer, label: printer }))}
                placeholder="Selecciona impresora"
                showSearch
                optionFilterProp="label"
              />
              <Button onClick={() => openGroupPrintWindow(printableGroups, { ticketWidthMm, qrSizeMm })} disabled={printableGroups.length === 0}>
                Imprimir todos / PDF
              </Button>
              <Button
                onClick={() => void handlePrintGroupsDirect(printableGroups, true)}
                disabled={!qzConnected || !selectedQzPrinter || printableGroups.length === 0 || previewBusy}
                loading={qzBusy}
              >
                Probar 1
              </Button>
              <Button
                type="primary"
                onClick={() => void handlePrintGroupsDirect(printableGroups, false)}
                disabled={!qzConnected || !selectedQzPrinter || printableGroups.length === 0 || previewBusy}
                loading={qzBusy}
              >
                Imprimir directo
              </Button>
              <Button icon={<EyeOutlined />} onClick={() => void handleOpenDirectPreview(printableGroups, false)} disabled={printableGroups.length === 0 || qzBusy} loading={previewBusy}>
                Preview
              </Button>
            </div>
          </Card>

          <Card bordered={false} style={{ borderRadius: 18, boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)" }} bodyStyle={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Grupos guardados</div>
                <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                  Reutiliza grupos existentes, editalos o genera su QR cuando lo necesites.
                </div>
              </div>
              <Tag color="blue">{groups.length} grupo(s)</Tag>
            </div>

            <Spin spinning={groupsLoading}>
              {!groups.length ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No hay grupos guardados para este filtro" />
              ) : (
                <Collapse
                  size="small"
                  activeKey={expandedGroupIds}
                  onChange={(keys) => {
                    const nextKeys = (Array.isArray(keys) ? keys : [keys]).map(String);
                    setExpandedGroupIds(nextKeys);
                    nextKeys.forEach((groupId) => {
                      if (!groupDetailsById[groupId]) {
                        void loadGroupDetail(groupId).catch((error) => {
                          console.error(error);
                          message.error("No se pudo cargar el detalle del grupo");
                        });
                      }
                    });
                  }}
                  items={groups.map((group) => {
                    const detail = groupDetailsById[group.id];
                    return {
                      key: group.id,
                      label: (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700 }}>{group.name}</div>
                            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                              {group.groupCode} | {sellerLabelById.get(String(group.sellerId)) || "Sin vendedor"}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                            <Tag color={group.active ? "green" : "default"}>{group.active ? "Activo" : "Inactivo"}</Tag>
                            <Tag color="gold">{group.totalItems} item(s)</Tag>
                          </div>
                        </div>
                      ),
                      extra: (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleEditGroup(group.id);
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            size="small"
                            icon={<QrcodeOutlined />}
                            loading={generatingGroupId === group.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleGenerateGroupQR(group.id);
                            }}
                          >
                            Generar QR
                          </Button>
                          <Button
                            size="small"
                            icon={<FolderOpenOutlined />}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleOpenQr(group);
                            }}
                          >
                            Ver QR
                          </Button>
                          <Button
                            size="small"
                            icon={<PrinterOutlined />}
                            onClick={(event) => {
                              event.stopPropagation();
                              const printable = ensurePrintable(group);
                              if (printable) {
                                openGroupPrintWindow([printable], { ticketWidthMm, qrSizeMm });
                              }
                            }}
                          >
                            Imprimir
                          </Button>
                          <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={(event) => {
                              event.stopPropagation();
                              const printable = ensurePrintable(group);
                              if (printable) {
                                void handleOpenDirectPreview([printable], true);
                              }
                            }}
                          >
                            Preview
                          </Button>
                        </div>
                      ),
                      children: (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {(detail?.items || group.previewItems || []).slice(0, detail ? detail.items.length : 5).map((item: any) => (
                              <Tag key={`${group.id}-${String(item.productId)}-${String(item.variantKey)}`}>
                                {item.productName} · {item.variantLabel}
                              </Tag>
                            ))}
                          </div>

                          {detail ? (
                            <>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <Tag color="green">Disponibles: {detail.availableItems}</Tag>
                                <Tag color={detail.unavailableItems > 0 ? "volcano" : "default"}>
                                  No disponibles: {detail.unavailableItems}
                                </Tag>
                                {detail.qrImagePath ? <Tag color="blue">QR generado</Tag> : <Tag>Sin QR</Tag>}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {detail.items.map((item) => {
                                  const statusColor =
                                    item.status === "available"
                                      ? "green"
                                      : item.status === "out_of_stock"
                                        ? "orange"
                                        : "red";
                                  return (
                                    <div
                                      key={`${group.id}-${item.productId}-${item.variantKey}`}
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: 10,
                                        alignItems: "center",
                                        padding: "10px 12px",
                                        borderRadius: 14,
                                        border: "1px solid #efefef",
                                        background: "#fff"
                                      }}
                                    >
                                      <div>
                                        <div style={{ fontWeight: 600 }}>
                                          {item.productName} - {item.variantLabel}
                                        </div>
                                        <div style={{ fontSize: 12, color: "#808080" }}>
                                          {formatPrice(item.precio)} | stock {item.stock}
                                          {item.message ? ` | ${item.message}` : ""}
                                        </div>
                                      </div>
                                      <Tag color={statusColor}>{item.status}</Tag>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                              Expande para cargar el detalle completo del grupo.
                            </div>
                          )}
                        </div>
                      )
                    };
                  })}
                />
              )}
            </Spin>
          </Card>
        </div>
      </Modal>

      <Modal
        open={directPreviewVisible}
        onCancel={() => setDirectPreviewVisible(false)}
        footer={null}
        width={760}
        destroyOnClose
        title="Vista previa exacta de impresion 1x1"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "70vh", overflowY: "auto" }}>
          <Alert
            type="info"
            showIcon
            message="Este preview usa el mismo PNG que se manda a QZ Tray"
            description="Si aqui el render se ve bien, cualquier espacio raro vendra del flujo de impresion o la impresora."
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
              <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
                {item.title} | {item.subtitle} | alto render: {item.heightMm} mm
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
                  alt={item.title}
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
    </>
  );
};

export default VariantQRGroupManagerModal;
