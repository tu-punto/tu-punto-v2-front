import { Button, Empty, Input, InputNumber, Modal, Select, Space, Spin, Typography, message } from "antd";
import { DeleteOutlined, PrinterOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { useContext, useEffect, useMemo, useState } from "react";
import {
  createSimplePackageOrdersAPI,
  deleteSimplePackageAPI,
  getPackageEscalationConfigAPI,
  getSimplePackageBranchPricesAPI,
  getSimplePackageEscalationStatusAPI,
  getSimplePackagesListAPI,
  getUploadedSimplePackageSellersAPI,
  printSimplePackageGuidesAPI,
  registerSimplePackagesAPI,
  sendSimplePackageGuideWhatsappAPI,
  updateSimplePackageAPI,
  PackageDeliverySpace,
  PackageEscalationRange,
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
import { isSuperadminUser } from "../../utils/role";
import {
  buildDirectShippingLabelImageData,
  DEFAULT_SHIPPING_LABEL_PRINT_OPTIONS,
  ShippingLabelPrintOptions,
  toBase64Png,
} from "./shippingQrLabel";
import { createPixelConfig, findQzPrinters, qzPrint } from "../../utils/qzTray";

interface SimplePackageManagerModalProps {
  visible: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

const MIN_PACKAGES = 1;
const DEFAULT_SIMPLE_RANGES: PackageEscalationRange[] = [
  { from: 1, to: 30, small_price: 4, large_price: 8 },
  { from: 31, to: 60, small_price: 3, large_price: 6 },
  { from: 61, to: null, small_price: 2.5, large_price: 5 },
];
const DEFAULT_DELIVERY_RANGES: PackageEscalationRange[] = [
  { from: 1, to: 5, small_price: 5, large_price: 5 },
  { from: 6, to: 15, small_price: 4, large_price: 4 },
  { from: 16, to: null, small_price: 3, large_price: 3 },
];
const DEFAULT_DELIVERY_SPACES: PackageDeliverySpace[] = [
  { size: "estandar", spaces: 1 },
  { size: "grande", spaces: 2 },
];
const getSimpleEscalatedPriceFromRanges = (
  ranges: PackageEscalationRange[],
  position: number,
  packageSize = "estandar"
) => {
  const safePosition = Math.max(1, Number(position || 1));
  const range =
    ranges.find((row) => safePosition >= row.from && (row.to === null || row.to === undefined || safePosition <= row.to)) ||
    ranges[ranges.length - 1] ||
    DEFAULT_SIMPLE_RANGES[0];
  return Number(packageSize === "grande" ? range.large_price || 0 : range.small_price || 0);
};
const waitMs = (delayMs: number) => new Promise((resolve) => window.setTimeout(resolve, delayMs));

const ticketWidthOptions = [
  { value: 40, label: "40 mm (papel pequeno)" },
  { value: 58, label: "58 mm" },
  { value: 80, label: "80 mm" },
];

const qrSizeOptions = [
  { value: 14, label: "14 mm" },
  { value: 16, label: "16 mm" },
  { value: 18, label: "18 mm" },
  { value: 20, label: "20 mm" },
  { value: 22, label: "22 mm" },
];

const printDelayOptions = [
  { value: 0, label: "Sin pausa" },
  { value: 250, label: "250 ms" },
  { value: 500, label: "500 ms" },
  { value: 800, label: "800 ms" },
];

const getStoredLabelPrintOptions = (): ShippingLabelPrintOptions => ({
  ticketWidthMm: Number(localStorage.getItem("shippingLabelTicketWidthMm")) || DEFAULT_SHIPPING_LABEL_PRINT_OPTIONS.ticketWidthMm,
  qrSizeMm: Number(localStorage.getItem("shippingLabelQrSizeMm")) || DEFAULT_SHIPPING_LABEL_PRINT_OPTIONS.qrSizeMm,
  printDelayMs: Number(localStorage.getItem("shippingLabelPrintDelayMs")) || DEFAULT_SHIPPING_LABEL_PRINT_OPTIONS.printDelayMs,
});

const persistLabelPrintOptions = (options: ShippingLabelPrintOptions) => {
  localStorage.setItem("shippingLabelTicketWidthMm", String(options.ticketWidthMm));
  localStorage.setItem("shippingLabelQrSizeMm", String(options.qrSizeMm));
  localStorage.setItem("shippingLabelPrintDelayMs", String(options.printDelayMs));
};

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
const isQrPrintedRow = (row: any) => Boolean(row?.qr_impreso || row?.numero_guia);
const getBranchName = (value: any, fallback = "") => String(value?.nombre || fallback || "").trim();
const formatSellerDisplayName = (seller: any) => {
  const fullName = `${seller?.nombre || ""} ${seller?.apellido || ""}`.trim();
  const brand = String(seller?.marca || "").trim();
  if (brand && fullName) return `${brand} - ${fullName}`;
  return fullName || brand || seller?.vendedor || "Vendedor";
};

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
  const [escalationConfigs, setEscalationConfigs] = useState<any[]>([]);
  const [printingQr, setPrintingQr] = useState(false);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const [labelPrintOptions, setLabelPrintOptions] = useState<ShippingLabelPrintOptions>(getStoredLabelPrintOptions);

  const [creating, setCreating] = useState(false);
  const [loadingCreateSellers, setLoadingCreateSellers] = useState(false);
  const [createSellerOptions, setCreateSellerOptions] = useState<any[]>([]);
  const [createSellerId, setCreateSellerId] = useState("");
  const [loadingCreateSellerConfig, setLoadingCreateSellerConfig] = useState(false);
  const [createSellerConfig, setCreateSellerConfig] = useState({
    precio_paquete: 0,
    precio_paquete_grande: 0,
    amortizacion: 0,
    saldo_por_paquete: 0,
  });
  const [createEscalationRanges, setCreateEscalationRanges] = useState<PackageEscalationRange[]>(DEFAULT_SIMPLE_RANGES);
  const [createMonthlyCount, setCreateMonthlyCount] = useState(0);
  const [missingForNextRange, setMissingForNextRange] = useState(0);
  const [createSellerBranches, setCreateSellerBranches] = useState<any[]>([]);
  const [createPackageCount, setCreatePackageCount] = useState(MIN_PACKAGES);
  const [createGeneralDescription, setCreateGeneralDescription] = useState("");
  const [createOriginId, setCreateOriginId] = useState(currentSucursalId);
  const [createDestinationId, setCreateDestinationId] = useState(currentSucursalId);
  const [createRows, setCreateRows] = useState<SimplePackageDraftRow[]>([
    createDraftRow(0, { precio_paquete: 0, precio_paquete_grande: 0, amortizacion: 0, saldo_por_paquete: 0 }),
  ]);
  const [savingCreate, setSavingCreate] = useState(false);

  const totals = useMemo(() => calculateSimplePackageTotals(rows), [rows]);
  const createTotals = useMemo(() => calculateSimplePackageTotals(createRows), [createRows]);
  const selectedSeller = sellerRows.find((seller) => String(seller._id) === String(selectedSellerId));
  const canSendGuideWhatsapp = isSuperadminUser(user);

  const getSimpleEscalatedPrice = (position: number, packageSize = "estandar") => {
    const safePosition = Math.max(1, Number(position || 1));
    const range =
      createEscalationRanges.find(
        (row) => safePosition >= row.from && (row.to === null || row.to === undefined || safePosition <= row.to)
      ) ||
      createEscalationRanges[createEscalationRanges.length - 1] ||
      DEFAULT_SIMPLE_RANGES[0];
    return Number(packageSize === "grande" ? range.large_price || 0 : range.small_price || 0);
  };

  const getCreateRowConfig = (index: number, row?: Partial<SimplePackageDraftRow>) => ({
    ...createSellerConfig,
    precio_paquete: getSimpleEscalatedPrice(createMonthlyCount + index + 1, "estandar"),
    precio_paquete_grande: getSimpleEscalatedPrice(createMonthlyCount + index + 1, "grande"),
    amortizacion: Math.min(
      Number(createSellerConfig.amortizacion || 0),
      getSimpleEscalatedPrice(createMonthlyCount + index + 1, row?.package_size || "estandar")
    ),
  });

  const rebuildCreateRows = (
    count: number,
    currentRows: SimplePackageDraftRow[] = createRows,
    patch?: (row: SimplePackageDraftRow, index: number) => Partial<SimplePackageDraftRow>
  ) =>
    Array.from({ length: count }, (_, index) => {
      const row = currentRows[index] || createDraftRow(index, getCreateRowConfig(index));
      const nextRow = {
        ...row,
        ...(patch ? patch(row, index) : {}),
      };
      return createDraftRow(index, getCreateRowConfig(index, nextRow), nextRow);
    });

  const generalPaymentMethod = useMemo(() => {
    if (!rows.length) return "";
    const editableRows = rows.filter((row) => !isQrPrintedRow(row));
    const targetRows = editableRows.length ? editableRows : rows;
    const rowsWithMethod = targetRows.filter((row) => String(row.metodo_pago || ""));
    if (!rowsWithMethod.length) return "efectivo";
    const firstMethod = String(rowsWithMethod[0]?.metodo_pago || "");
    if (!firstMethod) return "";
    return rowsWithMethod.every((row) => String(row.metodo_pago || "") === firstMethod) ? firstMethod : "mixed";
  }, [rows]);

  const pendingRows = useMemo(() => rows.filter((row) => !row?.is_external), [rows]);
  const rowsMissingPrintedQr = useMemo(
    () => pendingRows.filter((row) => !row?.qr_impreso || !row?.numero_guia),
    [pendingRows]
  );
  const unlockedRows = useMemo(() => rows.filter((row) => !isQrPrintedRow(row)), [rows]);

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
    const map = new Map<string, { value: string; label: string; precio: number; routeId: string }[]>();
    branchPrices.forEach((row: any) => {
      const originId = getBranchId(row?.origen_sucursal);
      const destinationId = getBranchId(row?.destino_sucursal);
      if (!originId || !destinationId) return;
      const current = map.get(originId) || [];
      current.push({
        value: destinationId,
        label: String(row?.destino_sucursal?.nombre || "Sucursal"),
        precio: Number(row?.precio || 0),
        routeId: String(row?._id || ""),
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
  const getRouteId = (originId: string, destinationId?: string) =>
    String(
      (routeOptionsByOrigin.get(String(originId)) || []).find(
        (item) => String(item.value) === String(destinationId || "")
      )?.routeId || ""
    );

  const getSmallSpaceLimit = (routeId = "") => {
    const globalConfig = escalationConfigs.find(
      (row: any) => !String(row?.route?._id || row?.route || "") && row?.service_origin === "delivery"
    );
    const config = escalationConfigs.find(
      (row: any) => String(row?.route?._id || row?.route || "") === String(routeId) && row?.service_origin === "delivery"
    );
    const spacesRows =
      Array.isArray(globalConfig?.delivery_spaces) && globalConfig.delivery_spaces.length
        ? globalConfig.delivery_spaces
        : Array.isArray(config?.delivery_spaces) && config.delivery_spaces.length
        ? config.delivery_spaces
        : DEFAULT_DELIVERY_SPACES;
    return Math.max(
      1,
      Number(
        spacesRows.find((row: PackageDeliverySpace) => String(row.size).toLowerCase() === "small_limit")?.spaces ??
          spacesRows.find((row: PackageDeliverySpace) => String(row.size).toLowerCase() === "estandar")?.spaces ??
          1
      )
    );
  };

  const getPackageSizeBySpaces = (spaces = 1, routeId = "") =>
    Math.max(1, Number(spaces || 1)) > getSmallSpaceLimit(routeId) ? "grande" : "estandar";

  const getEffectiveDeliverySpaces = (_originId: string, _destinationId?: string, spaces = 1) =>
    Math.max(1, Number(spaces || 1));

  const getDeliveryRoutePrice = (originId: string, destinationId?: string, spaces = 1, position = 1) => {
    if (String(originId || "") === String(destinationId || "")) return 0;
    const routeId = getRouteId(originId, destinationId);
    const config = escalationConfigs.find(
      (row: any) => String(row?.route?._id || row?.route || "") === String(routeId) && row?.service_origin === "delivery"
    );
    if (!config) return Number(getRoutePrice(originId, destinationId) || 0) * Math.max(1, Number(spaces || 1));
    const ranges = Array.isArray(config?.ranges) && config.ranges.length ? config.ranges : DEFAULT_DELIVERY_RANGES;
    const safePosition = Math.max(1, Number(position || 1));
    const range =
      ranges.find((row: PackageEscalationRange) => safePosition >= row.from && (row.to === null || row.to === undefined || safePosition <= row.to)) ||
      ranges[ranges.length - 1] ||
      DEFAULT_DELIVERY_RANGES[0];
    return Number(range.small_price || 0) * Math.max(1, Number(spaces || 1));
  };

  const buildDeliveryDerivedPatch = (
    row: any,
    patch: Record<string, unknown>,
    originId: string,
    destinationId: string,
    position = 1
  ) => {
    const spaces = getEffectiveDeliverySpaces(
      originId,
      destinationId,
      Number(patch.delivery_spaces !== undefined ? patch.delivery_spaces || 1 : row.delivery_spaces || 1)
    );
    const routeId = getRouteId(originId, destinationId);
    const packageSize = getPackageSizeBySpaces(spaces, routeId);
    const routePrice =
      patch.precio_entre_sucursal !== undefined
        ? Math.max(0, Number(patch.precio_entre_sucursal || 0))
        : getDeliveryRoutePrice(originId, destinationId, spaces, position);

    return {
      ...patch,
      package_size: packageSize,
      delivery_spaces: spaces,
      precio_entre_sucursal: routePrice,
    };
  };

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
    setCreateMonthlyCount(0);
    setMissingForNextRange(0);
    setCreateRows([createDraftRow(0, { precio_paquete: 0, precio_paquete_grande: 0, amortizacion: 0, saldo_por_paquete: 0 })]);
  };

  const fetchBranchPrices = async () => {
    const [pricesResponse, escalationResponse] = await Promise.all([
      getSimplePackageBranchPricesAPI(),
      getPackageEscalationConfigAPI(),
    ]);
    setBranchPrices(Array.isArray(pricesResponse?.rows) ? pricesResponse.rows : []);
    setEscalationConfigs(Array.isArray(escalationResponse?.data) ? escalationResponse.data : []);
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
      setCreateSellerConfig({ precio_paquete: 0, precio_paquete_grande: 0, amortizacion: 0, saldo_por_paquete: 0 });
      return;
    }

    setLoadingCreateSellerConfig(true);
    try {
      const [sellerResponse, escalationResponse, statusResponse] = await Promise.all([
        getSellerAPI(sellerId),
        getPackageEscalationConfigAPI({ routeId: getRouteId(currentSucursalId || createOriginId, createDestinationId) }),
        getSimplePackageEscalationStatusAPI({
          routeId: getRouteId(currentSucursalId || createOriginId, createDestinationId),
          sellerId,
        }),
      ]);
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

      const nextRanges =
        Array.isArray(statusResponse?.data?.ranges) && statusResponse.data.ranges.length
          ? statusResponse.data.ranges
          : Array.isArray(escalationResponse?.data?.simple_package) && escalationResponse.data.simple_package.length
            ? escalationResponse.data.simple_package
            : DEFAULT_SIMPLE_RANGES;
      const nextMonthlyCount = Number(statusResponse?.data?.monthCount || 0);
      setCreateEscalationRanges(nextRanges);
      setCreateMonthlyCount(nextMonthlyCount);
      setMissingForNextRange(Number(statusResponse?.data?.missingForNextRange || 0));
      setCreateSellerBranches(nextBranches);
      setCreateSellerConfig({
        precio_paquete: Number(nextRanges[0]?.small_price || 0),
        precio_paquete_grande: Number(nextRanges[0]?.large_price || 0),
        amortizacion: Number(sellerResponse?.amortizacion || 0),
        saldo_por_paquete: 0,
      });
      setCreateOriginId(nextOriginId);
      setCreateDestinationId(nextOriginId);
      setCreateRows((prev) =>
        Array.from({ length: createPackageCount }, (_, index) => {
          const previousRow = prev[index];
          const position = nextMonthlyCount + index + 1;
          const smallPrice = getSimpleEscalatedPriceFromRanges(nextRanges, position, "estandar");
          const largePrice = getSimpleEscalatedPriceFromRanges(nextRanges, position, "grande");
          const nextConfig = {
            precio_paquete: smallPrice,
            precio_paquete_grande: largePrice,
            amortizacion: Math.min(Number(sellerResponse?.amortizacion || 0), smallPrice),
            saldo_por_paquete: 0,
          };
          return createDraftRow(index, nextConfig, previousRow);
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

        const routeId = getRouteId(createOriginId, nextDestinationId);
        const spaces = getEffectiveDeliverySpaces(createOriginId, nextDestinationId, row.delivery_spaces);
        const packageSize = getPackageSizeBySpaces(spaces, routeId);
        return createDraftRow(index, getCreateRowConfig(index, { ...row, package_size: packageSize }), {
          ...row,
          destino_sucursal_id: nextDestinationId,
          package_size: packageSize,
          delivery_spaces: spaces,
          precio_entre_sucursal: getDeliveryRoutePrice(createOriginId, nextDestinationId, spaces, createMonthlyCount + index + 1),
        });
      })
    );
  }, [createDestinationOptions, createOriginId, createSellerConfig, creating, routeOptionsByOrigin]);

  const commitRowPatch = async (rowId: string, patch: Record<string, unknown>) => {
    const targetRow = rows.find((row) => String(row._id) === String(rowId));
    if (isQrPrintedRow(targetRow)) {
      message.warning("Este paquete ya tiene etiqueta impresa y no puede modificarse");
      return;
    }

    const previousRows = rows;
    const optimisticRows = rows.map((row) => {
      if (String(row._id) !== String(rowId)) return row;
      const originId = getBranchId(row?.origen_sucursal || row?.sucursal);
      const nextDestinationId = String(
        patch.destino_sucursal ?? patch.destino_sucursal_id ?? getBranchId(row?.destino_sucursal)
      );
      const derivedPatch = buildDeliveryDerivedPatch(
        row,
        patch,
        originId,
        nextDestinationId,
        Number(row.numero_paquete || 1)
      );

      return applyPackagePatch(row, derivedPatch, sellerConfig);
    });
    setRows(optimisticRows);
    setSavingRowIds((prev) => [...prev, rowId]);

    try {
      const targetOriginId = getBranchId(targetRow?.origen_sucursal || targetRow?.sucursal);
      const targetDestinationId = String(
        patch.destino_sucursal ?? patch.destino_sucursal_id ?? getBranchId(targetRow?.destino_sucursal)
      );
      const response = await updateSimplePackageAPI(
        rowId,
        buildDeliveryDerivedPatch(targetRow, patch, targetOriginId, targetDestinationId, Number(targetRow?.numero_paquete || 1))
      );
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
    const targetRow = rows.find((row) => String(row._id) === String(rowId));
    if (isQrPrintedRow(targetRow)) {
      message.warning("Este paquete ya tiene etiqueta impresa y no puede borrarse");
      return;
    }
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
    const targetRows = rows.filter((row) => !isQrPrintedRow(row));
    if (!targetRows.length) {
      message.info("No hay paquetes editables para actualizar");
      return;
    }

    const previousRows = rows;
    const optimisticRows = rows.map((row) =>
      isQrPrintedRow(row)
        ? row
        : applyPackagePatch(
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
        targetRows.map((row) =>
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

      const responseById = new Map(
        targetRows.map((row, index) => [String(row._id), responses[index]?.data || row])
      );
      setRows(optimisticRows.map((row) => responseById.get(String(row._id)) || row));
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
        const routeId = getRouteId(createOriginId, nextDestinationId);
        const nextSpaces = getEffectiveDeliverySpaces(
          createOriginId,
          nextDestinationId,
          Number(patch.delivery_spaces !== undefined ? patch.delivery_spaces || 1 : row.delivery_spaces || 1)
        );
        const nextSize = getPackageSizeBySpaces(nextSpaces, routeId);
        const nextRoutePrice =
          patch.precio_entre_sucursal !== undefined
            ? Math.max(0, Number(patch.precio_entre_sucursal || 0))
            : getDeliveryRoutePrice(createOriginId, nextDestinationId, nextSpaces, createMonthlyCount + index + 1);

        return createDraftRow(index, getCreateRowConfig(index, { ...row, ...patch, package_size: nextSize }), {
          ...row,
          ...patch,
          destino_sucursal_id: nextDestinationId,
          package_size: nextSize,
          delivery_spaces: nextSpaces,
          precio_entre_sucursal: nextRoutePrice,
        });
      })
    );
  };

  const handleCreatePackageCountChange = (value: number | null) => {
    const nextCount = Math.max(MIN_PACKAGES, Number(value || MIN_PACKAGES));
    setCreatePackageCount(nextCount);
    setCreateRows((prev) => rebuildCreateRows(nextCount, prev));
  };

  const handleApplyCreateDescription = () => {
    const description = String(createGeneralDescription || "").trim();
    if (!description) {
      message.warning("Escribe una descripcion general antes de aplicarla");
      return;
    }

    setCreateRows((prev) =>
      prev.map((row, index) =>
        createDraftRow(index, getCreateRowConfig(index, row), {
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
      prev.map((row, index) => {
        const routeId = getRouteId(createOriginId, createDestinationId);
        const spaces = getEffectiveDeliverySpaces(createOriginId, createDestinationId, row.delivery_spaces);
        const packageSize = getPackageSizeBySpaces(spaces, routeId);
        return createDraftRow(index, getCreateRowConfig(index, { ...row, package_size: packageSize }), {
          ...row,
          destino_sucursal_id: createDestinationId,
          package_size: packageSize,
          delivery_spaces: spaces,
          precio_entre_sucursal: getDeliveryRoutePrice(createOriginId, createDestinationId, spaces, createMonthlyCount + index + 1),
        });
      })
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

    const payloadRows = createRows.map((row) => {
      const destinationId = String(row.destino_sucursal_id || "").trim();
      const spaces = getEffectiveDeliverySpaces(createOriginId, destinationId, row.delivery_spaces);
      return {
        comprador: String(row.comprador || "").trim(),
        telefono_comprador: String(row.telefono_comprador || "").trim(),
        descripcion_paquete: String(row.descripcion_paquete || "").trim(),
        destino_sucursal_id: destinationId,
        package_size: getPackageSizeBySpaces(spaces, getRouteId(createOriginId, destinationId)),
        delivery_spaces: spaces,
        saldo_por_paquete: Number(row.saldo_por_paquete || 0),
        precio_entre_sucursal: Number(row.precio_entre_sucursal || 0),
      };
    });

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

  const resolveDirectPrintPrinter = async () => {
    const printers = await findQzPrinters();
    if (!printers.length) return "";

    const storedPrinter = localStorage.getItem("qzPrinterName") || "";
    if (storedPrinter && printers.includes(storedPrinter)) return storedPrinter;

    const selectedPrinter = printers.find((name) => /epson|tm-l90|m313a/i.test(name)) || printers[0];
    localStorage.setItem("qzPrinterName", selectedPrinter);
    return selectedPrinter;
  };

  const buildPrintOptionsContent = (draftOptions: ShippingLabelPrintOptions) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 12 }}>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Ancho ticket</div>
        <Select
          defaultValue={draftOptions.ticketWidthMm}
          style={{ width: "100%" }}
          options={ticketWidthOptions}
          onChange={(value) => {
            draftOptions.ticketWidthMm = value;
          }}
        />
      </div>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Tamano QR</div>
        <Select
          defaultValue={draftOptions.qrSizeMm}
          style={{ width: "100%" }}
          options={qrSizeOptions}
          onChange={(value) => {
            draftOptions.qrSizeMm = value;
          }}
        />
      </div>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Pausa</div>
        <Select
          defaultValue={draftOptions.printDelayMs}
          style={{ width: "100%" }}
          options={printDelayOptions}
          onChange={(value) => {
            draftOptions.printDelayMs = value;
          }}
        />
      </div>
    </div>
  );

  const printSimplePackageRows = async (rowsToPrint: any[], options = labelPrintOptions) => {
    const printerName = await resolveDirectPrintPrinter();
    if (!printerName) {
      message.warning("No se encontraron impresoras en QZ Tray");
      return false;
    }

    for (const [index, row] of rowsToPrint.entries()) {
      const labelImage = await buildDirectShippingLabelImageData({
        guideNumber: String(row?.numero_guia || ""),
        clientName: row?.comprador,
        clientPhone: row?.telefono_comprador,
        clientCi: row?.carnet_comprador,
        origin: getBranchName(row?.origen_sucursal || row?.sucursal, "Sin origen"),
        destination: getBranchName(row?.destino_sucursal, row?.lugar_entrega || "Sin destino"),
        ticketWidthMm: options.ticketWidthMm,
        qrSizeMm: options.qrSizeMm,
      });

      const pixelConfig = await createPixelConfig(printerName, {
        widthMm: labelImage.widthMm,
        heightMm: labelImage.heightMm,
      });

      await qzPrint(pixelConfig, [
        {
          type: "pixel",
          format: "image",
          flavor: "base64",
          data: toBase64Png(labelImage.dataUrl),
          options: { interpolation: "nearest-neighbor" },
        },
      ]);

      if (options.printDelayMs > 0 && index < rowsToPrint.length - 1) {
        await waitMs(options.printDelayMs);
      }
    }

    return true;
  };

  const handlePrintPendingQrs = async () => {
    if (!selectedSellerId) {
      message.warning("Selecciona un vendedor");
      return;
    }
    if (!pendingRows.length) {
      message.warning("Este vendedor no tiene paquetes pendientes");
      return;
    }
    if (!rowsMissingPrintedQr.length) {
      message.info("Todos los paquetes pendientes ya tienen etiqueta impresa");
      return;
    }

    setPrintingQr(true);
    try {
      const response = await printSimplePackageGuidesAPI({
        packageIds: rowsMissingPrintedQr.map((row) => String(row._id)),
      });

      if (!response?.success) {
        message.error(response.message || "No se pudieron preparar las etiquetas");
        return;
      }

      const printedRows = Array.isArray(response.rows) ? response.rows : [];
      if (!printedRows.length) {
        message.info("No hay etiquetas nuevas para imprimir");
        await fetchPackages(selectedSellerId);
        return;
      }

      const printed = await printSimplePackageRows(printedRows);
      if (!printed) return;

      const printedById = new Map(printedRows.map((row: any) => [String(row._id), row]));
      setRows((current) => current.map((row) => printedById.get(String(row._id)) || row));
      message.success(`Se imprimieron ${printedRows.length} etiqueta(s)`);
      await fetchPackages(selectedSellerId);
    } catch (error) {
      console.error(error);
      message.error("No se pudieron imprimir las etiquetas. Revisa QZ Tray o la impresora.");
    } finally {
      setPrintingQr(false);
    }
  };

  const handleSendGuideWhatsapp = async () => {
    if (!canSendGuideWhatsapp) {
      message.warning("Solo superadmins pueden enviar guias por WhatsApp");
      return;
    }
    if (!selectedSellerId) {
      message.warning("Selecciona un vendedor");
      return;
    }
    const rowsWithGuide = pendingRows.filter((row) => row?.numero_guia);
    if (!rowsWithGuide.length) {
      message.warning("Primero imprime las etiquetas para generar los numeros de guia");
      return;
    }

    setSendingWhatsapp(true);
    try {
      const response = await sendSimplePackageGuideWhatsappAPI({
        packageIds: rowsWithGuide.map((row) => String(row._id)),
      });

      if (!response?.success) {
        message.error(response.message || "No se pudieron enviar los WhatsApp");
        return;
      }

      const sentCount = Number(response.sentCount || 0);
      const failedCount = Number(response.failedCount || 0);
      const skippedCount = Number(response.skippedCount || 0);
      if (failedCount || skippedCount) {
        message.warning(`WhatsApp enviados: ${sentCount}. Fallidos/omitidos: ${failedCount + skippedCount}`);
        return;
      }
      message.success(`WhatsApp enviados: ${sentCount}`);
    } catch (error) {
      console.error(error);
      message.error("No se pudieron enviar los WhatsApp");
    } finally {
      setSendingWhatsapp(false);
    }
  };

  const prepareRowsForCreateAndPrint = async (
    targetRows: any[],
    options = labelPrintOptions
  ) => {
    const missingQrRows = targetRows.filter(
      (row) => !row?.qr_impreso || !row?.numero_guia
    );

    let rowsReady = targetRows;
    if (missingQrRows.length) {
      const response = await printSimplePackageGuidesAPI({
        packageIds: missingQrRows.map((row) => String(row._id)),
      });

      if (!response?.success) {
        throw new Error(response?.message || "No se pudieron preparar las etiquetas");
      }

      const preparedRows = Array.isArray(response.rows) ? response.rows : [];
      const preparedById = new Map(preparedRows.map((row: any) => [String(row._id), row]));
      rowsReady = targetRows.map((row) => preparedById.get(String(row._id)) || row);
      setRows((current) => current.map((row) => preparedById.get(String(row._id)) || row));
    }

    if (rowsReady.some((row) => !row?.numero_guia)) {
      throw new Error("No se pudieron generar todas las etiquetas");
    }

    const printed = await printSimplePackageRows(rowsReady, options);
    if (!printed) {
      throw new Error("No se pudo imprimir las etiquetas");
    }

    return rowsReady;
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

    const draftPrintOptions = { ...labelPrintOptions };
    Modal.confirm({
      title: "Crear pedidos simples",
      content: `Se crearán ${pendingRows.length} pedidos simples con método de pago: ${
        paymentMethod === "efectivo" ? "Efectivo" : paymentMethod === "qr" ? "QR" : "No pagado"
      }. ¿Continuar?`,
      okText: "Crear",
      ...{
        content: (
          <div>
            <div>
              Se imprimiran {pendingRows.length} etiqueta(s) y luego se crearan {pendingRows.length} pedidos simples con metodo de pago:{" "}
              {paymentMethod === "efectivo" ? "Efectivo" : paymentMethod === "qr" ? "QR" : "No pagado"}. Continuar?
            </div>
            {buildPrintOptionsContent(draftPrintOptions)}
          </div>
        ),
        okText: "Imprimir y crear",
      },
      cancelText: "Cancelar",
      onOk: async () => {
        persistLabelPrintOptions(draftPrintOptions);
        setLabelPrintOptions({ ...draftPrintOptions });
        setPrintingQr(true);
        try {
          const rowsReady = await prepareRowsForCreateAndPrint(pendingRows, draftPrintOptions);
          const response = await createSimplePackageOrdersAPI({
            packageIds: rowsReady.map((row) => String(row._id)),
            paymentMethod,
          });
          if (!response?.success) {
            message.error(response.message || "No se pudieron crear los pedidos simples");
            return;
          }

          message.success(`Se imprimieron y crearon ${rowsReady.length} pedidos simples`);
          await Promise.all([fetchPackages(selectedSellerId), fetchSellers()]);
          onChanged?.();
        } catch (error) {
          console.error(error);
          message.error(error instanceof Error ? error.message : "Error creando los pedidos simples");
        } finally {
          setPrintingQr(false);
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
                  <>
                    <Button
                      type="primary"
                      onClick={handleCreateCurrentRows}
                      loading={printingQr}
                      disabled={!pendingRows.length || printingQr}
                      style={{
                        background: "#f97316",
                        borderColor: "#f97316",
                        color: "#ffffff",
                      }}
                    >
                      Crear pedidos
                    </Button>
                    <Button
                      onClick={handlePrintPendingQrs}
                      icon={<PrinterOutlined />}
                      loading={printingQr}
                      disabled={!rowsMissingPrintedQr.length || printingQr || sendingWhatsapp}
                    >
                      Imprimir etiquetas
                    </Button>
                    {canSendGuideWhatsapp && (
                      <Button
                        onClick={handleSendGuideWhatsapp}
                        icon={<WhatsAppOutlined />}
                        loading={sendingWhatsapp}
                        disabled={!pendingRows.some((row) => row?.numero_guia) || printingQr || sendingWhatsapp}
                      >
                        WhatsApp guias
                      </Button>
                    )}
                  </>
                ) : (
                  <Button onClick={resetCreateState}>Cancelar creacion</Button>
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
                          label: formatSellerDisplayName(seller),
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

                  <div style={{ border: "1px solid #dbeafe", background: "#eff6ff", borderRadius: 8, padding: 12 }}>
                    <Typography.Text strong>
                      Paquetes acumulados este mes: {createMonthlyCount}
                    </Typography.Text>
                    <div style={{ color: "#1d4ed8", marginTop: 4 }}>
                      {missingForNextRange > 0
                        ? `Faltan ${missingForNextRange} paquete(s) para el siguiente rango.`
                        : "Este vendedor ya esta en el ultimo rango del mes."}
                    </div>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          <th style={tableCellStyle}># mes</th>
                          <th style={tableCellStyle}>Nombre del comprador</th>
                          <th style={tableCellStyle}>Descripcion del paquete</th>
                          <th style={tableCellStyle}>Celular</th>
                          <th style={tableCellStyle}>Sucursal destino</th>
                          <th style={tableCellStyle}>Tamaño</th>
                          <th style={tableCellStyle}>Espacios delivery</th>
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
                              <Typography.Text strong>{createMonthlyCount + index + 1}</Typography.Text>
                            </td>
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
                                disabled
                                options={[
                                  { label: "Estandar", value: "estandar" },
                                  { label: "Grande", value: "grande" },
                                ]}
                              />
                            </td>
                            <td style={tableCellStyle}>
                              <InputNumber
                                min={1}
                                style={{ width: "100%" }}
                                value={Number(row.delivery_spaces || 1)}
                                disabled={!createOriginId}
                                onChange={(value) =>
                                  updateCreateRow(index, { delivery_spaces: Math.max(1, Number(value || 1)) })
                                }
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
                      disabled
                      type={!generalPaymentMethod ? "primary" : "default"}
                      onClick={() => applyGeneralPaymentMethod("")}
                    >
                      No pagado
                    </Button>
                    <Button
                      disabled={savingGeneralPayment || !unlockedRows.length}
                      type={generalPaymentMethod === "efectivo" ? "primary" : "default"}
                      onClick={() => applyGeneralPaymentMethod("efectivo")}
                    >
                      Efectivo
                    </Button>
                    <Button
                      disabled={savingGeneralPayment || !unlockedRows.length}
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
                            <th style={tableCellStyle}>Espacios delivery</th>
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
                            const isPrinted = isQrPrintedRow(row);
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
                              <tr key={rowId} style={isPrinted ? { background: "#f3f4f6", opacity: 0.72 } : undefined}>
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
                                    disabled={isSaving || isPrinted}
                                    options={destinationOptions}
                                    onChange={(value) => commitRowPatch(rowId, { destino_sucursal: value })}
                                  />
                                </td>
                                <td style={tableCellStyle}>
                                  <Select
                                    value={row.package_size || "estandar"}
                                    style={{ width: "100%" }}
                                    disabled
                                    options={[
                                      { label: "Estandar", value: "estandar" },
                                      { label: "Grande", value: "grande" },
                                    ]}
                                  />
                                </td>
                                <td style={tableCellStyle}>
                                  <InputNumber
                                    min={1}
                                    style={{ width: "100%" }}
                                    disabled={isSaving || isPrinted}
                                    value={Number(row.delivery_spaces || 1)}
                                    onChange={(value) => {
                                      const destinationId = getBranchId(row?.destino_sucursal);
                                      const spaces = getEffectiveDeliverySpaces(originId, destinationId, Number(value || 1));
                                      const routeId = getRouteId(originId, destinationId);
                                      setRows((current) =>
                                        current.map((currentRow) =>
                                          String(currentRow._id) === rowId
                                            ? applyPackagePatch(
                                                currentRow,
                                                {
                                                  package_size: getPackageSizeBySpaces(spaces, routeId),
                                                  delivery_spaces: spaces,
                                                  precio_entre_sucursal: getDeliveryRoutePrice(
                                                    originId,
                                                    destinationId,
                                                    spaces,
                                                    Number(row.numero_paquete || 1)
                                                  ),
                                                },
                                                sellerConfig
                                              )
                                            : currentRow
                                        )
                                      );
                                    }}
                                    onBlur={() => {
                                      const currentRow = rows.find((item) => String(item._id) === rowId);
                                      void commitRowPatch(rowId, {
                                        delivery_spaces: Math.max(1, Number(currentRow?.delivery_spaces || 1)),
                                      });
                                    }}
                                  />
                                </td>
                                <td style={tableCellStyle}>
                                  <InputNumber
                                    min={0}
                                    style={{ width: "100%" }}
                                    addonBefore="Bs."
                                    disabled={isSaving || isPrinted}
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
                                  {isPrinted ? (
                                    <Typography.Text type="secondary">
                                      Etiqueta impresa<br />{row.numero_guia || ""}
                                    </Typography.Text>
                                  ) : (
                                    <Button danger icon={<DeleteOutlined />} disabled={isSaving} onClick={() => handleDelete(rowId)} />
                                  )}
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
                        const isPrinted = isQrPrintedRow(row);
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
                          <div
                            key={rowId}
                            className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                            style={isPrinted ? { background: "#f3f4f6", opacity: 0.72 } : undefined}
                          >
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <Typography.Text strong>{row.comprador || "Sin comprador"}</Typography.Text>
                              <Typography.Text type="secondary">
                                {isPrinted ? `Etiqueta impresa ${row.numero_guia || ""}` : `Total: Bs. ${Number(row.precio_total || 0).toFixed(2)}`}
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
                                  disabled={isSaving || isPrinted}
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
                                  disabled
                                  options={[
                                    { label: "Estandar", value: "estandar" },
                                    { label: "Grande", value: "grande" },
                                  ]}
                                />
                              </div>
                              <div>
                                <Typography.Text strong>Espacios delivery</Typography.Text>
                                <InputNumber
                                  className="mt-1"
                                  min={1}
                                  style={{ width: "100%" }}
                                  disabled={isSaving || isPrinted}
                                  value={Number(row.delivery_spaces || 1)}
                                  onChange={(value) => {
                                    const destinationId = getBranchId(row?.destino_sucursal);
                                    const spaces = getEffectiveDeliverySpaces(originId, destinationId, Number(value || 1));
                                    const routeId = getRouteId(originId, destinationId);
                                    setRows((current) =>
                                      current.map((currentRow) =>
                                        String(currentRow._id) === rowId
                                          ? applyPackagePatch(
                                              currentRow,
                                              {
                                                package_size: getPackageSizeBySpaces(spaces, routeId),
                                                delivery_spaces: spaces,
                                                precio_entre_sucursal: getDeliveryRoutePrice(
                                                  originId,
                                                  destinationId,
                                                  spaces,
                                                  Number(row.numero_paquete || 1)
                                                ),
                                              },
                                              sellerConfig
                                            )
                                          : currentRow
                                      )
                                    );
                                  }}
                                  onBlur={() => {
                                    const currentRow = rows.find((item) => String(item._id) === rowId);
                                    void commitRowPatch(rowId, {
                                      delivery_spaces: Math.max(1, Number(currentRow?.delivery_spaces || 1)),
                                    });
                                  }}
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
                                    disabled={isSaving || isPrinted}
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
                              {!isPrinted && (
                                <Button danger block icon={<DeleteOutlined />} disabled={isSaving} onClick={() => handleDelete(rowId)} />
                              )}
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
    </>
  );
};

export default SimplePackageManagerModal;
