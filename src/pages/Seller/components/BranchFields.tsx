import { Col, Form, InputNumber, Row, Select } from "antd";
import { DeleteOutlined } from "@ant-design/icons";

export default function BranchFields({
  field,
  remove,
  sucursalOptions,
}: {
  field: any;
  remove: any
  sucursalOptions: any[];
}) {
  return (
    <Row gutter={[8, 8]}>
      <Col xs={24} md={8}>
        <Form.Item
          {...field}
          name={[field.name, "id_sucursal"]}
          label="Sucursal"
          rules={[
            { required: true, message: "Seleccione una sucursal" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                const lista = getFieldValue("sucursales") || [];
                const ids = lista.map((s: any) => s?.id_sucursal).filter(Boolean);
                const repetidos = ids.filter((v: string) => v === value).length;
                return repetidos > 1
                  ? Promise.reject("Sucursal ya seleccionada")
                  : Promise.resolve();
              },
            }),
          ]}
        >
          <Select
            placeholder="Sucursal"
            options={sucursalOptions.map((s) => ({
              value: s._id,
              label: s.nombre,
            }))}
            showSearch
          />
        </Form.Item>
      </Col>

      {["alquiler", "exhibicion", "delivery", "entrega_simple"].map((k) => (
        <Col xs={12} md={4} key={k}>
          <Form.Item
            {...field}
            name={[field.name, k]}
            label={k.replace("_", " ")}
            rules={[{ required: true, message: "Obligatorio" }]}
          >
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </Col>
      ))}

      <Col>
        <DeleteOutlined
          className="cursor-pointer text-red-500"
          onClick={() => remove(field.name)}
        />
      </Col>
    </Row>
  );
}
