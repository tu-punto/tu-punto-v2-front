import { useEffect, useMemo, useState } from "react";
import { PrinterOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { Button, Card, Col, Form, Input, InputNumber, Modal, Radio, Row, Select, Space, message } from "antd";
import { sendExternalGuideWhatsappAPI, updateExternalSaleAPI } from "../../api/externalSale";
import { createPixelConfig, qzPrint, resolvePreferredQzPrinter } from "../../utils/qzTray";
import {
  buildDirectShippingLabelImageData,
  DEFAULT_SHIPPING_LABEL_PRINT_OPTIONS,
  ShippingLabelPrintOptions,
  toBase64Png,
} from "./shippingQrLabel";

interface ExternalShippingInfoModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  externalShipping: any;
  isAdmin: boolean;
  canSendGuideWhatsapp: boolean;
}

const roundCurrency = (value: number) => +Number(value || 0).toFixed(2);

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
  ticketWidthMm:
    Number(localStorage.getItem("shippingLabelTicketWidthMm")) ||
    DEFAULT_SHIPPING_LABEL_PRINT_OPTIONS.ticketWidthMm,
  qrSizeMm:
    Number(localStorage.getItem("shippingLabelQrSizeMm")) ||
    DEFAULT_SHIPPING_LABEL_PRINT_OPTIONS.qrSizeMm,
  printDelayMs:
    Number(localStorage.getItem("shippingLabelPrintDelayMs")) ||
    DEFAULT_SHIPPING_LABEL_PRINT_OPTIONS.printDelayMs,
});

const persistLabelPrintOptions = (options: ShippingLabelPrintOptions) => {
  localStorage.setItem("shippingLabelTicketWidthMm", String(options.ticketWidthMm));
  localStorage.setItem("shippingLabelQrSizeMm", String(options.qrSizeMm));
  localStorage.setItem("shippingLabelPrintDelayMs", String(options.printDelayMs));
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
  const [printingQr, setPrintingQr] = useState(false);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);

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
  const buyerDebt = useMemo(
    () =>
      roundCurrency(
        Number(
          externalShipping?.deuda_comprador ??
            externalShipping?.monto_paga_comprador ??
            externalShipping?.saldo_cobrar ??
            totalAmountToCharge
        )
      ),
    [externalShipping, totalAmountToCharge]
  );
  const serviceLabel = isSimplePackage ? "Simple" : "Externo";

  const estadoPedido = Form.useWatch("estado_pedido", form);
  const tipoPagoEntrega = Form.useWatch("tipo_de_pago", form);
  const subtotalEfectivo = Number(Form.useWatch("subtotal_efectivo", form) || 0);
  const shouldAskBuyerPayment = estadoPedido === "Entregado" && buyerDebt > 0;

  const externalPaidStatus = String(externalShipping?.esta_pagado || "no").trim().toLowerCase();
  const sellerPaymentLabel =
    String(externalShipping?.metodo_pago || "").trim().toLowerCase() === "qr"
      ? "QR"
      : String(externalShipping?.metodo_pago || "").trim().toLowerCase() === "efectivo"
        ? "Efectivo"
        : "Sin registro";
  const sellerAmount = roundCurrency(Number(externalShipping?.monto_paga_vendedor || 0));
  const buyerAmount = roundCurrency(Number(externalShipping?.monto_paga_comprador || 0));

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

  const handlePrintExternalQRDirect = async (options: ShippingLabelPrintOptions) => {
    if (!externalShipping?.numero_guia) {
      message.warning("Esta entrega no tiene numero de guia para imprimir");
      return;
    }

    setPrintingQr(true);
    try {
      const printerName = await resolvePreferredQzPrinter();
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

      message.success("Etiqueta enviada a la impresora");
    } catch (error) {
      console.error(error);
      message.error("No se pudo imprimir. Revisa QZ Tray o la impresora.");
    } finally {
      setPrintingQr(false);
    }
  };

  const handleOpenPrintOptions = () => {
    const draftOptions = getStoredLabelPrintOptions();

    Modal.confirm({
      title: `Imprimir etiqueta ${serviceLabel.toLowerCase()}`,
      content: (
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
      ),
      okText: "Imprimir",
      cancelText: "Cancelar",
      onOk: async () => {
        persistLabelPrintOptions(draftOptions);
        await handlePrintExternalQRDirect(draftOptions);
      },
    });
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
      estado_pedido: externalShipping.estado_pedido || "En Espera",
      tipo_de_pago: nextDeliveryType,
      subtotal_qr: nextSubtotalQr,
      subtotal_efectivo: nextSubtotalEfectivo,
    });
  }, [buyerDebt, externalShipping, form, packagePrice, visible]);

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
          onClick={handleOpenPrintOptions}
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
                <Input readOnly />
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

        <Card title="Resumen del Cobro" bordered={false} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Estado inicial del cobro">
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
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Pago del vendedor registrado">
                <Input value={sellerPaymentLabel} readOnly />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Monto vendedor">
                <Input value={`Bs. ${sellerAmount.toFixed(2)}`} readOnly />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Monto comprador">
                <Input value={`Bs. ${buyerAmount.toFixed(2)}`} readOnly />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Deuda comprador en el pedido">
                <Input value={`Bs. ${buyerDebt.toFixed(2)}`} readOnly />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Entrega" bordered={false} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="estado_pedido" label="Estado del pedido" rules={[{ required: true }]}>
                <Radio.Group disabled={!isAdmin}>
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
                      disabled={!isAdmin}
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
                        disabled={!isAdmin}
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
          {isAdmin && (
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
