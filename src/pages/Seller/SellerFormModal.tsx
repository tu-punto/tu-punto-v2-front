import {
  Modal,
  Form,
  Input,
  InputNumber,
  Button,
  DatePicker,
  message,
  Col,
  Row,
  Checkbox,
  Radio,
} from "antd";
import {
  UserOutlined,
  PhoneOutlined,
  IdcardOutlined,
  MailOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { registerSellerAPI } from "../../api/seller";
import { useState } from "react";
import { sellerModel } from "../../models/sellerModels";
import { registerFinanceFluxAPI } from "../../api/financeFlux";
import { roles } from "../../constants/roles";
import { registerUserAPI } from "../../api/user";

function SellerFormModal({ visible, onCancel, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const { SELLER } = roles;

  const handleFinish = async (sellerData: sellerModel) => {
    setLoading(true);
    const newUser = {
      email: sellerData.mail,
      password: `${sellerData.carnet}`,
      role: SELLER,
    };
    const userResponse = await registerUserAPI(newUser);
    if (!userResponse?.success) {
      message.error("Error al crear la cuenta del vendedor");
      setLoading(false);
      return;
    }
    const sellerResponse = await registerSellerAPI(sellerData);
    if (!sellerResponse.status) {
      message.error("Error al registrar el vendedor");
      setLoading(false);
      return;
    }

    message.success("Vendedor registrado con éxito");
    const newSeller = sellerResponse.newSeller;
    const montoFinanceFlux =
      parseInt(newSeller.alquiler) +
      parseInt(newSeller.exhibicion) +
      parseInt(newSeller.delivery);

    const financeFluxData = {
      id_vendedor: parseInt(newSeller.id_vendedor),
      categoria: "RENOVACION",
      tipo: "INGRESO",
      concepto: `Vendedor ${newSeller.nombre} ${newSeller.apellido} - ${newSeller.marca} renovado`,
      monto: montoFinanceFlux,
    };

    const resFinanceFlux = await registerFinanceFluxAPI(financeFluxData);
    if (!resFinanceFlux.status) {
      message.error(
        `Error al registrar el ingreso con monto Bs. ${montoFinanceFlux}`
      );
    }
    message.success("Ingreso registrado con éxito");
    onSuccess();
    setLoading(false);
  };

  return (
    <Modal
      title="Agregar vendedor"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
    >
      <Form name="sellerForm" onFinish={handleFinish} layout="vertical">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="nombre"
              label="Nombres"
              rules={[{ required: true, message: "Este campo es obligatorio" }]}
            >
              <Input prefix={<UserOutlined />} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="apellido"
              label="Apellidos"
              rules={[{ required: true, message: "Este campo es obligatorio" }]}
            >
              <Input prefix={<UserOutlined />} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Form.Item name="marca" label="Marca">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="telefono"
              label="Teléfono"
              rules={[{ required: true, message: "Este campo es obligatorio" }]}
            >
              <Input prefix={<PhoneOutlined />} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="emite_factura"
              label="¿Emite factura?"
              rules={[{ required: true, message: "Este campo es obligatorio" }]}
            >
              <Radio.Group>
                <Radio.Button value={true}>SI</Radio.Button>
                <Radio.Button value={false}>NO</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Form.Item
              name="carnet"
              label="Carnet"
              tooltip="El número de carnet será la contraseña para la cuenta del vendedor"
            >
              <InputNumber
                style={{ width: "100%" }}
                prefix={<IdcardOutlined />}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={16}>
            <Form.Item name="direccion" label="Dirección">
              <Input prefix={<HomeOutlined />} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item name="mail" label="Mail">
              <Input prefix={<MailOutlined />} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={6}>
            <Form.Item name="alquiler" label="Alquiler">
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="exhibicion" label="Exhibición">
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="delivery" label="Delivery">
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="adelanto_servicio" label="Adelanto Servicio">
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Form.Item name="comision_porcentual" label="Comisión porcentual">
              <InputNumber
                style={{ width: "100%" }}
                formatter={(value) => `${value}%`}
                min={0}
                max={100}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="comision_fija" label="Comisión Fija">
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item
              name="comentario"
              label="Comentario"
              rules={[{ required: true, message: "Este campo es obligatorio" }]}
            >
              <Input.TextArea rows={1} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="fecha_vigencia"
              label="Fecha Final de Servicio"
              rules={[{ required: true, message: "Este campo es obligatorio" }]}
            >
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            className="text-mobile-sm xl:text-desktop-sm"
          >
            Guardar
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default SellerFormModal;
