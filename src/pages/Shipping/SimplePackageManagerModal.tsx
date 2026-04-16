import { Button, Empty, Input, InputNumber, Modal, Select, Space, Spin, Typography, message } from "antd";
import { useContext, useEffect, useMemo, useState } from "react";
import {
  createSimplePackageOrdersAPI,
  deleteSimplePackageAPI,
  getSimplePackageBranchPricesAPI,
  getSimplePackagesListAPI,
  getUploadedSimplePackageSellersAPI,
  registerSimplePackagesAPI,
  updateSimplePackageAPI,
} from "../../api/simplePackage";
import { getSellerAPI, getSellersBasicAPI } from "../../api/seller";
import { UserContext } from "../../context/userContext";
import {
  applyPackagePatch,
  calculateSimplePackageTotals,
  createDraftRow,
  resizeDraftRows,
  SimplePackageDraftRow,
} from "../SimplePackages/simplePackageHelpers";
import SimplePackageBranchPriceModal from "./SimplePackageBranchPriceModal";
import { isSuperadminUser } from "../../utils/role";

interface SimplePackageManagerModalProps {
  visible: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

const MIN_PACKAGES = 1;

const tableCellStyle: React.CSSProperties = {
  border: "1px solid #d9d9d9",
  padding: 6,
  verticalAlign: "top",
};

const readonlyBuyerStyle: React.CSSProperties = {
  background: "#fff2e8",
  borderColor: "#ffbb96",
};

const summaryCardStyle: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  padding: "10px 12px",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
};

const getBranchId = (value: any) => String(value?._id || value || "").trim();

const SimplePackageManagerModal = ({ visible, onClose, onChanged }: SimplePackageManagerModalProps) => {
  const { user }: any = useContext(UserContext);
  const currentSucursalId = String(localStorage.getItem("sucursalId") || "").trim();
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 768 : false));

  const [loadingSellers, setLoadingSellers] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [sellerRows, setSellerRows] = useState<any[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [savingRowIds, setSavingRowIds] = useState<string[]>([]);
  const [savingGeneralPayment, setSavingGeneralPayment] = useState(false);
  const [sellerConfig, setSellerConfig] = useState({ precio_paquete: 0, amortizacion: 0, saldo_por_paquete: 0 });
  const [selectedSellerBranches, setSelectedSellerBranches] = useState<any[]>([]);
  const [branchPrices, setBranchPrices] = useState<any[]>([]);
  const [branchPriceModalVisible, setBranchPriceModalVisible] = useState(false);

  const [creating, setCreating] = useState(false);
  const [loadingCreateSellers, setLoadingCreateSellers] = useState(false);
  const [createSellerOptions, setCreateSellerOptions] = useState<any[]>([]);
  const [createSellerId, setCreateSellerId] = useState("");
  const [loadingCreateSellerConfig, setLoadingCreateSellerConfig] = useState(false);
  const [createSellerConfig, setCreateSellerConfig] = useState({ precio_paquete: 0, amortizacion: 0, saldo_por_paquete: 0 });
  const [createSellerBranches, setCreateSellerBranches] = useState<any[]>([]);
  const [createPackageCount, setCreatePackageCount] = useState(MIN_PACKAGES);
  const [createGeneralDescription, setCreateGeneralDescription] = useState("");
  const [createOriginId, setCreateOriginId] = useState(currentSucursalId);
  const [createDestinationId, setCreateDestinationId] = useState(currentSucursalId);
  const [createRows, setCreateRows] = useState<SimplePackageDraftRow[]>([
    createDraftRow(0, { precio_paquete: 0, amortizacion: 0, saldo_por_paquete: 0 }),
  ]);
  const [savingCreate, setSavingCreate] = useState(false);

  const totals = useMemo(() => calculateSimplePackageTotals(rows), [rows]);
  const createTotals = useMemo(() => calculateSimplePackageTotals(createRows), [createRows]);
  const selectedSeller = sellerRows.find((seller) => String(seller._id) === String(selectedSellerId));

  const generalPaymentMethod = useMemo(() => {
    if (!rows.length) return "";
    const rowsWithMethod = rows.filter((row) => String(row.metodo_pago || ""));
    if (!rowsWithMethod.length) return "";
    const firstMethod = String(rowsWithMethod[0]?.metodo_pago || "");
    if (!firstMethod) return "";
    return rowsWithMethod.every((row) => String(row.metodo_pago || "") === firstMethod) ? firstMethod : "mixed";
  }, [rows]);

  const originSummary = useMemo(() => {
    const names = Array.from(
      new Set(
        rows
          .map((row) => String(row?.origen_sucursal?.nombre || row?.sucursal?.nombre || "").trim())
          .filter(Boolean)
      )
    );
    if (!names.length) return "Sin origen";
    if (names.length === 1) return names[0];
    return "Origen mixto";
  }, [rows]);

  const routeOptionsByOrigin = useMemo(() => {
    const map = new Map<string, { value: string; label: string; precio: number }[]>();
    branchPrices.forEach((row: any) => {
      const originId = getBranchId(row?.origen_sucursal);
      const destinationId = getBranchId(row?.destino_sucursal);
      if (!originId || !destinationId) return;
      const current = map.get(originId) || [];
      current.push({
        value: destinationId,
        label: String(row?.destino_sucursal?.nombre || "Sucursal"),
        precio: Number(row?.precio || 0),
      });
      map.set(originId, current);
    });
    return map;
  }, [branchPrices]);

  const allowedSelectedSellerBranchIds = useMemo(
    () =>
      new Set(
        selectedSellerBranches
          .map((branch: any) => String(branch?.id_sucursal?._id || branch?.id_sucursal || ""))
          .filter(Boolean)
      ),
    [selectedSellerBranches]
  );

  const allowedCreateSellerBranchIds = useMemo(
    () =>
      new Set(
        createSellerBranches
          .map((branch: any) => String(branch?.id_sucursal?._id || branch?.id_sucursal || ""))
          .filter(Boolean)
      ),
    [createSellerBranches]
  );

  const getRoutePrice = (originId: string, destinationId?: string) =>
    String(originId) === String(destinationId || "")
      ? 0
      : Number(
          (routeOptionsByOrigin.get(String(originId)) || []).find(
            (item) => String(item.value) === String(destinationId || "")
          )?.precio || 0
        );

  const getDestinationOptions = (originId: string, allowedBranchIds: Set<string>, originName?: string) => {
    if (!originId) return [];
    const routeOptions = (routeOptionsByOrigin.get(String(originId)) || []).filter((item) =>
      allowedBranchIds.has(String(item.value))
    );
    const fallbackOriginLabel =
      originName ||
      routeOptions.find((item) => String(item.value) === String(originId))?.label ||
      "Sucursal origen";

    return [
      ...(allowedBranchIds.has(String(originId)) ? [{ value: originId, label: fallbackOriginLabel }] : []),
      ...routeOptions.filter((item) => String(item.value) !== String(originId)),
    ];
  };

  const createDestinationOptions = useMemo(
    () => getDestinationOptions(createOriginId, allowedCreateSellerBranchIds),
    [allowedCreateSellerBranchIds, createOriginId, routeOptionsByOrigin]
  );

  const resetCreateState = () => {
    setCreating(false);
    setCreatePackageCount(MIN_PACKAGES);
    setCreateGeneralDescription("");
    setCreateOriginId(currentSucursalId);
    setCreateDestinationId(currentSucursalId);
    setCreateRows([createDraftRow(0, { precio_paquete: 0, amortizacion: 0, saldo_por_paquete: 0 })]);
  };

  const fetchBranchPrices = async () => {
    const pricesResponse = await getSimplePackageBranchPricesAPI();
    setBranchPrices(Array.isArray(pricesResponse?.rows) ? pricesResponse.rows : []);
  };

  const fetchSellers = async () => {
    setLoadingSellers(true);
    try {
      const response = await getUploadedSimplePackageSellersAPI({
        originBranchId: currentSucursalId || undefined,
      });
      const nextRows = Array.isArray(response?.rows) ? response.rows : [];
      setSellerRows(nextRows);
      setSelectedSellerId((prev) => {
        if (nextRows.some((seller) => String(seller._id) === String(prev))) return prev;
        return String(nextRows[0]?._id || "");
      });
    } catch (error) {
      console.error(error);
      message.error("No se pudo cargar la lista de vendedores");
    } finally {
      setLoadingSellers(false);
    }
  };

  const fetchCreateSellers = async () => {
    setLoadingCreateSellers(true);
    try {
      const response = await getSellersBasicAPI({
        sucursalId: currentSucursalId || undefined,
        onlySimplePackageAccess: true,
        onlyActiveOrRenewal: true,
      });
      const nextRows = Array.isArray(response) ? response : [];
      setCreateSellerOptions(nextRows);
      setCreateSellerId((prev) => {
        if (selectedSellerId && nextRows.some((seller) => String(seller._id) === String(selectedSellerId))) {
          return String(selectedSellerId);
        }
        if (nextRows.some((seller) => String(seller._id) === String(prev))) return prev;
        return String(nextRows[0]?._id || "");
      });
    } catch (error) {
      console.error(error);
      message.error("No se pudo cargar la lista de vendedores para crear paquetes");
    } finally {
      setLoadingCreateSellers(false);
    }
  };

  const fetchPackages = async (sellerId: string) => {
    if (!sellerId) {
      setRows([]);
      setSelectedSellerBranches([]);
      return;
    }

    setLoadingRows(true);
    try {
      const [response, sellerResponse] = await Promise.all([
        getSimplePackagesListAPI({ sellerId, originBranchId: currentSucursalId || undefined }),
        getSellerAPI(sellerId),
      ]);

      setRows(Array.isArray(response?.rows) ? response.rows : []);
      setSellerConfig({
        precio_paquete: Number(sellerResponse?.precio_paquete || 0),
        amortizacion: Number(sellerResponse?.amortizacion || 0),
        saldo_por_paquete: 0,
      });
      setSelectedSellerBranches(
        Array.isArray(sellerResponse?.pago_sucursales)
          ? sellerResponse.pago_sucursales.filter(
              (branch: any) => branch?.activo !== false && Number(branch?.entrega_simple || 0) > 0
            )
          : []
      );
    } catch (error) {
      console.error(error);
      message.error("No se pudieron cargar los paquetes");
    } finally {
      setLoadingRows(false);
    }
  };

  const fetchCreateSellerConfig = async (sellerId: string) => {
    if (!sellerId) {
      setCreateSellerBranches([]);
      setCreateSellerConfig({ precio_paquete: 0, amortizacion: 0, saldo_por_paquete: 0 });
      return;
    }

    setLoadingCreateSellerConfig(true);
    try {
      const sellerResponse = await getSellerAPI(sellerId);
      const nextBranches = Array.isArray(sellerResponse?.pago_sucursales)
        ? sellerResponse.pago_sucursales.filter(
            (branch: any) => branch?.activo !== false && Number(branch?.entrega_simple || 0) > 0
          )
        : [];
      const branchIds = new Set(
        nextBranches.map((branch: any) => String(branch?.id_sucursal?._id || branch?.id_sucursal || "")).filter(Boolean)
      );
      const nextOriginId = branchIds.has(currentSucursalId)
        ? currentSucursalId
        : String(nextBranches[0]?.id_sucursal?._id || nextBranches[0]?.id_sucursal || "");

      setCreateSellerBranches(nextBranches);
      setCreateSellerConfig({
        precio_paquete: Number(sellerResponse?.precio_paquete || 0),
        amortizacion: Number(sellerResponse?.amortizacion || 0),
        saldo_por_paquete: 0,
      });
      setCreateOriginId(nextOriginId);
      setCreateDestinationId(nextOriginId);
      setCreateRows((prev) =>
        resizeDraftRows(createPackageCount, prev, {
          precio_paquete: Number(sellerResponse?.precio_paquete || 0),
          amortizacion: Number(sellerResponse?.amortizacion || 0),
          saldo_por_paquete: 0,
        })
      );
    } catch (error) {
      console.error(error);
      message.error("No se pudo cargar la configuracion del vendedor");
    } finally {
      setLoadingCreateSellerConfig(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    void Promise.all([fetchSellers(), fetchCreateSellers(), fetchBranchPrices()]);
  }, [visible]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!visible || !selectedSellerId || creating) return;
    void fetchPackages(selectedSellerId);
  }, [visible, selectedSellerId, creating]);

  useEffect(() => {
    if (!visible || !creating) return;
    void fetchCreateSellerConfig(createSellerId);
  }, [visible, creating, createSellerId]);

  useEffect(() => {
    if (!creating || !createOriginId) return;

    setCreateDestinationId((current) =>
      createDestinationOptions.some((option) => String(option.value) === String(current))
        ? current
        : String(createOriginId || "")
    );
    setCreateRows((prev) =>
      prev.map((row, index) => {
        const nextDestinationId =
          row.destino_sucursal_id &&
          createDestinationOptions.some((option) => String(option.value) === String(row.destino_sucursal_id))
            ? row.destino_sucursal_id
            : "";

        return createDraftRow(index, createSellerConfig, {
          ...row,
          destino_sucursal_id: nextDestinationId,
          precio_entre_sucursal: getRoutePrice(createOriginId, nextDestinationId),
        });
      })
    );
  }, [createDestinationOptions, createOriginId, createSellerConfig, creating, routeOptionsByOrigin]);

  const commitRowPatch = async (rowId: string, patch: Record<string, unknown>) => {
    const previousRows = rows;
    const optimisticRows = rows.map((row) => {
      if (String(row._id) !== String(rowId)) return row;
      const originId = getBranchId(row?.origen_sucursal || row?.sucursal);
      const nextDestinationId = String(
        patch.destino_sucursal ?? patch.destino_sucursal_id ?? getBranchId(row?.destino_sucursal)
      );
      const nextRoutePrice =
        patch.precio_entre_sucursal !== undefined
          ? Math.max(0, Number(patch.precio_entre_sucursal || 0))
          : getRoutePrice(originId, nextDestinationId);

      return applyPackagePatch(row, { ...patch, precio_entre_sucursal: nextRoutePrice }, sellerConfig);
    });
    setRows(optimisticRows);
    setSavingRowIds((prev) => [...prev, rowId]);

    try {
      const response = await updateSimplePackageAPI(rowId, patch);
      if (!response.success) {
        setRows(previousRows);
        message.error(response.message || "No se pudo actualizar el paquete");
        return;
      }

      setRows((current) => current.map((row) => (String(row._id) === String(rowId) ? response.data : row)));
    } catch (error) {
      console.error(error);
      setRows(previousRows);
      message.error("Error actualizando el paquete");
    } finally {
      setSavingRowIds((prev) => prev.filter((id) => id !== rowId));
    }
  };

  const handleDelete = (rowId: string) => {
    Modal.confirm({
      title: "Eliminar paquete",
      content: "Esta accion quitara el paquete de la lista del vendedor.",
      okText: "Eliminar",
      okButtonProps: { danger: true },
      cancelText: "Cancelar",
      onOk: async () => {
        const previousRows = rows;
        setRows((current) => current.filter((row) => String(row._id) !== String(rowId)));
        try {
          const response = await deleteSimplePackageAPI(rowId);
          if (!response.success) {
            setRows(previousRows);
            message.error(response.message || "No se pudo eliminar el paquete");
            return;
          }
          message.success("Paquete eliminado");
          void fetchSellers();
        } catch (error) {
          console.error(error);
          setRows(previousRows);
          message.error("Error eliminando el paquete");
        }
      },
    });
  };

  const applyGeneralPaymentMethod = async (method: "" | "efectivo" | "qr") => {
    if (!rows.length) return;

    const previousRows = rows;
    const optimisticRows = rows.map((row) =>
      applyPackagePatch(
        row,
        {
          esta_pagado: "no",
          metodo_pago: method,
        },
        sellerConfig
      )
    );

    setRows(optimisticRows);
    setSavingGeneralPayment(true);

    try {
      const responses = await Promise.all(
        rows.map((row) =>
          updateSimplePackageAPI(String(row._id), {
            esta_pagado: "no",
            metodo_pago: method,
          })
        )
      );

      const failed = responses.find((response: any) => !response?.success);
      if (failed) {
        setRows(previousRows);
        message.error(failed.message || "No se pudo actualizar el metodo general");
        return;
      }

      setRows(responses.map((response: any, index) => response?.data || optimisticRows[index]));
      message.success(method ? `Pago general marcado como ${method}` : "Pago general limpiado");
    } catch (error) {
      console.error(error);
      setRows(previousRows);
      message.error("Error actualizando el metodo general");
    } finally {
      setSavingGeneralPayment(false);
    }
  };

  const updateCreateRow = (index: number, patch: Partial<SimplePackageDraftRow>) => {
    setCreateRows((prev) =>
      prev.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const nextDestinationId = String(patch.destino_sucursal_id ?? (row.destino_sucursal_id || ""));
        const nextRoutePrice =
          patch.precio_entre_sucursal !== undefined
            ? Math.max(0, Number(patch.precio_entre_sucursal || 0))
            : getRoutePrice(createOriginId, nextDestinationId);

        return createDraftRow(index, createSellerConfig, {
          ...row,
          ...patch,
          destino_sucursal_id: nextDestinationId,
          precio_entre_sucursal: nextRoutePrice,
        });
      })
    );
  };

  const handleCreatePackageCountChange = (value: number | null) => {
    const nextCount = Math.max(MIN_PACKAGES, Number(value || MIN_PACKAGES));
    setCreatePackageCount(nextCount);
    setCreateRows((prev) => resizeDraftRows(nextCount, prev, createSellerConfig));
  };

  const handleApplyCreateDescription = () => {
    const description = String(createGeneralDescription || "").trim();
    if (!description) {
      message.warning("Escribe una descripcion general antes de aplicarla");
      return;
    }

    setCreateRows((prev) =>
      prev.map((row, index) =>
        createDraftRow(index, createSellerConfig, {
          ...row,
          descripcion_paquete: description,
        })
      )
    );
    message.success("Descripcion aplicada a todos los paquetes");
  };

  const handleApplyCreateDestination = () => {
    if (!createDestinationId) {
      message.warning("Selecciona una sucursal destino para aplicarla");
      return;
    }

    setCreateRows((prev) =>
      prev.map((row, index) =>
        createDraftRow(index, createSellerConfig, {
          ...row,
          destino_sucursal_id: createDestinationId,
          precio_entre_sucursal: getRoutePrice(createOriginId, createDestinationId),
        })
      )
    );
    message.success("Sucursal destino aplicada a todos los paquetes");
  };

  const handleCreatePackages = async () => {
    if (!createSellerId) {
      message.error("Selecciona un vendedor");
      return;
    }
    if (!createOriginId) {
      message.error("No se pudo identificar la sucursal de origen actual");
      return;
    }

    const payloadRows = createRows.map((row) => ({
      comprador: String(row.comprador || "").trim(),
      telefono_comprador: String(row.telefono_comprador || "").trim(),
      descripcion_paquete: String(row.descripcion_paquete || "").trim(),
      destino_sucursal_id: String(row.destino_sucursal_id || "").trim(),
      package_size: row.package_size,
      saldo_por_paquete: Number(row.saldo_por_paquete || 0),
      precio_entre_sucursal: Number(row.precio_entre_sucursal || 0),
    }));

    for (let index = 0; index < payloadRows.length; index += 1) {
      const row = payloadRows[index];
      if (!row.comprador && !row.telefono_comprador) {
        message.error(`Paquete ${index + 1}: ingresa nombre o celular del comprador`);
        return;
      }
      if (!row.descripcion_paquete) {
        message.error(`Paquete ${index + 1}: la descripcion es obligatoria`);
        return;
      }
      if (!row.destino_sucursal_id) {
        message.error(`Paquete ${index + 1}: selecciona una sucursal destino`);
        return;
      }
    }

    setSavingCreate(true);
    try {
      const response = await registerSimplePackagesAPI({
        sellerId: createSellerId,
        originBranchId: createOriginId,
        paquetes: payloadRows,
      });

      if (!response.success) {
        message.error(response.message || "No se pudieron registrar los paquetes");
        return;
      }

      message.success(`Se registraron ${response.createdCount || payloadRows.length} paquetes`);
      setSelectedSellerId(createSellerId);
      resetCreateState();
      await Promise.all([fetchSellers(), fetchPackages(createSellerId)]);
    } catch (error) {
      console.error(error);
      message.error("Error registrando paquetes");
    } finally {
      setSavingCreate(false);
    }
  };

  const handleCreateCurrentRows = () => {
    if (!selectedSellerId) {
      message.warning("Selecciona un vendedor");
      return;
    }
    if (!rows.length) {
      message.warning("Este vendedor no tiene paquetes para crear");
      return;
    }

    const pendingRows = rows.filter((row) => !row?.is_external);
    if (!pendingRows.length) {
      message.info("Todos los paquetes de esta tabla ya fueron creados en pedidos");
      return;
    }

    const paymentMethod = generalPaymentMethod === "mixed" || generalPaymentMethod === "efectivo" ? "efectivo" : generalPaymentMethod === "qr" ? "qr" : "";

    Modal.confirm({
      title: "Crear pedidos simples",
      content: `Se crearán ${pendingRows.length} pedidos simples con método de pago: ${
        paymentMethod === "efectivo" ? "Efectivo" : paymentMethod === "qr" ? "QR" : "No pagado"
      }. ¿Continuar?`,
      okText: "Crear",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          const response = await createSimplePackageOrdersAPI({
            packageIds: pendingRows.map((row) => String(row._id)),
            paymentMethod,
          });
          if (!response?.success) {
            message.error(response.message || "No se pudieron crear los pedidos simples");
            return;
          }

          message.success(`Se crearon ${pendingRows.length} pedidos simples`);
          await Promise.all([fetchPackages(selectedSellerId), fetchSellers()]);
          onChanged?.();
        } catch (error) {
          console.error(error);
          message.error("Error creando los pedidos simples");
        }
      },
    });
  };

  return (
    <>
      <Modal
        title="Paquetes del servicio"
        open={visible}
        onCancel={() => {
          resetCreateState();
          onClose();
        }}
        footer={null}
        width={isMobile ? "96vw" : 1480}
        style={{ maxWidth: "98vw" }}
        destroyOnClose
      >
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "240px 1fr", gap: 16, minHeight: 520 }}>
          <div style={{ borderRight: isMobile ? "none" : "1px solid #f0f0f0", paddingRight: isMobile ? 0 : 12 }}>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              Vendedores
            </Typography.Title>
            <Spin spinning={loadingSellers}>
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "row" : "column",
                  gap: 12,
                  width: "100%",
                  overflowX: isMobile ? "auto" : "visible",
                  paddingBottom: isMobile ? 4 : 0,
                }}
              >
                {sellerRows.map((seller) => {
                  const isActive = String(seller._id) === String(selectedSellerId);
                  return (
                    <button
                      key={String(seller._id)}
                      type="button"
                      onClick={() => {
                        setCreating(false);
                        setSelectedSellerId(String(seller._id));
                      }}
                      style={{
                        width: isMobile ? 220 : "100%",
                        minWidth: isMobile ? 220 : undefined,
                        textAlign: "left",
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: isActive ? "1px solid #91caff" : "1px solid #e5e7eb",
                        background: isActive ? "#e6f4ff" : "#ffffff",
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{seller.vendedor || "Vendedor"}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{seller.total_paquetes || 0} paquetes</div>
                    </button>
                  );
                })}
              </div>
              {!loadingSellers && sellerRows.length === 0 && <Empty description="No hay vendedores con paquetes cargados" />}
            </Spin>
          </div>
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {creating ? "Crear paquetes del servicio" : selectedSeller?.vendedor || "Selecciona un vendedor"}
                </Typography.Title>
                <Typography.Text type="secondary">
                  {creating
                    ? "Registra los paquetes en esta misma tabla, sin abrir otro modal."
                    : "La lista siempre se muestra por vendedor. No se mezclan pedidos de todos."}
                </Typography.Text>
                <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
                  {creating ? (
                    <>
                      Sucursal de origen actual: <strong>{currentSucursalId || "Sin sucursal"}</strong>
                    </>
                  ) : (
                    <>
                      Origen registrado: <strong>{originSummary}</strong>
                    </>
                  )}
                </div>
              </div>
              <Space wrap>
                {!creating ? (
                  <Button type="primary" onClick={handleCreateCurrentRows}>
                    Crear paquetes
                  </Button>
                ) : (
                  <Button onClick={resetCreateState}>Cancelar creacion</Button>
                )}
                {isSuperadminUser(user) && (
                  <Button onClick={() => setBranchPriceModalVisible(true)}>Editar precios entre sucursales</Button>
                )}
              </Space>
            </div>

            {creating ? (
              <Spin spinning={loadingCreateSellers || loadingCreateSellerConfig || savingCreate}>
                <Space direction="vertical" size={16} style={{ display: "flex" }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1.1fr_220px_1fr_auto] gap-3 items-end">
                    <div>
                      <Typography.Text strong>Vendedor</Typography.Text>
                      <Select
                        style={{ width: "100%", marginTop: 8 }}
                        value={createSellerId || undefined}
                        onChange={(value) => setCreateSellerId(String(value || ""))}
                        options={createSellerOptions.map((seller: any) => ({
                          value: String(seller._id),
                          label: `${seller.nombre || ""} ${seller.apellido || ""}`.trim() || seller.marca || "Vendedor",
                        }))}
                        placeholder="Selecciona un vendedor"
                      />
                    </div>
                    <div>
                      <Typography.Text strong>Numero de paquetes</Typography.Text>
                      <InputNumber
                        min={MIN_PACKAGES}
                        style={{ width: "100%", marginTop: 8 }}
                        value={createPackageCount}
                        onChange={handleCreatePackageCountChange}
                      />
                    </div>
                    <div>
                      <Typography.Text strong>Sucursal destino para todos</Typography.Text>
                      <Select
                        style={{ width: "100%", marginTop: 8 }}
                        value={createDestinationId || undefined}
                        onChange={(value) => setCreateDestinationId(String(value || ""))}
                        options={createDestinationOptions}
                        placeholder="Selecciona destino"
                        disabled={!createOriginId}
                      />
                    </div>
                    <Button onClick={handleApplyCreateDestination} disabled={!createOriginId || !createDestinationId}>
                      Usar destino en todos
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-end">
                    <div>
                      <Typography.Text strong>Descripcion general</Typography.Text>
                      <Input
                        style={{ marginTop: 8 }}
                        value={createGeneralDescription}
                        onChange={(event) => setCreateGeneralDescription(event.target.value)}
                        placeholder="Ej: Ropa otoño, lote abril, accesorios pequeños"
                      />
                    </div>
                    <Button onClick={handleApplyCreateDescription}>Usar en todos</Button>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          <th style={tableCellStyle}>Nombre del comprador</th>
                          <th style={tableCellStyle}>Descripcion del paquete</th>
                          <th style={tableCellStyle}>Celular</th>
                          <th style={tableCellStyle}>Sucursal destino</th>
                          <th style={tableCellStyle}>Tamaño</th>
                          <th style={tableCellStyle}>Saldo del paquete</th>
                          <th style={tableCellStyle}>Precio del envio (sujeto a variacion segun el tamaño del paquete)</th>
                          <th style={tableCellStyle}>Precio paquete</th>
                          <th style={tableCellStyle}>Precio total del servicio por paquete (sujeto a variacion segun el tamaño del paquete)</th>
                          <th style={tableCellStyle}>Deuda vendedor</th>
                          <th style={tableCellStyle}>Deuda comprador</th>
                        </tr>
                      </thead>
                      <tbody>
                        {createRows.map((row, index) => (
                          <tr key={row.key}>
                            <td style={tableCellStyle}>
                              <Input
                                value={row.comprador}
                                placeholder="Nombre del comprador"
                                onChange={(event) => updateCreateRow(index, { comprador: event.target.value })}
                              />
                            </td>
                            <td style={tableCellStyle}>
                              <Input.TextArea
                                value={row.descripcion_paquete}
                                placeholder="Descripcion"
                                autoSize={{ minRows: 1, maxRows: 5 }}
                                onChange={(event) => updateCreateRow(index, { descripcion_paquete: event.target.value })}
                              />
                            </td>
                            <td style={tableCellStyle}>
                              <Input
                                value={row.telefono_comprador}
                                placeholder="Celular"
                                onChange={(event) =>
                                  updateCreateRow(index, {
                                    telefono_comprador: event.target.value.replace(/[^\d]/g, ""),
                                  })
                                }
                              />
                            </td>
                            <td style={tableCellStyle}>
                              <Select
                                style={{ width: "100%" }}
                                value={row.destino_sucursal_id || undefined}
                                options={createDestinationOptions}
                                placeholder="Destino"
                                disabled={!createOriginId}
                                onChange={(value) => updateCreateRow(index, { destino_sucursal_id: String(value || "") })}
                              />
                            </td>
                            <td style={tableCellStyle}>
                              <Select
                                value={row.package_size || "estandar"}
                                style={{ width: "100%" }}
                                options={[
                                  { label: "Estandar", value: "estandar" },
                                  { label: "Grande", value: "grande" },
                                ]}
                                onChange={(value) => updateCreateRow(index, { package_size: value })}
                              />
                            </td>
                            <td style={tableCellStyle}>
                              <InputNumber
                                min={0}
                                style={{ width: "100%" }}
                                addonBefore="Bs."
                                value={Number(row.saldo_por_paquete || 0)}
                                onChange={(value) =>
                                  updateCreateRow(index, { saldo_por_paquete: Math.max(0, Number(value || 0)) })
                                }
                              />
                            </td>
                            <td style={tableCellStyle}>
                              <InputNumber
                                min={0}
                                style={{ width: "100%" }}
                                addonBefore="Bs."
                                value={Number(row.precio_entre_sucursal || 0)}
                                onChange={(value) =>
                                  updateCreateRow(index, { precio_entre_sucursal: Math.max(0, Number(value || 0)) })
                                }
                              />
                            </td>
                            <td style={tableCellStyle}>
                              <Input value={`Bs. ${Number(row.precio_paquete || 0).toFixed(2)}`} readOnly />
                            </td>
                            <td style={tableCellStyle}>
                              <Input value={`Bs. ${Number(row.precio_total || 0).toFixed(2)}`} readOnly />
                            </td>
                            <td style={tableCellStyle}>
                              <Input value={`Bs. ${Number(row.amortizacion_vendedor || 0).toFixed(2)}`} readOnly />
                            </td>
                            <td style={tableCellStyle}>
                              <Input value={`Bs. ${Number(row.deuda_comprador || 0).toFixed(2)}`} readOnly />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div style={summaryCardStyle}>
                      <Typography.Text type="secondary">Suma precio paquete</Typography.Text>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>Bs. {createTotals.precio_paquete.toFixed(2)}</div>
                    </div>
                    <div style={summaryCardStyle}>
                      <Typography.Text type="secondary">Suma precio del envio</Typography.Text>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>Bs. {createTotals.precio_entre_sucursal.toFixed(2)}</div>
                    </div>
                    <div style={summaryCardStyle}>
                      <Typography.Text type="secondary">Suma saldo del paquete</Typography.Text>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>Bs. {createTotals.saldo_por_paquete.toFixed(2)}</div>
                    </div>
                    <div style={summaryCardStyle}>
                      <Typography.Text type="secondary">Suma deuda vendedor</Typography.Text>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>Bs. {createTotals.amortizacion_vendedor.toFixed(2)}</div>
                    </div>
                    <div style={summaryCardStyle}>
                      <Typography.Text type="secondary">Suma precio total servicio</Typography.Text>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>Bs. {createTotals.precio_total.toFixed(2)}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <Button onClick={resetCreateState}>Cancelar</Button>
                    <Button type="primary" loading={savingCreate} onClick={handleCreatePackages}>
                      Guardar paquetes
                    </Button>
                  </div>
                </Space>
              </Spin>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                  <div style={summaryCardStyle}>
                    <Typography.Text type="secondary">Suma precio paquete</Typography.Text>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>Bs. {totals.precio_paquete.toFixed(2)}</div>
                  </div>
                  <div style={summaryCardStyle}>
                    <Typography.Text type="secondary">Suma precio del envio</Typography.Text>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>Bs. {totals.precio_entre_sucursal.toFixed(2)}</div>
                  </div>
                  <div style={summaryCardStyle}>
                    <Typography.Text type="secondary">Suma saldo del paquete</Typography.Text>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>Bs. {totals.saldo_por_paquete.toFixed(2)}</div>
                  </div>
                  <div style={summaryCardStyle}>
                    <Typography.Text type="secondary">Suma deuda vendedor</Typography.Text>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>Bs. {totals.amortizacion_vendedor.toFixed(2)}</div>
                  </div>
                  <div style={summaryCardStyle}>
                    <Typography.Text type="secondary">Suma precio total servicio</Typography.Text>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>Bs. {totals.precio_total.toFixed(2)}</div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <Typography.Text type="secondary">Metodo general</Typography.Text>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>
                      {generalPaymentMethod === "efectivo"
                        ? "Efectivo"
                        : generalPaymentMethod === "qr"
                          ? "QR"
                          : generalPaymentMethod === "mixed"
                            ? "Mixto"
                            : "No pagado"}
                    </div>
                  </div>
                  <Space wrap>
                    <Button
                      disabled={savingGeneralPayment}
                      type={!generalPaymentMethod ? "primary" : "default"}
                      onClick={() => applyGeneralPaymentMethod("")}
                    >
                      No pagado
                    </Button>
                    <Button
                      disabled={savingGeneralPayment}
                      type={generalPaymentMethod === "efectivo" ? "primary" : "default"}
                      onClick={() => applyGeneralPaymentMethod("efectivo")}
                    >
                      Efectivo
                    </Button>
                    <Button
                      disabled={savingGeneralPayment}
                      type={generalPaymentMethod === "qr" ? "primary" : "default"}
                      onClick={() => applyGeneralPaymentMethod("qr")}
                    >
                      QR
                    </Button>
                  </Space>
                </div>

                <Spin spinning={loadingRows}>
                  {!selectedSellerId ? (
                    <Empty description="Selecciona un vendedor para ver sus paquetes" />
                  ) : rows.length === 0 ? (
                    <Empty description="Este vendedor no tiene paquetes cargados en tu sucursal" />
                  ) : (
                    <>
                    <div className="hidden md:block" style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc" }}>
                            <th style={tableCellStyle}>Nombre del comprador</th>
                            <th style={tableCellStyle}>Descripcion del paquete</th>
                            <th style={tableCellStyle}>Celular</th>
                            <th style={tableCellStyle}>Sucursal destino</th>
                            <th style={tableCellStyle}>Tamaño</th>
                            <th style={tableCellStyle}>Precio del envio (sujeto a variacion segun el tamaño del paquete)</th>
                            <th style={tableCellStyle}>Precio paquete</th>
                            <th style={tableCellStyle}>Precio total del servicio por paquete (sujeto a variacion segun el tamaño del paquete)</th>
                            <th style={tableCellStyle}>Saldo del paquete</th>
                            <th style={tableCellStyle}>Deuda vendedor</th>
                            <th style={tableCellStyle}>Deuda comprador</th>
                            <th style={tableCellStyle}>Borrar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => {
                            const rowId = String(row._id);
                            const isSaving = savingRowIds.includes(rowId);
                            const originId = getBranchId(row?.origen_sucursal || row?.sucursal);
                            const currentOriginName = String(
                              row?.origen_sucursal?.nombre || row?.sucursal?.nombre || "Sucursal origen"
                            );
                            const destinationOptions = getDestinationOptions(
                              originId,
                              allowedSelectedSellerBranchIds,
                              currentOriginName
                            );

                            return (
                              <tr key={rowId}>
                                <td style={tableCellStyle}>
                                  <Input value={row.comprador || ""} readOnly style={readonlyBuyerStyle} />
                                </td>
                                <td style={tableCellStyle}>
                                  <Input.TextArea
                                    value={row.descripcion_paquete || ""}
                                    readOnly
                                    autoSize={{ minRows: 1, maxRows: 4 }}
                                    style={readonlyBuyerStyle}
                                  />
                                </td>
                                <td style={tableCellStyle}>
                                  <Input value={row.telefono_comprador || ""} readOnly style={readonlyBuyerStyle} />
                                </td>
                                <td style={tableCellStyle}>
                                  <Select
                                    value={getBranchId(row?.destino_sucursal) || undefined}
                                    style={{ width: "100%" }}
                                    disabled={isSaving}
                                    options={destinationOptions}
                                    onChange={(value) => commitRowPatch(rowId, { destino_sucursal: value })}
                                  />
                                </td>
                                <td style={tableCellStyle}>
                                  <Select
                                    value={row.package_size || "estandar"}
                                    style={{ width: "100%" }}
                                    disabled={isSaving}
                                    options={[
                                      { label: "Estandar", value: "estandar" },
                                      { label: "Grande", value: "grande" },
                                    ]}
                                    onChange={(value) => commitRowPatch(rowId, { package_size: value })}
                                  />
                                </td>
                                <td style={tableCellStyle}>
                                  <InputNumber
                                    min={0}
                                    style={{ width: "100%" }}
                                    addonBefore="Bs."
                                    disabled={isSaving}
                                    value={Number(row.precio_entre_sucursal || 0)}
                                    onChange={(value) =>
                                      setRows((current) =>
                                        current.map((currentRow) =>
                                          String(currentRow._id) === rowId
                                            ? applyPackagePatch(
                                                currentRow,
                                                { precio_entre_sucursal: Math.max(0, Number(value || 0)) },
                                                sellerConfig
                                              )
                                            : currentRow
                                        )
                                      )
                                    }
                                    onBlur={() => {
                                      const currentRow = rows.find((item) => String(item._id) === rowId);
                                      void commitRowPatch(rowId, {
                                        precio_entre_sucursal: Math.max(0, Number(currentRow?.precio_entre_sucursal || 0)),
                                      });
                                    }}
                                  />
                                </td>
                                <td style={tableCellStyle}>
                                  <Input value={`Bs. ${Number(row.precio_paquete || 0).toFixed(2)}`} readOnly />
                                </td>
                                <td style={tableCellStyle}>
                                  <Input value={`Bs. ${Number(row.precio_total || 0).toFixed(2)}`} readOnly />
                                </td>
                                <td style={tableCellStyle}>
                                  <Input value={`Bs. ${Number(row.saldo_por_paquete || 0).toFixed(2)}`} readOnly />
                                </td>
                                <td style={tableCellStyle}>
                                  <Input value={`Bs. ${Number(row.amortizacion_vendedor || 0).toFixed(2)}`} readOnly />
                                </td>
                                <td style={tableCellStyle}>
                                  <Input value={`Bs. ${Number(row.deuda_comprador || 0).toFixed(2)}`} readOnly />
                                </td>
                                <td style={tableCellStyle}>
                                  <Button danger block disabled={isSaving} onClick={() => handleDelete(rowId)}>
                                    Borrar
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="md:hidden space-y-3">
                      {rows.map((row) => {
                        const rowId = String(row._id);
                        const isSaving = savingRowIds.includes(rowId);
                        const originId = getBranchId(row?.origen_sucursal || row?.sucursal);
                        const currentOriginName = String(
                          row?.origen_sucursal?.nombre || row?.sucursal?.nombre || "Sucursal origen"
                        );
                        const destinationOptions = getDestinationOptions(
                          originId,
                          allowedSelectedSellerBranchIds,
                          currentOriginName
                        );

                        return (
                          <div key={rowId} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <Typography.Text strong>{row.comprador || "Sin comprador"}</Typography.Text>
                              <Typography.Text type="secondary">
                                Total: Bs. {Number(row.precio_total || 0).toFixed(2)}
                              </Typography.Text>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <Typography.Text strong>Descripcion del paquete</Typography.Text>
                                <Input.TextArea className="mt-1" value={row.descripcion_paquete || ""} readOnly autoSize={{ minRows: 2, maxRows: 4 }} style={readonlyBuyerStyle} />
                              </div>
                              <div>
                                <Typography.Text strong>Celular</Typography.Text>
                                <Input className="mt-1" value={row.telefono_comprador || ""} readOnly style={readonlyBuyerStyle} />
                              </div>
                              <div>
                                <Typography.Text strong>Sucursal destino</Typography.Text>
                                <Select
                                  className="mt-1"
                                  value={getBranchId(row?.destino_sucursal) || undefined}
                                  style={{ width: "100%" }}
                                  disabled={isSaving}
                                  options={destinationOptions}
                                  onChange={(value) => commitRowPatch(rowId, { destino_sucursal: value })}
                                />
                              </div>
                              <div>
                                <Typography.Text strong>Tamaño</Typography.Text>
                                <Select
                                  className="mt-1"
                                  value={row.package_size || "estandar"}
                                  style={{ width: "100%" }}
                                  disabled={isSaving}
                                  options={[
                                    { label: "Estandar", value: "estandar" },
                                    { label: "Grande", value: "grande" },
                                  ]}
                                  onChange={(value) => commitRowPatch(rowId, { package_size: value })}
                                />
                              </div>
                              <div className="grid grid-cols-1 gap-3">
                                <div>
                                  <Typography.Text strong>Precio del envio</Typography.Text>
                                  <InputNumber
                                    className="mt-1"
                                    min={0}
                                    style={{ width: "100%" }}
                                    addonBefore="Bs."
                                    disabled={isSaving}
                                    value={Number(row.precio_entre_sucursal || 0)}
                                    onChange={(value) =>
                                      setRows((current) =>
                                        current.map((currentRow) =>
                                          String(currentRow._id) === rowId
                                            ? applyPackagePatch(
                                                currentRow,
                                                { precio_entre_sucursal: Math.max(0, Number(value || 0)) },
                                                sellerConfig
                                              )
                                            : currentRow
                                        )
                                      )
                                    }
                                    onBlur={() => {
                                      const currentRow = rows.find((item) => String(item._id) === rowId);
                                      void commitRowPatch(rowId, {
                                        precio_entre_sucursal: Math.max(0, Number(currentRow?.precio_entre_sucursal || 0)),
                                      });
                                    }}
                                  />
                                </div>
                                <div>
                                  <Typography.Text strong>Precio paquete</Typography.Text>
                                  <Input className="mt-1" value={`Bs. ${Number(row.precio_paquete || 0).toFixed(2)}`} readOnly />
                                </div>
                                <div>
                                  <Typography.Text strong>Saldo del paquete</Typography.Text>
                                  <Input className="mt-1" value={`Bs. ${Number(row.saldo_por_paquete || 0).toFixed(2)}`} readOnly />
                                </div>
                                <div>
                                  <Typography.Text strong>Deuda vendedor</Typography.Text>
                                  <Input className="mt-1" value={`Bs. ${Number(row.amortizacion_vendedor || 0).toFixed(2)}`} readOnly />
                                </div>
                                <div>
                                  <Typography.Text strong>Deuda comprador</Typography.Text>
                                  <Input className="mt-1" value={`Bs. ${Number(row.deuda_comprador || 0).toFixed(2)}`} readOnly />
                                </div>
                              </div>
                              <Button danger block disabled={isSaving} onClick={() => handleDelete(rowId)}>
                                Borrar
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </>
                  )}
                </Spin>
              </>
            )}
          </div>
        </div>
      </Modal>
      <SimplePackageBranchPriceModal
        visible={branchPriceModalVisible}
        onClose={() => {
          setBranchPriceModalVisible(false);
          void fetchBranchPrices();
          if (selectedSellerId && !creating) void fetchPackages(selectedSellerId);
        }}
      />
    </>
  );
};

export default SimplePackageManagerModal;
