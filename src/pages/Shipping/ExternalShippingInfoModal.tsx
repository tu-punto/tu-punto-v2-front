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

  const paidStatus = Form.useWatch("esta_pagado", form);
  const saldoACobrar = paidStatus === "si" ? 0 : packagePrice;

  useEffect(() => {
    if (!visible || !externalShipping) return;
    form.setFieldsValue({
      carnet_vendedor: externalShipping.carnet_vendedor || "",
      vendedor: externalShipping.vendedor || "",
      telefono_vendedor: externalShipping.telefono_vendedor || "",
      comprador: externalShipping.comprador || "",
      telefono_comprador: externalShipping.telefono_comprador || "",
      descripcion_paquete: externalShipping.descripcion_paquete || "",
      precio_paquete: packagePrice,
      esta_pagado: externalShipping.esta_pagado || "no",
      estado_pedido: externalShipping.estado_pedido || "En Espera",
      saldo_cobrar: Number(externalShipping.saldo_cobrar ?? saldoACobrar),
    });
  }, [externalShipping, form, packagePrice, saldoACobrar, visible]);

  const handleSave = async (values: any) => {
    if (!externalShipping?._id) return;
    setLoading(true);
    try {
      const payload = {
        esta_pagado: values.esta_pagado,
        estado_pedido: values.estado_pedido,
        saldo_cobrar: values.esta_pagado === "si" ? 0 : packagePrice,
        delivered: values.estado_pedido === "Entregado",
      };

      const response = await updateExternalSaleAPI(externalShipping._id, payload);
      if (!response.success) {
        message.error(response.message || "No se pudo actualizar la entrega externa");
        return;
      }

      message.success("Entrega externa actualizada");
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
      title={`Detalle Externo ${externalShipping?._id || ""}`}
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
            <Col span={12}>
              <Form.Item label="Precio del paquete" name="precio_paquete">
                <InputNumber prefix="Bs." style={{ width: "100%" }} readOnly />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Detalles del Pago" bordered={false} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="esta_pagado" label="Esta pagado" rules={[{ required: true }]}>
                <Radio.Group disabled={!isAdmin}>
                  <Radio.Button value="si">Si</Radio.Button>
                  <Radio.Button value="no">No</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>
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
