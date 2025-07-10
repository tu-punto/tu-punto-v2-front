import {
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";

const { TextArea } = Input;

const BranchFields = ({
  field,
  remove,
  sucursalOptions,
  form,
  isSeller = false,
}: any) => {
  return (
    <>
      <Row gutter={[8, 8]}>
        <Col xs={24} sm={12} md={6}>
          <Form.Item
            {...field}
            name={[field.name, "id_sucursal"]}
            label="Sucursal"
            rules={[
              { required: true, message: "Selecciona una sucursal" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const lista = getFieldValue("sucursales") || [];
                  const ids = lista
                    .map((s: any) => s?.id_sucursal)
                    .filter(Boolean);
                  const repetidos = ids.filter(
                    (v: string) => v === value
                  ).length;
                  return repetidos > 1
                    ? Promise.reject("Sucursal ya seleccionada")
                    : Promise.resolve();
                },
              }),
            ]}
          >
            <Select
              showSearch
              placeholder="Selecciona sucursal"
              disabled={isSeller}
              options={sucursalOptions.map((s: any) => ({
                value: s._id,
                label: s.nombre,
              }))}
            />
          </Form.Item>
        </Col>

        {/* Fecha de ingreso */}
        <Col xs={24} sm={12} md={6}>
          <Form.Item
            {...field}
            name={[field.name, "fecha_ingreso"]}
            label="Fecha de ingreso"
            rules={[{ required: true, message: "Selecciona fecha de ingreso" }]}
          >
            <DatePicker
              placeholder="Fecha de ingreso"
              format="DD/MM/YYYY"
              disabled={isSeller}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Col>

        {/* Fecha de salida */}
        <Col xs={24} sm={12} md={6}>
          <Form.Item
            {...field}
            name={[field.name, "fecha_salida"]}
            label="Fecha de salida"
          >
            <DatePicker
              placeholder="Fecha de salida (opcional)"
              format="DD/MM/YYYY"
              disabled={isSeller}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Col>

        {/* Botón eliminar */}
        {!isSeller && (
          <Col xs={24} sm={12} md={6}>
            <Form.Item label=" ">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => remove(field.name)}
                style={{ marginTop: 8 }}
              >
                Eliminar
              </Button>
            </Form.Item>
          </Col>
        )}
      </Row>

      <Row gutter={[16, 16]}>
        {["Alquiler", "Exhibicion", "Delivery", "Entrega_simple"].map((k) => (
          <Col xs={12} sm={6} md={6} key={k}>
            <Form.Item
              {...field}
              name={[field.name, k.toLowerCase()]}
              label={k.replace("_", " ")}
              rules={[{ required: true, message: "Obligatorio" }]}
            >
              <InputNumber
                min={0}
                placeholder="0"
                className="w-full"
                disabled={isSeller}
                addonBefore="Bs."
              />
            </Form.Item>
          </Col>
        ))}
      </Row>

      {/* Comentario */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Form.Item
            {...field}
            name={[field.name, "comentario"]}
            label="Comentario"
          >
            <TextArea
              placeholder="..."
              disabled={isSeller}
              rows={2}
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
};

export default BranchFields;
