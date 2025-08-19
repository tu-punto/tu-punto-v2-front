import {
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Radio,
  Row,
  Select,
} from "antd";
import { CommentOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import {
  registerFinanceFluxAPI,
  updateFinanceFluxAPI,
} from "../../api/financeFlux";
import { getWorkersAPI } from "../../api/worker";
import { getSellersAPI, registerSellerAPI } from "../../api/seller";
import { getSucursalsAPI } from "../../api/sucursal";
import { useFinanceFluxCategoryStore } from "../../stores/financeFluxCategoriesStore";

function FinanceFluxFormModal({
  visible,
  onCancel,
  onSuccess,
  editingFlux,
}: any) {
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [sucursals, setSucursals] = useState([]);
  const [newSeller, setNewSeller] = useState("");
  const [newFluxCategory, setNewFluxCategory] = useState("");
  const [form] = Form.useForm();

  const fluxCategories = useFinanceFluxCategoryStore(
    (state) => state.fluxCategories
  );

  const createFluxCategory = useFinanceFluxCategoryStore(
    (state) => state.createFluxCategory
  );

  const handleFinish = async (financeFluxData: any) => {
    setLoading(true);

    const payload = {
      ...financeFluxData,
      fecha: financeFluxData.fecha?.toDate()?.toISOString(),
    };
    if (payload.id_vendedor === "") {
      delete payload.id_vendedor;
    }
    if (payload.id_sucursal === "") {
      delete payload.id_sucursal;
    }

    try {
      const response = editingFlux
        ? await updateFinanceFluxAPI(editingFlux.id_flujo_financiero, payload)
        : await registerFinanceFluxAPI(payload);

      if (response.status || response.ok) {
        message.success(
          editingFlux
            ? "Flujo actualizado con éxito"
            : "Gasto o ingreso registrado con éxito"
        );
        onSuccess();
      } else {
        throw new Error();
      }
    } catch (error) {
      message.error("Error al guardar el flujo financiero");
    } finally {
      if (!editingFlux) {
        form.resetFields();
      }
      setLoading(false);
    }
  };

  const createSeller = async () => {
    if (!newSeller) return;
    setLoading(true);
    const response = await registerSellerAPI({ vendedor: newSeller });
    setLoading(false);
    if (response.status) {
      message.success("Vendedor creado con éxito");
      fetchSellers();
      setNewSeller("");
    } else {
      message.error("Error al crear Vendedor");
    }
  };

  const fetchWorkers = async () => {
    try {
      const response = await getWorkersAPI();
      setWorkers(response);
    } catch (error) {
      message.error("Error al obtener los trabajadores");
    }
  };

  const fetchSellers = async () => {
    try {
      const response = await getSellersAPI();
      setSellers(response);
    } catch (error) {
      message.error("Error al obtener los vendedores");
    }
  };

  const fetchSucursals = async () => {
    try {
      const response = await getSucursalsAPI();
      setSucursals(response);
    } catch (error) {
      message.error("Error al obtener las sucursales");
    }
  };

  const handleTipoChange = () => {
    form.validateFields(["_id"]);
  };

  useEffect(() => {
    fetchWorkers();
    fetchSellers();
    fetchSucursals();
  }, []);

  useEffect(() => {
    if (editingFlux) {
      const sellerId = editingFlux.id_vendedor;
      const sucursalId = editingFlux.id_sucursal;
      form.setFieldsValue({
        ...editingFlux,
        fecha: editingFlux.fecha ? dayjs(editingFlux.fecha) : null,
        id_vendedor: sellerId ? sellerId._id : "",
        id_trabajador: editingFlux.id_trabajador,
        id_sucursal: sucursalId ? sucursalId._id : "",
        esDeuda: editingFlux.esDeuda == "SI" ? true : false,
      });
    } else {
      form.resetFields();
      const currentSucursal = localStorage.getItem("sucursalId");
      if (currentSucursal) {
        form.setFieldValue("id_sucursal", currentSucursal);
      }
    }
  }, [editingFlux, form]);

  return (
    <Modal
      title="Agregar Gasto o Ingreso"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
    >
      <Form
        name="financeFluxForm"
        onFinish={handleFinish}
        layout="vertical"
        form={form}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="tipo"
              label="Tipo"
              rules={[{ required: true, message: "Este campo es obligatorio" }]}
            >
              <Radio.Group onChange={handleTipoChange}>
                <Radio.Button value="GASTO">Gasto</Radio.Button>
                <Radio.Button value="INGRESO">Ingreso</Radio.Button>
                <Radio.Button value="INVERSION">Inversion</Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="categoria"
              label="Categoria"
              rules={[{ required: true, message: "Este campo es obligatorio" }]}
            >
              <Select
                allowClear
                showSearch
                placeholder="Selecciona una categoría"
                options={fluxCategories.map((fluxCategory) => ({
                  value: fluxCategory.nombre,
                  label: fluxCategory.nombre,
                }))}
                filterOption={(input, option: any) =>
                  option.label.toLowerCase().includes(input.toLowerCase())
                }
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <div style={{ display: "flex", padding: 8 }}>
                      <Input
                        style={{ flex: "auto" }}
                        value={newFluxCategory}
                        onChange={(e) => setNewFluxCategory(e.target.value)}
                      />
                      <Button
                        type="link"
                        onClick={async () => {
                          await createFluxCategory({ nombre: newFluxCategory });
                          setNewFluxCategory("");
                        }}
                        loading={loading}
                      >
                        Añadir categoría
                      </Button>
                    </div>
                  </>
                )}
              />
            </Form.Item>

            <Form.Item
              name="fecha"
              label="Fecha"
              rules={[{ required: true, message: "Este campo es obligatorio" }]}
            >
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              name="concepto"
              label="Concepto"
              rules={[{ required: true, message: "Este campo es obligatorio" }]}
            >
              <Input prefix={<CommentOutlined />} />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item name="id_sucursal" label="Sucursal">
              <Select
                placeholder="Selecciona una sucursal (opcional)"
                allowClear
                options={sucursals.map((sucursal: any) => ({
                  value: sucursal._id,
                  label: sucursal.nombre,
                }))}
                showSearch
                filterOption={(input, option: any) =>
                  option.label.toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>

            <Form.Item name="id_vendedor" label="Vendedor">
              <Select
                placeholder="Selecciona un vendedor"
                allowClear
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <div style={{ display: "flex", padding: 8 }}>
                      <Input
                        style={{ flex: "auto" }}
                        value={newSeller}
                        onChange={(e) => setNewSeller(e.target.value)}
                      />
                      <Button
                        type="link"
                        onClick={createSeller}
                        loading={loading}
                      >
                        Añadir vendedor
                      </Button>
                    </div>
                  </>
                )}
                options={sellers.map((seller: any) => ({
                  value: seller._id,
                  label: seller.nombre + " " + seller.apellido,
                }))}
                showSearch
                filterOption={(input, option: any) =>
                  option.label.toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>

            <Form.Item
              name="esDeuda"
              label="¿Es deuda?"
              rules={[{ required: true, message: "Este campo es obligatorio" }]}
            >
              <Radio.Group>
                <Radio value={true}>Sí</Radio>
                <Radio value={false}>No</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="monto"
              label="Monto"
              rules={[{ required: true, message: "Este campo es obligatorio" }]}
              initialValue={0.0}
            >
              <InputNumber prefix={"Bs. "} style={{ width: "100%" }} min={0} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="id_trabajador"
              label="Founder"
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (getFieldValue("tipo") === "Inversion" && !value) {
                      return Promise.reject(
                        new Error("Este campo es obligatorio")
                      );
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <Select
                placeholder="Selecciona un Founder"
                allowClear
                options={workers.map((worker: any) => ({
                  value: worker._id,
                  label: worker.nombre,
                }))}
                showSearch
                filterOption={(input, option: any) =>
                  option.label.toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginTop: 24 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            size="large"
          >
            Registrar Gasto o ingreso
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default FinanceFluxFormModal;
