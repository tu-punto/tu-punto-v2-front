import { useEffect, useMemo, useState } from "react";
import { EditOutlined, PrinterOutlined, SaveOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { Button, Card, Col, Form, Input, InputNumber, Modal, Radio, Row, Select, Space, message } from "antd";
import moment from "moment-timezone";
import { sendExternalGuideWhatsappAPI, updateExternalSaleAPI } from "../../api/externalSale";
import { createPixelConfig, findQzPrinters, qzPrint } from "../../utils/qzTray";
import { buildDirectShippingLabelImageData, toBase64Png } from "./shippingQrLabel";

interface ExternalShippingInfoModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  externalShipping: any;
  isAdmin: boolean;
  canSendGuideWhatsapp: boolean;
}

const roundCurrency = (value: number) => +Number(value || 0).toFixed(2);
const TZ = "America/La_Paz";
const getBranchId = (value: any): string => String(value?._id ?? value?.$oid ?? value ?? "").trim();
const calculateEstimatedBranchPickupDate = (value?: unknown) => {
  const createdAt = value ? moment.tz(value as any, TZ) : moment.tz(TZ);
  if (!createdAt.isValid()) return null;

  const day = createdAt.isoWeekday();
  const daysToAdd = day === 2 ? 2 : day === 3 ? 1 : day === 4 ? 5 : day === 5 ? 4 : day === 6 ? 3 : day === 7 ? 2 : 1;
  return createdAt.add(daysToAdd, "days");
};
const calculateLatePickupFee = (startAt?: unknown, pickedUpAt: Date = new Date()) => {
  if (!startAt) return 0;
  const start = moment.tz(startAt as any, TZ);
  const pickedUp = moment.tz(pickedUpAt as any, TZ);
  if (!start.isValid() || !pickedUp.isValid()) return 0;
  return Math.max(0, pickedUp.startOf("day").diff(start.startOf("day"), "days") - 7);
};

const isSameBusinessDay = (value?: unknown) => {
  const date = moment.tz(value as any, TZ);
  return date.isValid() && date.isSame(moment.tz(TZ), "day");
};

const normalizePaidStatus = (value: unknown): "si" | "no" | "mixto" => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "si" || normalized === "sí" || normalized === "pagado") return "si";
  if (normalized === "mixto" || normalized === "mixed" || normalized === "parcial") return "mixto";
  return "no";
};

const DELIVERY_PAYMENT_LABEL_BY_CODE: Record<string, string> = {
  "1": "Transferencia o QR",
  "2": "Efectivo",
  "4": "Efectivo + QR",
};

const normalizeDeliveryPaymentCode = (value: unknown): "1" | "2" | "4" | "" => {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "1" || trimmed === "2" || trimmed === "4") return trimmed;

  const normalized = trimmed.toLowerCase();
  if (normalized === "transferencia o qr") return "1";
  if (normalized === "efectivo") return "2";
  if (normalized === "efectivo + qr") return "4";
  return "";
};

const ExternalShippingInfoModal = ({
  visible,
  onClose,
  onSaved,
  externalShipping,
  isAdmin,
  canSendGuideWhatsapp,
}: ExternalShippingInfoModalProps) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [chargeSaving, setChargeSaving] = useState(false);
  const [chargeEditing, setChargeEditing] = useState(false);
  const [chargeOverride, setChargeOverride] = useState<any>(null);
  const [printingQr, setPrintingQr] = useState(false);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const chargeSource = chargeOverride ? { ...externalShipping, ...chargeOverride } : externalShipping;

  const packagePrice = useMemo(
    () => Number(externalShipping?.precio_paquete ?? externalShipping?.precio_total ?? 0),
    [externalShipping]
  );
  const shippingPrice = useMemo(
    () => Number(externalShipping?.precio_entre_sucursal ?? externalShipping?.cargo_delivery ?? 0),
    [externalShipping]
  );
  const packageSaldo = useMemo(() => Number(externalShipping?.saldo_por_paquete ?? 0), [externalShipping]);
  const amortizacion = useMemo(
    () => Number(externalShipping?.amortizacion_vendedor ?? 0),
    [externalShipping]
  );
  const totalServicePrice = useMemo(
    () => Number(externalShipping?.precio_total ?? packagePrice + shippingPrice),
    [externalShipping, packagePrice, shippingPrice]
  );
  const isSimplePackage = String(externalShipping?.service_origin || "") === "simple_package";
  const totalAmountToCharge = useMemo(() => {
    if (isSimplePackage) {
      return Math.max(0, roundCurrency(packagePrice + packageSaldo + shippingPrice - amortizacion));
    }
    return roundCurrency(externalShipping?.precio_total ?? packagePrice);
  }, [packagePrice, packageSaldo, shippingPrice, amortizacion, externalShipping, isSimplePackage]);
  const estadoPedido = Form.useWatch("estado_pedido", form);
  const tipoPagoEntrega = Form.useWatch("tipo_de_pago", form);
  const editablePaidStatus = normalizePaidStatus(Form.useWatch("esta_pagado", form) ?? chargeSource?.esta_pagado);
  const editableSellerAmount = Number(Form.useWatch("monto_paga_vendedor", form) || 0);
  const subtotalEfectivo = Number(Form.useWatch("subtotal_efectivo", form) || 0);
  const baseBuyerDebt = useMemo(
    () =>
      roundCurrency(
        Number(
          chargeSource?.deuda_comprador ??
            chargeSource?.monto_paga_comprador ??
            chargeSource?.saldo_cobrar ??
            totalAmountToCharge
        )
      ),
    [chargeSource, totalAmountToCharge]
  );
  const latePickupFee = useMemo(
    () => {
      if (chargeSource?.estado_pedido === "Entregado") {
        return roundCurrency(Number(chargeSource?.late_pickup_fee || 0));
      }
      const originId = getBranchId(chargeSource?.origen_sucursal) || getBranchId(chargeSource?.sucursal);
      const destinationId = getBranchId(chargeSource?.destino_sucursal) || getBranchId(chargeSource?.sucursal);
      const feeStartAt =
        originId && destinationId && originId !== destinationId
          ? calculateEstimatedBranchPickupDate(chargeSource?.fecha_pedido) || chargeSource?.fecha_pedido
          : chargeSource?.fecha_pedido;
      return calculateLatePickupFee(feeStartAt);
    },
    [chargeSource]
  );
  const buyerDebt = useMemo(
    () => roundCurrency(baseBuyerDebt + (chargeSource?.estado_pedido === "Entregado" ? 0 : latePickupFee)),
    [baseBuyerDebt, latePickupFee, chargeSource]
  );
  const serviceLabel = isSimplePackage ? "Simple" : "Externo";
  const canEditDelivery = isAdmin && externalShipping?.estado_pedido !== "Entregado" && externalShipping?.delivered !== true;
  const canEditCreatedToday = canEditDelivery && !isSimplePackage && isSameBusinessDay(externalShipping?.fecha_pedido);
  const canEditBuyerName = canEditCreatedToday;
  const canEditChargeSummary = canEditCreatedToday;
  const shouldAskBuyerPayment = estadoPedido === "Entregado" && buyerDebt > 0;

  const externalPaidStatus = String(chargeSource?.esta_pagado || "no").trim().toLowerCase();
  const sellerPaymentLabel =
    String(chargeSource?.metodo_pago || "").trim().toLowerCase() === "qr"
      ? "QR"
      : String(chargeSource?.metodo_pago || "").trim().toLowerCase() === "efectivo"
        ? "Efectivo"
        : "Sin registro";
  const sellerAmount = roundCurrency(Number(chargeSource?.monto_paga_vendedor || 0));
  const buyerAmount = roundCurrency(Number(chargeSource?.monto_paga_comprador || 0));
  const chargePreview = useMemo(() => {
    const total = roundCurrency(totalServicePrice);
    if (editablePaidStatus === "si") {
      return {
        sellerAmount: total,
        buyerAmount: 0,
        buyerDebt: 0,
      };
    }
    if (editablePaidStatus === "no") {
      return {
        sellerAmount: 0,
        buyerAmount: 0,
        buyerDebt: total,
      };
    }

    const seller = roundCurrency(Math.max(0, Math.min(total, editableSellerAmount)));
    const buyer = roundCurrency(Math.max(0, total - seller));
    return {
      sellerAmount: seller,
      buyerAmount: buyer,
      buyerDebt: buyer,
    };
  }, [editablePaidStatus, editableSellerAmount, totalServicePrice]);
  const displayedSellerAmount = chargeEditing ? chargePreview.sellerAmount : sellerAmount;
  const displayedBuyerAmount = chargeEditing ? chargePreview.buyerAmount : buyerAmount;
  const displayedBuyerDebt = chargeEditing
    ? roundCurrency(chargePreview.buyerDebt + (chargeSource?.estado_pedido === "Entregado" ? 0 : latePickupFee))
    : buyerDebt;

  const handleBuyerPaymentTypeChange = (nextType: "1" | "2" | "4") => {
    form.setFieldValue("tipo_de_pago", nextType);

    if (nextType === "1") {
      form.setFieldValue("subtotal_qr", buyerDebt);
      form.setFieldValue("subtotal_efectivo", 0);
      return;
    }

    if (nextType === "2") {
      form.setFieldValue("subtotal_qr", 0);
      form.setFieldValue("subtotal_efectivo", buyerDebt);
      return;
    }

    const currentQr = roundCurrency(Number(form.getFieldValue("subtotal_qr") || 0));
    if (currentQr > 0 && currentQr < buyerDebt) {
      form.setFieldValue("subtotal_qr", currentQr);
      form.setFieldValue("subtotal_efectivo", roundCurrency(buyerDebt - currentQr));
      return;
    }

    const half = roundCurrency(buyerDebt / 2);
    form.setFieldValue("subtotal_qr", half);
    form.setFieldValue("subtotal_efectivo", roundCurrency(buyerDebt - half));
  };

  const handleChargeStatusChange = (value: "si" | "no" | "mixto") => {
    form.setFieldValue("esta_pagado", value);
    if (value === "si") {
      form.setFieldValue("monto_paga_vendedor", roundCurrency(totalServicePrice));
    } else if (value === "no") {
      form.setFieldValue("monto_paga_vendedor", 0);
    }
  };

  const handleSaveChargeSummary = async () => {
    if (!externalShipping?._id || !canEditChargeSummary) return;

    const paidStatus = normalizePaidStatus(form.getFieldValue("esta_pagado"));
    const sellerAmountToSave =
      paidStatus === "si"
        ? roundCurrency(totalServicePrice)
        : paidStatus === "no"
          ? 0
          : roundCurrency(Number(form.getFieldValue("monto_paga_vendedor") || 0));
    const buyerAmountToSave =
      paidStatus === "mixto" ? roundCurrency(totalServicePrice - sellerAmountToSave) : 0;

    if (paidStatus === "mixto" && (sellerAmountToSave <= 0 || buyerAmountToSave <= 0)) {
      message.error("En pago mixto el monto vendedor debe ser mayor a 0 y menor al total");
      return;
    }

    setChargeSaving(true);
    try {
      const response = await updateExternalSaleAPI(externalShipping._id, {
        esta_pagado: paidStatus,
        monto_paga_vendedor: sellerAmountToSave,
        monto_paga_comprador: buyerAmountToSave,
        metodo_pago: externalShipping?.metodo_pago || "efectivo",
      });

      if (!response.success) {
        message.error(response.message || "No se pudo actualizar el resumen del cobro");
        return;
      }

      setChargeOverride({
        esta_pagado: paidStatus,
        monto_paga_vendedor: sellerAmountToSave,
        monto_paga_comprador: buyerAmountToSave,
        deuda_comprador: buyerAmountToSave,
        saldo_cobrar: buyerAmountToSave,
        metodo_pago: externalShipping?.metodo_pago || "efectivo",
      });
      message.success("Resumen del cobro actualizado");
      setChargeEditing(false);
    } catch (error) {
      console.error(error);
      message.error("Error actualizando el resumen del cobro");
    } finally {
      setChargeSaving(false);
    }
  };

  const handleSendGuideWhatsapp = async () => {
    if (!canSendGuideWhatsapp) {
      message.warning("Solo superadmins pueden enviar la guia por WhatsApp");
      return;
    }
    if (!externalShipping?._id) {
      message.warning("No se pudo identificar el pedido");
      return;
    }
    if (!externalShipping?.numero_guia) {
      message.warning("El pedido debe tener numero de guia antes de enviar WhatsApp");
      return;
    }

    setSendingWhatsapp(true);
    try {
      const response = await sendExternalGuideWhatsappAPI(String(externalShipping._id));
      if (!response?.success) {
        message.error(response.message || "No se pudo enviar WhatsApp");
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
      message.error("No se pudo enviar WhatsApp");
    } finally {
      setSendingWhatsapp(false);
    }
  };

  const handleSubtotalQrChange = (value: number | null) => {
    if (tipoPagoEntrega !== "4") return;

    let nextQr = roundCurrency(Number(value || 0));
    if (nextQr < 0) nextQr = 0;
    if (nextQr > buyerDebt) nextQr = buyerDebt;

    form.setFieldValue("subtotal_qr", nextQr);
    form.setFieldValue("subtotal_efectivo", roundCurrency(Math.max(0, buyerDebt - nextQr)));
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

  const handlePrintExternalQRDirect = async () => {
    if (!externalShipping?.numero_guia) {
      message.warning("Esta entrega no tiene numero de guia para imprimir");
      return;
    }

    setPrintingQr(true);
    try {
      const printerName = await resolveDirectPrintPrinter();
      if (!printerName) {
        message.warning("No se encontraron impresoras en QZ Tray");
        return;
      }

      const labelImage = await buildDirectShippingLabelImageData({
        guideNumber: String(externalShipping.numero_guia || ""),
        clientName: externalShipping.comprador,
        clientPhone: externalShipping.telefono_comprador,
        clientCi: externalShipping.carnet_comprador,
        origin: externalShipping?.sucursal?.nombre || "Externo",
        destination: externalShipping?.lugar_entrega || externalShipping?.sucursal?.nombre || "Externo",
        ticketWidthMm: 40,
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

      message.success("Etiqueta enviada a la impresora");
    } catch (error) {
      console.error(error);
      message.error("No se pudo imprimir. Revisa QZ Tray o la impresora.");
    } finally {
      setPrintingQr(false);
    }
  };

  useEffect(() => {
    if (!visible || !externalShipping) return;

    const initialDeliveryType = normalizeDeliveryPaymentCode(externalShipping.tipo_de_pago);
    const initialQr = roundCurrency(Number(externalShipping.subtotal_qr || 0));
    const initialEfectivo = roundCurrency(Number(externalShipping.subtotal_efectivo || 0));
    let nextDeliveryType: "1" | "2" | "4" | "" = initialDeliveryType;
    let nextSubtotalQr = initialQr;
    let nextSubtotalEfectivo = initialEfectivo;

    if ((externalShipping.estado_pedido || "En Espera") === "Entregado" && buyerDebt > 0) {
      if (initialDeliveryType === "1") {
        nextSubtotalQr = buyerDebt;
        nextSubtotalEfectivo = 0;
      } else if (initialDeliveryType === "2") {
        nextSubtotalQr = 0;
        nextSubtotalEfectivo = buyerDebt;
      } else if (initialDeliveryType === "4") {
        if (Math.abs(roundCurrency(initialQr + initialEfectivo) - buyerDebt) > 0.01) {
          const half = roundCurrency(buyerDebt / 2);
          nextSubtotalQr = half;
          nextSubtotalEfectivo = roundCurrency(buyerDebt - half);
        }
      } else {
        nextDeliveryType = "2";
        nextSubtotalQr = 0;
        nextSubtotalEfectivo = buyerDebt;
      }
    } else {
      nextDeliveryType = "";
      nextSubtotalQr = 0;
      nextSubtotalEfectivo = 0;
    }

    form.setFieldsValue({
      carnet_vendedor: externalShipping.carnet_vendedor || "",
      vendedor: externalShipping.vendedor || "",
      telefono_vendedor: externalShipping.telefono_vendedor || "",
      comprador: externalShipping.comprador || "",
      telefono_comprador: externalShipping.telefono_comprador || "",
      descripcion_paquete: externalShipping.descripcion_paquete || "",
      precio_paquete: packagePrice,
      esta_pagado: externalShipping.esta_pagado || "no",
      monto_paga_vendedor: roundCurrency(Number(externalShipping.monto_paga_vendedor || 0)),
      estado_pedido: externalShipping.estado_pedido || "En Espera",
      tipo_de_pago: nextDeliveryType,
      subtotal_qr: nextSubtotalQr,
      subtotal_efectivo: nextSubtotalEfectivo,
    });
    setChargeOverride(null);
    setChargeEditing(false);
  }, [externalShipping?._id, form, packagePrice, visible]);

  const handleSave = async (values: any) => {
    if (!externalShipping?._id) return;
    setLoading(true);
    try {
      if (values.estado_pedido === "Entregado" && buyerDebt > 0) {
        const deliveryType = normalizeDeliveryPaymentCode(values.tipo_de_pago);
        const qrAmount = roundCurrency(Number(form.getFieldValue("subtotal_qr") || 0));
        const efectivoAmount = roundCurrency(Number(form.getFieldValue("subtotal_efectivo") || 0));

        if (!deliveryType) {
          message.error("Debes indicar como pago el comprador al entregar");
          return;
        }

        if (deliveryType === "4") {
          if (qrAmount <= 0 || efectivoAmount <= 0) {
            message.error("En entrega mixta ambos montos deben ser mayores a 0");
            return;
          }
          if (Math.abs(roundCurrency(qrAmount + efectivoAmount) - buyerDebt) > 0.01) {
            message.error("La suma de QR + efectivo debe ser igual a la deuda del comprador");
            return;
          }
        } else if (deliveryType === "1" && Math.abs(qrAmount - buyerDebt) > 0.01) {
          message.error("El subtotal QR debe ser igual a la deuda del comprador");
          return;
        } else if (deliveryType === "2" && Math.abs(efectivoAmount - buyerDebt) > 0.01) {
          message.error("El subtotal efectivo debe ser igual a la deuda del comprador");
          return;
        }
      }

      const normalizedType = normalizeDeliveryPaymentCode(values.tipo_de_pago);
      const payload = {
        ...(canEditBuyerName ? { comprador: String(values.comprador || "").trim() } : {}),
        estado_pedido: values.estado_pedido,
        delivered: values.estado_pedido === "Entregado",
        tipo_de_pago:
          values.estado_pedido === "Entregado" && buyerDebt > 0 && normalizedType
            ? DELIVERY_PAYMENT_LABEL_BY_CODE[normalizedType]
            : "",
        subtotal_qr:
          values.estado_pedido === "Entregado" && buyerDebt > 0
            ? Number(form.getFieldValue("subtotal_qr") || 0)
            : 0,
        subtotal_efectivo:
          values.estado_pedido === "Entregado" && buyerDebt > 0
            ? Number(form.getFieldValue("subtotal_efectivo") || 0)
            : 0,
      };

      const response = await updateExternalSaleAPI(externalShipping._id, payload);
      if (!response.success) {
        message.error(response.message || "No se pudo actualizar la entrega externa");
        return;
      }

      message.success(`Entrega ${serviceLabel.toLowerCase()} actualizada`);
      onSaved();
    } catch (error) {
      console.error(error);
      message.error("Error actualizando la entrega externa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Detalle ${serviceLabel} ${externalShipping?.numero_guia || externalShipping?._id || ""}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={860}
      destroyOnClose
    >
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Space wrap>
        <Button
          icon={<PrinterOutlined />}
          loading={printingQr}
          disabled={!externalShipping?.numero_guia || sendingWhatsapp}
          onClick={() => void handlePrintExternalQRDirect()}
        >
          Imprimir etiqueta
        </Button>
        {canSendGuideWhatsapp && (
          <Button
            icon={<WhatsAppOutlined />}
            loading={sendingWhatsapp}
            disabled={!externalShipping?.numero_guia || printingQr}
            onClick={() => void handleSendGuideWhatsapp()}
          >
            WhatsApp guia
          </Button>
        )}
        </Space>
      </div>
      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Card title="Informacion del Vendedor" bordered={false}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Numero de guia">
                <Input value={externalShipping?.numero_guia || "Sin guia"} readOnly />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Carnet" name="carnet_vendedor">
                <Input readOnly />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Nombre" name="vendedor">
                <Input readOnly />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Celular" name="telefono_vendedor">
                <Input readOnly />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Informacion del Cliente" bordered={false}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Nombre Cliente" name="comprador">
                <Input readOnly={!canEditBuyerName} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Celular" name="telefono_comprador">
                <Input readOnly />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Detalle del Paquete" bordered={false} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="Descripcion del paquete" name="descripcion_paquete">
                <Input.TextArea rows={3} readOnly />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Precio del paquete" name="precio_paquete">
                <InputNumber prefix="Bs." style={{ width: "100%" }} readOnly />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Precio del envio">
                <Input value={`Bs. ${shippingPrice.toFixed(2)}`} readOnly />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Precio total del servicio">
                <Input value={`Bs. ${totalServicePrice.toFixed(2)}`} readOnly />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Saldo del paquete">
                <Input value={`Bs. ${packageSaldo.toFixed(2)}`} readOnly />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card
          title="Resumen del Cobro"
          bordered={false}
          style={{ marginTop: 16 }}
          extra={
            canEditChargeSummary ? (
              <Space>
                {chargeEditing && (
                  <Button
                    size="small"
                    icon={<SaveOutlined />}
                    loading={chargeSaving}
                    onClick={() => void handleSaveChargeSummary()}
                  >
                    Guardar
                  </Button>
                )}
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  disabled={chargeSaving}
                  onClick={() => {
                    if (chargeEditing) {
                      form.setFieldsValue({
                        esta_pagado: externalShipping?.esta_pagado || "no",
                        monto_paga_vendedor: roundCurrency(Number(externalShipping?.monto_paga_vendedor || 0)),
                      });
                    }
                    setChargeEditing((prev) => !prev);
                  }}
                />
              </Space>
            ) : undefined
          }
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Estado inicial del cobro">
                {chargeEditing ? (
                  <Form.Item name="esta_pagado" noStyle>
                    <Select
                      onChange={handleChargeStatusChange}
                      options={[
                        { value: "no", label: "No pagado" },
                        { value: "si", label: "Ya pagado" },
                        { value: "mixto", label: "Mixto" },
                      ]}
                    />
                  </Form.Item>
                ) : (
                  <Input
                    value={
                      externalPaidStatus === "mixto"
                        ? "Mixto"
                        : externalPaidStatus === "si"
                          ? "Ya pagado"
                          : "No pagado"
                    }
                    readOnly
                  />
                )}
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Pago del vendedor registrado">
                <Input value={sellerPaymentLabel} readOnly />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Monto vendedor">
                {chargeEditing ? (
                  <Form.Item name="monto_paga_vendedor" noStyle>
                    <InputNumber
                      prefix="Bs."
                      min={0}
                      max={totalServicePrice}
                      precision={2}
                      disabled={editablePaidStatus !== "mixto"}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                ) : (
                  <Input value={`Bs. ${displayedSellerAmount.toFixed(2)}`} readOnly />
                )}
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Monto comprador">
                <Input value={`Bs. ${displayedBuyerAmount.toFixed(2)}`} readOnly />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Deuda comprador en el pedido">
                <Input value={`Bs. ${displayedBuyerDebt.toFixed(2)}`} readOnly />
              </Form.Item>
            </Col>
            {latePickupFee > 0 && (
              <Col span={12}>
                <Form.Item label="Multa por recojo tardio">
                  <Input value={`Bs. ${latePickupFee.toFixed(2)}`} readOnly style={{ backgroundColor: "#fff7e6", fontWeight: 700 }} />
                </Form.Item>
              </Col>
            )}
          </Row>
        </Card>

        <Card title="Entrega" bordered={false} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="estado_pedido" label="Estado del pedido" rules={[{ required: true }]}>
                <Radio.Group disabled={!canEditDelivery}>
                  <Radio.Button value="En Espera">En espera</Radio.Button>
                  <Radio.Button value="Entregado">Entregado</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          {shouldAskBuyerPayment && (
            <>
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item name="tipo_de_pago" label="Tipo de pago del comprador" rules={[{ required: true }]}>
                    <Radio.Group
                      disabled={!canEditDelivery}
                      onChange={(event) => handleBuyerPaymentTypeChange(event.target.value)}
                    >
                      <Radio.Button value="1">Transferencia o QR</Radio.Button>
                      <Radio.Button value="2">Efectivo</Radio.Button>
                      <Radio.Button value="4">Efectivo + QR</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Col>
              </Row>

              {tipoPagoEntrega === "1" && (
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item label="Subtotal QR">
                      <InputNumber
                        prefix="Bs."
                        value={buyerDebt}
                        readOnly
                        style={{ width: "100%", backgroundColor: "#fffbe6", fontWeight: "bold" }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              )}

              {tipoPagoEntrega === "2" && (
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item label="Subtotal efectivo">
                      <InputNumber
                        prefix="Bs."
                        value={buyerDebt}
                        readOnly
                        style={{ width: "100%", backgroundColor: "#fffbe6", fontWeight: "bold" }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              )}

              {tipoPagoEntrega === "4" && (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="subtotal_qr" label="Subtotal QR">
                      <InputNumber
                        prefix="Bs."
                        min={0.01}
                        max={Math.max(0, roundCurrency(buyerDebt - 0.01))}
                        precision={2}
                        style={{ width: "100%" }}
                        disabled={!canEditDelivery}
                        onChange={handleSubtotalQrChange}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="subtotal_efectivo" label="Subtotal efectivo">
                      <InputNumber
                        prefix="Bs."
                        value={subtotalEfectivo}
                        readOnly
                        style={{ width: "100%", backgroundColor: "#fffbe6", fontWeight: "bold" }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              )}
            </>
          )}

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="Monto comprador a registrar">
                <Input value={`Bs. ${buyerDebt.toFixed(2)}`} readOnly />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <div style={{ marginTop: 16, textAlign: "right" }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Cerrar
          </Button>
          {canEditDelivery && (
            <Button type="primary" htmlType="submit" loading={loading}>
              Guardar cambios
            </Button>
          )}
        </div>
      </Form>
    </Modal>
  );
};

export default ExternalShippingInfoModal;
