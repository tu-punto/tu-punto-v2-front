//  src/pages/Seller/SellerFormModal.tsx
import {
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Button,
  Row,
  Col,
  Radio,
  Card,
  message,
} from "antd";
import {
  PhoneOutlined,
  UserOutlined,
  MailOutlined,
  HomeOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import dayjs from "dayjs";

import { registerSellerAPI } from "../../api/seller";
import { registerUserAPI } from "../../api/user";
import { getSucursalsAPI } from "../../api/sucursal";
import { roles } from "../../constants/roles";
import BranchFields from "./components/BranchFields";

const { SELLER } = roles;

export default function SellerFormModal({
  visible,
  onCancel,
  onSuccess,
}: {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sucursalOptions, setSucursalOptions] = useState<any[]>([]);

  /* cargar sucursales al abrir */
  useEffect(() => {
    if (visible) {
      (async () => {
        const res = await getSucursalsAPI();
        setSucursalOptions(res || []);
        form.resetFields();
        form.setFieldsValue({ sucursales: [{}] });
      })();
    }
  }, [visible]);

  /* añadir card */
  const addBranch = () => {
    const list = form.getFieldValue("sucursales") || [];
    if (list.length >= sucursalOptions.length) {
      return message.warning("Ya agregaste todas las sucursales");
    }
    form.setFieldsValue({ sucursales: [...list, {}] });
  };

  /* submit (alta) */
  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // 1· alta de usuario
      await registerUserAPI({
        email: values.mail,
        password: `${values.carnet}`,
        role: SELLER,
      });

      // 2· mapear payload para backend
      const payload = {
        ...values,
        fecha_vigencia: dayjs(values.fecha_vigencia).toISOString(),
        pago_sucursales: values.sucursales.map((s: any) => ({
          id_sucursal: s.id_sucursal,
          sucursalName: sucursalOptions.find((opt) => opt._id === s.id_sucursal)?.nombre || "",
          alquiler: s.alquiler ?? 0,
          exhibicion: s.exhibicion ?? 0,
          delivery: s.delivery ?? 0,
          entrega_simple: s.entrega_simple ?? 0,
        })),
        esDeuda: true, // alta siempre entra como deuda
      };

      await registerSellerAPI(payload);
      message.success("Vendedor registrado");
      onSuccess();
    } catch {
      message.error("Error al registrar vendedor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={900}
      destroyOnClose
      title="Agregar vendedor"
    >
      <Form layout="vertical" form={form} onFinish={onFinish}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Nombres"
              name="nombre"
              rules={[{ required: true }]}
            >
              <Input prefix={<UserOutlined />} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Apellidos"
              name="apellido"
              rules={[{ required: true }]}
            >
              <Input prefix={<UserOutlined />} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Marca" name="marca">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Teléfono"
              name="telefono"
              rules={[{ required: true }]}
            >
              <Input prefix={<PhoneOutlined />} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="¿Emite factura?"
              name="emite_factura"
              rules={[{ required: true }]}
            >
              <Radio.Group>
                <Radio.Button value={true}>SI</Radio.Button>
                <Radio.Button value={false}>NO</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={6}>
            <Form.Item
              label="Carnet"
              name="carnet"
              tooltip="El número de carnet será la contraseña"
              rules={[{ required: true }]}
            >
              <InputNumber className="w-full" />
            </Form.Item>
          </Col>
          <Col xs={24} md={18}>
            <Form.Item label="Dirección" name="direccion">
              <Input prefix={<HomeOutlined />} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="Mail"
              name="mail"
              rules={[{ required: true, type: "email" }]}
            >
              <Input prefix={<MailOutlined />} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Comisión porcentual" name="comision_porcentual">
              <InputNumber min={0} max={100} formatter={(v) => `${v}%`} className="w-full" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="Comentario" name="comentario">
              <Input.TextArea rows={1} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Fecha final de servicio"
              name="fecha_vigencia"
              rules={[{ required: true }]}
            >
              <DatePicker className="w-full" />
            </Form.Item>
          </Col>
        </Row>

        <Row justify="space-between" align="middle">
          <Col>
            <h3>Sucursales</h3>
          </Col>
          <Col>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={addBranch}
              disabled={
                (form.getFieldValue("sucursales") || []).length >=
                sucursalOptions.length
              }
            >
              Añadir sucursal
            </Button>
          </Col>
        </Row>

        <Form.List name="sucursales">
          {(fields, { remove }) => (
            <>
              {fields.map((field) => (
                <Card key={field.key} style={{ marginTop: 16 }}>
                  <BranchFields
                    field={field}
                    remove={remove}
                    sucursalOptions={sucursalOptions}
                  />
                </Card>
              ))}
            </>
          )}
        </Form.List>

        <Form.Item className="mt-6">
          <Button type="primary" htmlType="submit" loading={loading}>
            Guardar
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
