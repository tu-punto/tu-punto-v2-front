import { useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Form, Input, InputNumber, Modal, Radio, Row, message } from "antd";
import { updateExternalSaleAPI } from "../../api/externalSale";

interface ExternalShippingInfoModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  externalShipping: any;
  isAdmin: boolean;
}

const roundCurrency = (value: number) => +Number(value || 0).toFixed(2);

const ExternalShippingInfoModal = ({
  visible,
  onClose,
  onSaved,
  externalShipping,
  isAdmin,
}: ExternalShippingInfoModalProps) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const packagePrice = useMemo(
    () => Number(externalShipping?.precio_paquete ?? externalShipping?.precio_total ?? 0),
    [externalShipping]
  );
  const shippingPrice = useMemo(
    () => Number(externalShipping?.precio_entre_sucursal ?? externalShipping?.cargo_delivery ?? 0),
    [externalShipping]
  );
  const packageSaldo = useMemo(() => Number(externalShipping?.saldo_por_paquete ?? 0), [externalShipping]);
  const totalServicePrice = useMemo(
    () => Number(externalShipping?.precio_total ?? packagePrice + shippingPrice),
    [externalShipping, packagePrice, shippingPrice]
  );
  const serviceLabel = String(externalShipping?.service_origin || "") === "simple_package" ? "Simple" : "Externo";

  const paidStatus = Form.useWatch("esta_pagado", form);
  const montoPagaVendedor = Number(Form.useWatch("monto_paga_vendedor", form) || 0);
  const montoPagaComprador = Number(Form.useWatch("monto_paga_comprador", form) || 0);
  const saldoACobrar = useMemo(() => {
    if (paidStatus === "si") return 0;
    if (paidStatus === "mixto") return Math.max(0, roundCurrency(montoPagaComprador));
    return packagePrice;
  }, [paidStatus, packagePrice, montoPagaComprador, montoPagaVendedor]);

  const applyPaymentMode = (mode: "si" | "no" | "mixto", notifyPriceRequired = false) => {
    if (packagePrice <= 0 && mode !== "no") {
      if (notifyPriceRequired) message.warning("Primero ingresa un precio del paquete valido");
      form.setFieldValue("esta_pagado", "no");
      form.setFieldValue("monto_paga_vendedor", 0);
      form.setFieldValue("monto_paga_comprador", 0);
      return;
    }

    if (mode === "si") {
      form.setFieldValue("monto_paga_vendedor", 0);
      form.setFieldValue("monto_paga_comprador", roundCurrency(packagePrice));
      return;
    }

    if (mode === "no") {
      form.setFieldValue("monto_paga_vendedor", 0);
      form.setFieldValue("monto_paga_comprador", 0);
      return;
    }

    const half = roundCurrency(packagePrice / 2);
    form.setFieldValue("monto_paga_vendedor", half);
    form.setFieldValue("monto_paga_comprador", roundCurrency(packagePrice - half));
  };

  const handleMixedSellerChange = (value: number | null) => {
    if (paidStatus !== "mixto") return;
    if (packagePrice <= 0) {
      form.setFieldValue("monto_paga_vendedor", 0);
      form.setFieldValue("monto_paga_comprador", 0);
      return;
    }
    let seller = roundCurrency(Number(value || 0));
    if (seller < 0) seller = 0;
    if (seller > packagePrice) seller = packagePrice;

    form.setFieldValue("monto_paga_vendedor", seller);
    form.setFieldValue("monto_paga_comprador", roundCurrency(packagePrice - seller));
  };

  useEffect(() => {
    if (!visible || !externalShipping) return;
    const initialStatus = (externalShipping.esta_pagado || "no") as "si" | "no" | "mixto";
    const initialVendedor = roundCurrency(Number(externalShipping.monto_paga_vendedor || 0));
    const initialComprador = roundCurrency(Number(externalShipping.monto_paga_comprador || 0));
    let montoVendedor = initialVendedor;
    let montoComprador = initialComprador;

    if (initialStatus === "si") {
      montoVendedor = 0;
      montoComprador = roundCurrency(packagePrice);
    } else if (initialStatus === "no") {
      montoVendedor = 0;
      montoComprador = 0;
    } else {
      const mixedSum = roundCurrency(initialVendedor + initialComprador);
      if (mixedSum <= 0 || Math.abs(mixedSum - packagePrice) > 0.01) {
        const half = roundCurrency(packagePrice / 2);
        montoVendedor = half;
        montoComprador = roundCurrency(packagePrice - half);
      }
    }

    form.setFieldsValue({
      carnet_vendedor: externalShipping.carnet_vendedor || "",
      vendedor: externalShipping.vendedor || "",
      telefono_vendedor: externalShipping.telefono_vendedor || "",
      comprador: externalShipping.comprador || "",
      telefono_comprador: externalShipping.telefono_comprador || "",
      descripcion_paquete: externalShipping.descripcion_paquete || "",
      precio_paquete: packagePrice,
      esta_pagado: initialStatus,
      monto_paga_vendedor: montoVendedor,
      monto_paga_comprador: montoComprador,
      estado_pedido: externalShipping.estado_pedido || "En Espera",
      saldo_cobrar: Number(externalShipping.saldo_cobrar ?? saldoACobrar),
    });
  }, [externalShipping, form, packagePrice, visible]);

  const handleSave = async (values: any) => {
    if (!externalShipping?._id) return;
    setLoading(true);
    try {
      if (values.esta_pagado === "mixto") {
        const precio = roundCurrency(Number(values.precio_paquete || packagePrice || 0));
        const pagoVendedor = roundCurrency(Number(values.monto_paga_vendedor || 0));
        const pagoComprador = roundCurrency(Number(values.monto_paga_comprador || 0));
        const sumaMixta = roundCurrency(pagoVendedor + pagoComprador);

        if (precio <= 0) {
          message.error("Para pago mixto el precio del paquete debe ser mayor a 0");
          return;
        }
        if (pagoVendedor <= 0 || pagoComprador <= 0) {
          message.error("En pago mixto ambos deben pagar un monto mayor a 0");
          return;
        }
        if (pagoVendedor >= precio || pagoComprador >= precio) {
          message.error("En pago mixto ninguna parte puede pagar todo el paquete");
          return;
        }
        if (Math.abs(sumaMixta - precio) > 0.01) {
          message.error("En pago mixto la suma debe ser igual al precio del paquete");
          return;
        }
      }

      const payload = {
        esta_pagado: values.esta_pagado,
        monto_paga_vendedor: Number(values.monto_paga_vendedor || 0),
        monto_paga_comprador: Number(values.monto_paga_comprador || 0),
        estado_pedido: values.estado_pedido,
        saldo_cobrar: saldoACobrar,
        delivered: values.estado_pedido === "Entregado",
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
      title={`Detalle ${serviceLabel} ${externalShipping?._id || ""}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={860}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Card title="Informacion del Vendedor" bordered={false}>
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
              <Form.Item label="Saldo del paquete">
                <Input value={`Bs. ${packageSaldo.toFixed(2)}`} readOnly />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Precio del envio">
                <Input value={`Bs. ${shippingPrice.toFixed(2)}`} readOnly />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Precio total del servicio">
                <Input value={`Bs. ${totalServicePrice.toFixed(2)}`} readOnly />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Detalles del Pago" bordered={false} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="esta_pagado" label="Esta pagado" rules={[{ required: true }]}>
                <Radio.Group
                  disabled={!isAdmin}
                  onChange={(event) => applyPaymentMode(event.target.value, true)}
                >
                  <Radio.Button value="si">Si</Radio.Button>
                  <Radio.Button value="no">No</Radio.Button>
                  <Radio.Button value="mixto">Mixto</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>
          {paidStatus === "mixto" && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="monto_paga_vendedor" label="Cuanto paga vendedor">
                  <InputNumber
                    min={0}
                    max={Math.max(0, roundCurrency(packagePrice - 0.01))}
                    precision={2}
                    prefix="Bs."
                    style={{ width: "100%" }}
                    disabled={!isAdmin}
                    onChange={handleMixedSellerChange}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="monto_paga_comprador" label="Cuanto paga comprador">
                  <InputNumber min={0} precision={2} prefix="Bs." style={{ width: "100%" }} disabled />
                </Form.Item>
              </Col>
            </Row>
          )}
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
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="Saldo a cobrar">
                <Input value={`Bs. ${saldoACobrar.toFixed(2)}`} readOnly />
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
