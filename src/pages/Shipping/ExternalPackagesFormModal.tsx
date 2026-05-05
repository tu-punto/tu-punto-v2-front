import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { AutoComplete, Button, Form, Input, InputNumber, Modal, Select, Space, message } from "antd";
import {
  ExternalContactSuggestion,
  getExternalContactSuggestionsAPI,
  registerExternalPackagesAPI,
} from "../../api/externalSale";
import { getSimplePackageBranchPricesAPI } from "../../api/simplePackage";
import { getSucursalsBasicAPI } from "../../api/sucursal";
import { createPixelConfig, findQzPrinters, qzPrint } from "../../utils/qzTray";
import {
  buildDirectShippingLabelImageData,
  DEFAULT_SHIPPING_LABEL_PRINT_OPTIONS,
  ShippingLabelPrintOptions,
  toBase64Png,
} from "./shippingQrLabel";

interface ExternalPackagesFormModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  currentSucursal?: { _id?: string; nombre?: string } | null;
}

const MIN_PACKAGES = 1;
const roundCurrency = (value: number) => +Number(value || 0).toFixed(2);
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

type SuggestionField = "seller_carnet" | "name" | "phone";
type SuggestionOption = {
  value: string;
  label: JSX.Element;
  contact: ExternalContactSuggestion;
};

const buildPackages = (count: number, existing: any[] = []) =>
  Array.from({ length: count }, (_, index) => ({
    comprador: existing[index]?.comprador || "",
    descripcion_paquete: existing[index]?.descripcion_paquete || "",
    telefono_comprador: existing[index]?.telefono_comprador || "",
    precio_paquete: existing[index]?.precio_paquete ?? undefined,
    esta_pagado: existing[index]?.esta_pagado ?? "no",
    monto_paga_vendedor: existing[index]?.monto_paga_vendedor ?? 0,
    monto_paga_comprador: existing[index]?.monto_paga_comprador ?? 0,
    destino_sucursal_id: existing[index]?.destino_sucursal_id || "",
    precio_entre_sucursal: existing[index]?.precio_entre_sucursal ?? 0,
  }));

const getSuggestionValue = (contact: ExternalContactSuggestion, field: SuggestionField) => {
  if (field === "seller_carnet") return contact.carnet_vendedor || "";
  if (field === "phone") return contact.telefono || "";
  return contact.nombre || "";
};

const normalizeSearchText = (value: string) => String(value || "").trim().toLowerCase();

const buildSuggestionLabel = (contact: ExternalContactSuggestion) => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    <span>{contact.nombre || "Sin nombre"}</span>
    <small style={{ color: "#666" }}>
      {[contact.carnet_vendedor ? `CI: ${contact.carnet_vendedor}` : "", contact.telefono ? `Cel: ${contact.telefono}` : ""]
        .filter(Boolean)
        .join(" | ")}
      {contact.source === "buyer" ? " comprador historico" : " vendedor historico"}
    </small>
  </div>
);

const ExternalPackagesFormModal = ({ visible, onClose, onCreated, currentSucursal }: ExternalPackagesFormModalProps) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [packageCount, setPackageCount] = useState<number>(MIN_PACKAGES);
  const [suggestionOptions, setSuggestionOptions] = useState<Record<string, SuggestionOption[]>>({});
  const [branchOptions, setBranchOptions] = useState<{ value: string; label: string }[]>([]);
  const [branchPrices, setBranchPrices] = useState<any[]>([]);
  const [labelPrintOptions, setLabelPrintOptions] = useState<ShippingLabelPrintOptions>(getStoredLabelPrintOptions);
  const suggestionRequestIds = useRef<Record<string, number>>({});

  const packageRows = useMemo(() => Array.from({ length: packageCount }, (_, i) => i), [packageCount]);
  const watchedPackages = Form.useWatch("paquetes", form) || [];
  const hasSellerPayment = useMemo(
    () =>
      watchedPackages
        .slice(0, packageCount)
        .some((row: any) => row?.esta_pagado !== "no" && Number(row?.monto_paga_vendedor || 0) > 0),
    [packageCount, watchedPackages]
  );
  const watchedOriginBranchId = Form.useWatch("origen_sucursal_id", form);
  const watchedDestinationBranchId = Form.useWatch("destino_sucursal_id", form);

  const routePriceMap = useMemo(() => {
    const map = new Map<string, number>();
    branchPrices.forEach((row: any) => {
      const originId = String(row?.origen_sucursal?._id || row?.origen_sucursal || "");
      const destinationId = String(row?.destino_sucursal?._id || row?.destino_sucursal || "");
      if (!originId || !destinationId) return;
      map.set(`${originId}::${destinationId}`, Number(row?.precio || 0));
    });
    return map;
  }, [branchPrices]);

  const destinationOptions = useMemo(() => {
    const originId = String(watchedOriginBranchId || "");
    if (!originId) return [];
    const originOption = branchOptions.find((option) => String(option.value) === originId);
    const pricedOptions = branchPrices
      .filter((row: any) => String(row?.origen_sucursal?._id || row?.origen_sucursal || "") === originId)
      .map((row: any) => ({
        value: String(row?.destino_sucursal?._id || row?.destino_sucursal || ""),
        label: String(row?.destino_sucursal?.nombre || "Sucursal destino"),
      }))
      .filter((option) => option.value);

    return [
      ...(originOption ? [{ value: originOption.value, label: originOption.label }] : []),
      ...pricedOptions.filter((option) => String(option.value) !== originId),
    ];
  }, [branchOptions, branchPrices, watchedOriginBranchId]);

  const getBranchRoutePrice = (originId?: string, destinationId?: string) =>
    String(originId || "") === String(destinationId || "")
      ? 0
      : Number(routePriceMap.get(`${originId || ""}::${destinationId || ""}`) || 0);

  const searchContactSuggestions = async (key: string, field: SuggestionField, value: string) => {
    const query = String(value || "").trim();
    if (query.length < 2) {
      setSuggestionOptions((current) => ({ ...current, [key]: [] }));
      return;
    }

    const requestId = (suggestionRequestIds.current[key] || 0) + 1;
    suggestionRequestIds.current[key] = requestId;

    const response = await getExternalContactSuggestionsAPI({ query, field, limit: 8 });
    if (suggestionRequestIds.current[key] !== requestId) return;

    const normalizedQuery = normalizeSearchText(query);
    const contacts: ExternalContactSuggestion[] = response?.success ? response.data || [] : [];
    const options = contacts
      .map((contact) => ({
        value: getSuggestionValue(contact, field),
        label: buildSuggestionLabel(contact),
        contact,
      }))
      .filter((option) => normalizeSearchText(option.value).includes(normalizedQuery));

    setSuggestionOptions((current) => ({ ...current, [key]: options }));
  };

  const applySellerSuggestion = (contact: ExternalContactSuggestion) => {
    form.setFieldsValue({
      carnet_vendedor: contact.carnet_vendedor || form.getFieldValue("carnet_vendedor"),
      vendedor: contact.nombre || form.getFieldValue("vendedor"),
      telefono_vendedor: contact.telefono || form.getFieldValue("telefono_vendedor"),
    });
  };

  const applyBuyerSuggestion = (rowIndex: number, contact: ExternalContactSuggestion) => {
    form.setFieldValue(["paquetes", rowIndex, "comprador"], contact.nombre || "");
    form.setFieldValue(["paquetes", rowIndex, "telefono_comprador"], contact.telefono || "");
  };

  const handlePackageDestinationChange = (rowIndex: number, destinationId: string) => {
    form.setFieldValue(["paquetes", rowIndex, "destino_sucursal_id"], destinationId);
    form.setFieldValue(
      ["paquetes", rowIndex, "precio_entre_sucursal"],
      getBranchRoutePrice(watchedOriginBranchId, destinationId)
    );
  };

  const applyDestinationToAll = () => {
    if (!watchedDestinationBranchId) {
      message.warning("Selecciona una sucursal destino para aplicarla");
      return;
    }

    const currentRows = form.getFieldValue("paquetes") || [];
    form.setFieldValue(
      "paquetes",
      buildPackages(packageCount, currentRows).map((row) => ({
        ...row,
        destino_sucursal_id: watchedDestinationBranchId,
        precio_entre_sucursal: getBranchRoutePrice(watchedOriginBranchId, watchedDestinationBranchId),
      }))
    );
  };

  const applyDescriptionToAll = () => {
    const description = String(form.getFieldValue("bulk_descripcion_paquete") || "").trim();
    if (!description) {
      message.warning("Ingresa una descripcion para aplicarla");
      return;
    }

    const currentRows = form.getFieldValue("paquetes") || [];
    form.setFieldValue(
      "paquetes",
      buildPackages(packageCount, currentRows).map((row) => ({
        ...row,
        descripcion_paquete: description,
      }))
    );
  };

  const applyPackagePriceToAll = () => {
    const price = roundCurrency(Number(form.getFieldValue("bulk_precio_paquete") || 0));
    if (price <= 0) {
      message.warning("Ingresa un precio de paquete mayor a 0");
      return;
    }

    const currentRows = form.getFieldValue("paquetes") || [];
    form.setFieldValue(
      "paquetes",
      buildPackages(packageCount, currentRows).map((row) => {
        const mode = row.esta_pagado || "no";
        if (mode === "si") {
          return {
            ...row,
            precio_paquete: price,
            monto_paga_vendedor: price,
            monto_paga_comprador: 0,
          };
        }
        if (mode === "mixto") {
          const half = roundCurrency(price / 2);
          return {
            ...row,
            precio_paquete: price,
            monto_paga_vendedor: half,
            monto_paga_comprador: roundCurrency(price - half),
          };
        }
        return {
          ...row,
          precio_paquete: price,
          monto_paga_vendedor: 0,
          monto_paga_comprador: 0,
        };
      })
    );
  };

  const handlePaymentModeChange = (rowIndex: number, mode: "si" | "no" | "mixto") => {
    const price = Number(form.getFieldValue(["paquetes", rowIndex, "precio_paquete"]) || 0);
    if (price <= 0) {
      message.warning("Primero ingresa el precio del paquete");
      form.setFieldValue(["paquetes", rowIndex, "esta_pagado"], "no");
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_vendedor"], 0);
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_comprador"], 0);
      return;
    }

    if (mode === "si") {
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_vendedor"], price);
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_comprador"], 0);
      return;
    }
    if (mode === "no") {
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_vendedor"], 0);
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_comprador"], 0);
      return;
    }

    const half = roundCurrency(price / 2);
    form.setFieldValue(["paquetes", rowIndex, "monto_paga_vendedor"], half);
    form.setFieldValue(["paquetes", rowIndex, "monto_paga_comprador"], roundCurrency(price - half));
  };

  const handlePackagePriceChange = (rowIndex: number, value: number | null) => {
    const price = roundCurrency(Number(value || 0));
    const mode = form.getFieldValue(["paquetes", rowIndex, "esta_pagado"]) || "no";
    const currentSellerAmount = roundCurrency(
      Number(form.getFieldValue(["paquetes", rowIndex, "monto_paga_vendedor"]) || 0)
    );
    const currentBuyerAmount = roundCurrency(
      Number(form.getFieldValue(["paquetes", rowIndex, "monto_paga_comprador"]) || 0)
    );

    if (price <= 0) {
      form.setFieldValue(["paquetes", rowIndex, "esta_pagado"], "no");
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_vendedor"], 0);
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_comprador"], 0);
      return;
    }

    if (mode === "si") {
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_vendedor"], price);
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_comprador"], 0);
      return;
    }

    if (mode === "mixto") {
      const hasManualSplit = currentSellerAmount > 0 && currentBuyerAmount > 0;

      if (hasManualSplit) {
        const nextSellerAmount = Math.min(currentSellerAmount, roundCurrency(Math.max(0, price - 0.01)));
        form.setFieldValue(["paquetes", rowIndex, "monto_paga_vendedor"], nextSellerAmount);
        form.setFieldValue(
          ["paquetes", rowIndex, "monto_paga_comprador"],
          roundCurrency(price - nextSellerAmount)
        );
        return;
      }

      const half = roundCurrency(price / 2);
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_vendedor"], half);
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_comprador"], roundCurrency(price - half));
    }
  };

  const handleMixedSellerChange = (rowIndex: number, value: number | null) => {
    const price = roundCurrency(Number(form.getFieldValue(["paquetes", rowIndex, "precio_paquete"]) || 0));
    if (price <= 0) {
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_vendedor"], 0);
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_comprador"], 0);
      return;
    }

    let seller = roundCurrency(Number(value || 0));
    if (seller < 0) seller = 0;
    if (seller > price) seller = price;

    form.setFieldValue(["paquetes", rowIndex, "monto_paga_vendedor"], seller);
    form.setFieldValue(["paquetes", rowIndex, "monto_paga_comprador"], roundCurrency(price - seller));
  };

  const handlePackageCountChange = (value: number | null) => {
    const nextCount = Math.max(MIN_PACKAGES, Number(value || MIN_PACKAGES));
    const currentRows = form.getFieldValue("paquetes") || [];
    form.setFieldsValue({
      numero_paquetes: nextCount,
      paquetes: buildPackages(nextCount, currentRows).map((row) => {
        const destinationId = row.destino_sucursal_id || watchedDestinationBranchId || watchedOriginBranchId || "";
        return {
          ...row,
          destino_sucursal_id: destinationId,
          precio_entre_sucursal: getBranchRoutePrice(watchedOriginBranchId, destinationId),
        };
      }),
    });
    setPackageCount(nextCount);
  };

  const resetModal = () => {
    setPackageCount(MIN_PACKAGES);
    form.resetFields();
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

  const printExternalRows = async (rowsToPrint: any[], options = labelPrintOptions) => {
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
        origin: row?.origen_sucursal?.nombre || row?.sucursal?.nombre || currentSucursal?.nombre || "Externo",
        destination: row?.destino_sucursal?.nombre || row?.lugar_entrega || currentSucursal?.nombre || "Externo",
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

  useEffect(() => {
    if (!visible) return;
    const loadBranches = async () => {
      setLoadingBranches(true);
      try {
        const [sucursalesResponse, pricesResponse] = await Promise.all([
          getSucursalsBasicAPI(),
          getSimplePackageBranchPricesAPI(),
        ]);

        const sucursales = Array.isArray(sucursalesResponse) ? sucursalesResponse : [];
        setBranchOptions(
          sucursales
            .map((branch: any) => ({
              value: String(branch?._id || ""),
              label: String(branch?.nombre || "Sucursal"),
            }))
            .filter((option) => option.value)
        );
        setBranchPrices(Array.isArray(pricesResponse?.rows) ? pricesResponse.rows : []);
      } catch (error) {
        console.error(error);
        message.error("No se pudieron cargar las sucursales");
      } finally {
        setLoadingBranches(false);
      }
    };

    void loadBranches();
    form.setFieldsValue({
      origen_sucursal_id: currentSucursal?._id,
      destino_sucursal_id: currentSucursal?._id,
      numero_paquetes: MIN_PACKAGES,
      metodo_pago: undefined,
      paquetes: buildPackages(MIN_PACKAGES).map((row) => ({
        ...row,
        destino_sucursal_id: currentSucursal?._id || "",
        precio_entre_sucursal: 0,
      })),
    });
  }, [currentSucursal?._id, form, visible]);

  useEffect(() => {
    if (!visible || !watchedOriginBranchId) return;

    const nextGeneralDestination = destinationOptions.some(
      (option) => String(option.value) === String(watchedDestinationBranchId)
    )
      ? watchedDestinationBranchId
      : watchedOriginBranchId;
    form.setFieldValue("destino_sucursal_id", nextGeneralDestination);

    const currentRows = form.getFieldValue("paquetes") || [];
    form.setFieldValue(
      "paquetes",
      buildPackages(packageCount, currentRows).map((row) => {
        const destinationId = destinationOptions.some((option) => String(option.value) === String(row.destino_sucursal_id))
          ? row.destino_sucursal_id
          : nextGeneralDestination;

        return {
          ...row,
          destino_sucursal_id: destinationId,
          precio_entre_sucursal: getBranchRoutePrice(watchedOriginBranchId, destinationId),
        };
      })
    );
  }, [destinationOptions, form, packageCount, visible, watchedDestinationBranchId, watchedOriginBranchId, routePriceMap]);

  const onFinish = async (values: any) => {
    if (!currentSucursal?._id || !currentSucursal?.nombre) {
      message.error("No se pudo identificar la sucursal actual para registrar la entrega externa");
      return;
    }
    const originBranchId = currentSucursal._id;
    if (!originBranchId) {
      message.error("No se pudo identificar la sucursal origen");
      return;
    }

    const paquetes = (values.paquetes || []).slice(0, packageCount).map((row: any, index: number) => {
      const price = roundCurrency(Number(row.precio_paquete || 0));
      const branchRoutePrice = roundCurrency(
        getBranchRoutePrice(originBranchId, row.destino_sucursal_id)
      );
      const paidStatus = row.esta_pagado || "no";
      let sellerAmount = roundCurrency(Number(row.monto_paga_vendedor || 0));
      let buyerAmount = roundCurrency(Number(row.monto_paga_comprador || 0));

      if (paidStatus === "si") {
        sellerAmount = price;
        buyerAmount = 0;
      } else if (paidStatus === "no") {
        sellerAmount = 0;
        buyerAmount = 0;
      }

      return {
        numero_paquete: index + 1,
        comprador: row.comprador || "",
        descripcion_paquete: row.descripcion_paquete,
        telefono_comprador: row.telefono_comprador || "",
        destino_sucursal_id: row.destino_sucursal_id || "",
        precio_entre_sucursal: branchRoutePrice,
        precio_paquete: price,
        esta_pagado: paidStatus,
        monto_paga_vendedor: sellerAmount,
        monto_paga_comprador: buyerAmount,
      };
    });

    for (const [index, p] of paquetes.entries()) {
      if (!p.destino_sucursal_id) {
        message.error(`Paquete ${index + 1}: selecciona la sucursal donde recogera el comprador`);
        return;
      }
      if (p.esta_pagado === "mixto") {
        const price = Number(p.precio_paquete || 0);
        const montoVendedor = Number(p.monto_paga_vendedor || 0);
        const montoComprador = Number(p.monto_paga_comprador || 0);
        const suma = roundCurrency(montoVendedor + montoComprador);

        if (price <= 0) {
          message.error("Para pago mixto el precio del paquete debe ser mayor a 0");
          return;
        }
        if (montoVendedor <= 0 || montoComprador <= 0) {
          message.error("En pago mixto ambos deben pagar un monto mayor a 0");
          return;
        }
        if (montoVendedor >= price || montoComprador >= price) {
          message.error("En pago mixto ninguna parte puede pagar todo el paquete");
          return;
        }
        if (Math.abs(suma - price) > 0.01) {
          message.error("En pago mixto la suma debe ser igual al precio del paquete");
          return;
        }
      }
    }

    const totalSellerPayment = roundCurrency(
      paquetes.reduce((sum: number, p: any) => sum + Number(p.monto_paga_vendedor || 0), 0)
    );
    const sellerPaymentMethod = totalSellerPayment > 0 ? String(values.metodo_pago || "").trim().toLowerCase() : "";
    if (totalSellerPayment > 0 && sellerPaymentMethod !== "efectivo" && sellerPaymentMethod !== "qr") {
      message.error("Debes indicar si el pago del vendedor sera en efectivo o QR");
      return;
    }

    const payload = {
      carnet_vendedor: values.carnet_vendedor,
      vendedor: values.vendedor,
      telefono_vendedor: values.telefono_vendedor,
      id_sucursal: originBranchId,
      origen_sucursal_id: originBranchId,
      lugar_entrega:
        destinationOptions.find((option) => String(option.value) === String(values.destino_sucursal_id))?.label ||
        currentSucursal?.nombre ||
        "Externo",
      metodo_pago: sellerPaymentMethod,
      numero_paquetes: packageCount,
      paquetes,
    };

    const draftPrintOptions = { ...labelPrintOptions };
    Modal.confirm({
      title: "Registrar e imprimir entregas externas",
      content: (
        <div>
          <div>
            Se registraran {packageCount} entrega(s) externa(s), se asignara su numero de guia y se imprimiran sus etiquetas.
            Continuar?
          </div>
          {buildPrintOptionsContent(draftPrintOptions)}
        </div>
      ),
      okText: "Guardar e imprimir",
      cancelText: "Cancelar",
      onOk: async () => {
        persistLabelPrintOptions(draftPrintOptions);
        setLabelPrintOptions({ ...draftPrintOptions });
        setLoading(true);
        let createdRows: any[] = [];
        try {
          const response = await registerExternalPackagesAPI(payload);
          if (!response.success) {
            message.error(response.message || "No se pudieron registrar las entregas externas");
            return;
          }

          createdRows = Array.isArray(response.data) ? response.data : [];
          if (!createdRows.length) {
            throw new Error("No se recibieron las etiquetas generadas");
          }
          if (createdRows.some((row) => !row?.numero_guia)) {
            throw new Error("No se pudieron generar todas las guias");
          }

          const printed = await printExternalRows(createdRows, draftPrintOptions);
          if (!printed) {
            throw new Error("No se pudo imprimir las etiquetas");
          }

          message.success(`Se imprimieron y registraron ${response.createdCount || createdRows.length} entregas externas`);
          resetModal();
          onCreated();
        } catch (error) {
          console.error(error);
          if (createdRows.length) {
            message.error("Las entregas se registraron, pero no se pudieron imprimir. Puedes reimprimir desde el detalle.");
            resetModal();
            onCreated();
          } else {
            message.error("Error registrando entregas externas");
          }
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <Modal
      title="Registrar Entregas Externas"
      open={visible}
      onCancel={() => {
        resetModal();
        onClose();
      }}
      footer={null}
      width={1120}
      style={{ maxWidth: "96vw" }}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Form.Item
            name="carnet_vendedor"
            label="Carnet del vendedor"
            rules={[{ required: true, message: "El carnet es obligatorio" }]}
          >
            <AutoComplete
              options={suggestionOptions.sellerCarnet || []}
              onSearch={(value) => searchContactSuggestions("sellerCarnet", "seller_carnet", value)}
              onSelect={(_, option) => applySellerSuggestion((option as SuggestionOption).contact)}
            >
              <Input placeholder="Ej: 1234567" />
            </AutoComplete>
          </Form.Item>
          <Form.Item
            name="vendedor"
            label="Nombre del vendedor"
            rules={[{ required: true, message: "El nombre es obligatorio" }]}
          >
            <AutoComplete
              options={suggestionOptions.sellerName || []}
              onSearch={(value) => searchContactSuggestions("sellerName", "name", value)}
              onSelect={(_, option) => applySellerSuggestion((option as SuggestionOption).contact)}
            >
              <Input placeholder="Nombre completo" />
            </AutoComplete>
          </Form.Item>
          <Form.Item
            name="telefono_vendedor"
            label="Celular del vendedor"
          >
            <AutoComplete
              options={suggestionOptions.sellerPhone || []}
              onSearch={(value) => searchContactSuggestions("sellerPhone", "phone", value)}
              onSelect={(_, option) => applySellerSuggestion((option as SuggestionOption).contact)}
            >
              <Input
                placeholder="Ej: 7XXXXXXX"
                onKeyDown={(e) => {
                  if (!/[0-9]/.test(e.key) && !["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete"].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
              />
            </AutoComplete>
          </Form.Item>
          <Form.Item
            name="numero_paquetes"
            label="Numero de paquetes"
            rules={[{ required: true, message: "Debe indicar la cantidad de paquetes" }]}
          >
            <InputNumber min={MIN_PACKAGES} style={{ width: "100%" }} onChange={handlePackageCountChange} />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Form.Item
            name="metodo_pago"
            label="Pago del vendedor"
            rules={hasSellerPayment ? [{ required: true, message: "Selecciona efectivo o QR" }] : []}
          >
            <Select
              allowClear
              placeholder="Selecciona como se recibio el pago del vendedor"
              options={[
                { label: "Efectivo", value: "efectivo" },
                { label: "QR", value: "qr" },
              ]}
            />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <Form.Item
            name="origen_sucursal_id"
            label="Sucursal origen (donde el vendedor dejara el producto)"
            rules={[{ required: true, message: "Selecciona sucursal origen" }]}
          >
            <Select
              loading={loadingBranches}
              options={branchOptions}
              placeholder="Origen"
              showSearch
              optionFilterProp="label"
              disabled
            />
          </Form.Item>
          <Form.Item
            name="destino_sucursal_id"
            label="Sucursal destino (donde recogera el comprador)"
          >
            <Select
              loading={loadingBranches}
              options={destinationOptions}
              placeholder="Destino"
              disabled={!watchedOriginBranchId}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Button
            style={{ marginBottom: 24 }}
            disabled={!watchedOriginBranchId || !watchedDestinationBranchId}
            onClick={applyDestinationToAll}
          >
            Usar destino en todos
          </Button>
        </div>

        <Space wrap size={[8, 8]} style={{ marginBottom: 12 }}>
          <Form.Item name="bulk_descripcion_paquete" style={{ marginBottom: 0 }}>
            <Input placeholder="Descripcion para todos" style={{ width: 240 }} />
          </Form.Item>
          <Button onClick={applyDescriptionToAll}>
            Usar descripcion en todos
          </Button>
          <Form.Item name="bulk_precio_paquete" style={{ marginBottom: 0 }}>
            <InputNumber prefix="Bs." min={0} placeholder="Precio paquete" style={{ width: 180 }} />
          </Form.Item>
          <Button onClick={applyPackagePriceToAll}>
            Usar precio en todos
          </Button>
        </Space>

        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #d9d9d9", padding: 8 }}>Nombre del comprador</th>
                <th style={{ border: "1px solid #d9d9d9", padding: 8 }}>Descripcion del paquete</th>
                <th style={{ border: "1px solid #d9d9d9", padding: 8 }}>Celular</th>
                <th style={{ border: "1px solid #d9d9d9", padding: 8 }}>Sucursal destino</th>
                <th style={{ border: "1px solid #d9d9d9", padding: 8 }}>Precio entre sucursal</th>
                <th style={{ border: "1px solid #d9d9d9", padding: 8 }}>Precio paquete</th>
                <th style={{ border: "1px solid #d9d9d9", padding: 8 }}>Estado pago</th>
              </tr>
            </thead>
            <tbody>
              {packageRows.map((rowIndex) => {
                const isMixedRow = watchedPackages?.[rowIndex]?.esta_pagado === "mixto";
                return (
                  <Fragment key={rowIndex}>
                    <tr>
                      <td style={{ border: "1px solid #d9d9d9", padding: 6 }}>
                        <Form.Item
                          name={["paquetes", rowIndex, "comprador"]}
                          dependencies={[["paquetes", rowIndex, "telefono_comprador"]]}
                          rules={[
                            {
                              validator: async (_, value) => {
                                const phone = String(form.getFieldValue(["paquetes", rowIndex, "telefono_comprador"]) || "").trim();
                                const name = String(value || "").trim();
                                if (name || phone) return;
                                throw new Error("Ingrese nombre o celular");
                              },
                            },
                          ]}
                          style={{ marginBottom: 0 }}
                        >
                          <AutoComplete
                            options={suggestionOptions[`buyerName-${rowIndex}`] || []}
                            onSearch={(value) => searchContactSuggestions(`buyerName-${rowIndex}`, "name", value)}
                            onSelect={(_, option) => applyBuyerSuggestion(rowIndex, (option as SuggestionOption).contact)}
                          >
                            <Input placeholder="Comprador" />
                          </AutoComplete>
                        </Form.Item>
                      </td>
                      <td style={{ border: "1px solid #d9d9d9", padding: 6 }}>
                        <Form.Item
                          name={["paquetes", rowIndex, "descripcion_paquete"]}
                          rules={[{ required: true, message: "Requerido" }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Input.TextArea
                            placeholder="Descripcion"
                            autoSize={{ minRows: 1, maxRows: 8 }}
                            style={{ resize: "vertical", overflow: "auto" }}
                          />
                        </Form.Item>
                      </td>
                      <td style={{ border: "1px solid #d9d9d9", padding: 6 }}>
                        <Form.Item
                          name={["paquetes", rowIndex, "telefono_comprador"]}
                          dependencies={[["paquetes", rowIndex, "comprador"]]}
                          rules={[
                            {
                              validator: async (_, value) => {
                                const name = String(form.getFieldValue(["paquetes", rowIndex, "comprador"]) || "").trim();
                                const phone = String(value || "").trim();
                                if (name || phone) return;
                                throw new Error("Ingrese nombre o celular");
                              },
                            },
                          ]}
                          style={{ marginBottom: 0 }}
                        >
                          <AutoComplete
                            options={suggestionOptions[`buyerPhone-${rowIndex}`] || []}
                            onSearch={(value) => searchContactSuggestions(`buyerPhone-${rowIndex}`, "phone", value)}
                            onSelect={(_, option) => applyBuyerSuggestion(rowIndex, (option as SuggestionOption).contact)}
                          >
                            <Input
                              placeholder="Celular"
                              onKeyDown={(e) => {
                                if (
                                  !/[0-9]/.test(e.key) &&
                                  !["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete"].includes(e.key)
                                ) {
                                  e.preventDefault();
                                }
                              }}
                            />
                          </AutoComplete>
                        </Form.Item>
                      </td>
                      <td style={{ border: "1px solid #d9d9d9", padding: 6 }}>
                        <Form.Item
                          name={["paquetes", rowIndex, "destino_sucursal_id"]}
                          rules={[{ required: true, message: "Requerido" }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Select
                            options={destinationOptions}
                            placeholder="Destino"
                            disabled={!watchedOriginBranchId}
                            onChange={(value) => handlePackageDestinationChange(rowIndex, String(value || ""))}
                          />
                        </Form.Item>
                      </td>
                      <td style={{ border: "1px solid #d9d9d9", padding: 6 }}>
                        <Form.Item name={["paquetes", rowIndex, "precio_entre_sucursal"]} style={{ marginBottom: 0 }}>
                          <InputNumber prefix="Bs." min={0} style={{ width: "100%" }} readOnly />
                        </Form.Item>
                      </td>
                      <td style={{ border: "1px solid #d9d9d9", padding: 6 }}>
                        <Form.Item
                          name={["paquetes", rowIndex, "precio_paquete"]}
                          rules={[{ required: true, message: "Requerido" }]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber
                            prefix="Bs."
                            min={0}
                            style={{ width: "100%" }}
                            onChange={(value) => handlePackagePriceChange(rowIndex, value)}
                          />
                        </Form.Item>
                      </td>
                      <td style={{ border: "1px solid #d9d9d9", padding: 6 }}>
                        <Form.Item
                          name={["paquetes", rowIndex, "esta_pagado"]}
                          initialValue="no"
                          style={{ marginBottom: 0 }}
                        >
                          <Select
                            options={[
                              { label: "Pagado por vendedor", value: "si" },
                              { label: "No pagado", value: "no" },
                              { label: "Mixto", value: "mixto" },
                            ]}
                            onChange={(value) => handlePaymentModeChange(rowIndex, value as "si" | "no" | "mixto")}
                          />
                        </Form.Item>
                      </td>
                    </tr>
                    {isMixedRow && (
                      <tr>
                        <td colSpan={7} style={{ border: "1px solid #d9d9d9", padding: 8, background: "#fafafa" }}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Form.Item
                              label="Paga vendedor"
                              name={["paquetes", rowIndex, "monto_paga_vendedor"]}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber
                                min={0}
                                max={Math.max(0, roundCurrency(Number(watchedPackages?.[rowIndex]?.precio_paquete || 0) - 0.01))}
                                precision={2}
                                prefix="Bs."
                                style={{ width: "100%" }}
                                onChange={(value) => handleMixedSellerChange(rowIndex, value)}
                              />
                            </Form.Item>
                            <Form.Item
                              label="Paga comprador"
                              name={["paquetes", rowIndex, "monto_paga_comprador"]}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber min={0} precision={2} prefix="Bs." style={{ width: "100%" }} disabled />
                            </Form.Item>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <Button
            onClick={() => {
              resetModal();
              onClose();
            }}
          >
            Cancelar
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Guardar
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default ExternalPackagesFormModal;
