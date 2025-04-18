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
  Radio,
  Card,
  Select,
} from "antd";
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { registerSellerAPI } from "../../api/seller";
import { useEffect, useState } from "react";
import { ISeller } from "../../models/sellerModels";
import { registerFinanceFluxAPI } from "../../api/financeFlux";
import { roles } from "../../constants/roles";
import { registerUserAPI } from "../../api/user";
import { getSucursalsAPI } from "../../api/sucursal";
import { IBranch } from "../../models/branchModel";

function SellerFormModal({ visible, onCancel, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [branches, setBranches] = useState([{ key: Date.now() }]);
  const [sucursalOptions, setSucursalOptions] = useState<IBranch[]>([]);

  const { SELLER } = roles;

  useEffect(() => {
    form.setFieldsValue({ sucursales: [] });
    const fetchSucursals = async () => {
      try {
        const res = await getSucursalsAPI()
        setSucursalOptions(res)
      } catch (error) {
        message.error('Error al obtener las sucursales')

      }
    };
    fetchSucursals();
  }, []);

  const handleFinish = async (sellerData: ISeller & { sucursales: any[] }) => {
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

    // Calcular monto total desde las sucursales
    const montoFinanceFlux = sellerData.sucursales.reduce((total, sucursal) => {
      const alquiler = parseInt(sucursal.alquiler )|| 0;
      const exhibicion = parseInt(sucursal.exhibicion )|| 0;
      const delivery = parseInt(sucursal.delivery )|| 0;
      const entrega_simple = parseInt(sucursal.entrega_simple) || 0;
      return total + alquiler + exhibicion + delivery + entrega_simple;
    }, 0);

    const financeFluxData = {
      id_vendedor: (newSeller._id),
      categoria: "RENOVACION",
      tipo: "INGRESO",
      concepto: `Vendedor ${newSeller.nombre} ${newSeller.apellido} - ${newSeller.marca} renovado`,
      monto: montoFinanceFlux,
    };

    const resFinanceFlux = await registerFinanceFluxAPI(financeFluxData);
    if (!resFinanceFlux.status) {
      message.error(`Error al registrar el ingreso con monto Bs. ${montoFinanceFlux}`);
    } else {
      message.success("Ingreso registrado con éxito");
    }

    onSuccess();
    setLoading(false);
  };

  const addBranch = () => {
    setBranches([...branches, { key: Date.now() }]);
  };

  const removeBranch = (key: number) => {
    setBranches(branches.filter((b) => b.key !== key));
  };

  return (
      <Modal
          title="Agregar vendedor"
          open={visible}
          onCancel={onCancel}
          footer={null}
          width={900}
      >
        <Form form={form} name="sellerForm" onFinish={handleFinish} layout="vertical">
          {/* Info personal */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item name="nombre" label="Nombres" rules={[{ required: true }]}>
                <Input prefix={<UserOutlined />} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="apellido" label="Apellidos" rules={[{ required: true }]}>
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
              <Form.Item name="telefono" label="Teléfono" rules={[{ required: true }]}>
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
            <Col xs={24} sm={6}>
              <Form.Item
                  name="carnet"
                  label="Carnet"
                  tooltip="El número de carnet será la contraseña"
                  rules={[{ required: true }]}
              >
                <InputNumber style={{ width: "100%" }} />
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
            <Col xs={24} sm={12}>
              <Form.Item name="comision_porcentual" label="Comisión porcentual">
                <InputNumber style={{ width: "100%" }} formatter={(v) => `${v}%`} min={0} max={100} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Form.Item name="comentario" label="Comentario">
                <Input.TextArea rows={1} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                  name="fecha_vigencia"
                  label="Fecha Final de Servicio"
                  rules={[{ required: true }]}
              >
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          {/* Botón para agregar sucursales */}
          <Row>
            <Col span={24}>
              <h3>Sucursales</h3>
              <Button type="dashed" onClick={addBranch} icon={<PlusOutlined />}>
                Añadir Sucursal
              </Button>
            </Col>
          </Row>

          <br />

          {branches.map((branch, index) => (
              <Card
                  key={branch.key}
                  title={`Sucursal ${index + 1}`}
                  style={{ marginBottom: 16 }}
                  extra={
                      branches.length > 1 && (
                          <Button
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => removeBranch(branch.key)}
                          />
                      )
                  }
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                        name='_id'
                        label="Sucursal"
                        rules={[{ required: true, message: 'Por favor seleccione una sucursal' }]}
                    >
                      <Select
                          placeholder='Selecciona una sucursal'
                          options={sucursalOptions.map((branch: any) => ({
                            value: branch._id,
                            label: branch.nombre
                          }))}
                          showSearch
                          filterOption={(input, option: any) =>
                              option.label.toLocaleLowerCase().includes(input.toLocaleLowerCase())}
                      />

                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={6}>
                    <Form.Item name={["sucursales", index, "alquiler"]} label="Alquiler">
                      <InputNumber style={{ width: "100%" }} min={0} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={6}>
                    <Form.Item name={["sucursales", index, "exhibicion"]} label="Exhibición">
                      <InputNumber style={{ width: "100%" }} min={0} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={6}>
                    <Form.Item name={["sucursales", index, "delivery"]} label="Delivery">
                      <InputNumber style={{ width: "100%" }} min={0} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={6}>
                    <Form.Item name={["sucursales", index, "entrega_simple"]} label="Entrega Simple">
                      <InputNumber style={{ width: "100%" }} min={0} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
          ))}

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Guardar
            </Button>
          </Form.Item>
        </Form>
      </Modal>
  );
}

export default SellerFormModal;
