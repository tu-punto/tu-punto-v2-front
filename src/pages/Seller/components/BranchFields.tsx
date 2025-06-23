import { Col, Form, InputNumber, Input, Row, Select } from "antd";
import { DeleteOutlined } from "@ant-design/icons";

export default function BranchFields({
  field,
  remove,
  sucursalOptions,
  form,
  isSeller = false,
}: {
  field: any;
  remove: any;
  sucursalOptions: any[];
  form: any;
  isSeller?: boolean;
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
            onChange={(value) => {
              const selected = sucursalOptions.find((s) => s._id === value);
              if (selected) {
                const currentList = form.getFieldValue("sucursales") || [];
                const updatedList = [...currentList];

                updatedList[field.name] = {
                  ...updatedList[field.name],
                  id_sucursal: selected._id,
                  sucursalName: selected.nombre,
                };

                form.setFieldValue("sucursales", updatedList);
              }
            }}
            disabled={isSeller}
          />
        </Form.Item>

        {/* Campo oculto para mantener sucursalName sincronizado */}
        <Form.Item
            {...field}
            name={[field.name, "sucursalName"]}
            style={{ display: "none" }}
        >
          <Input />
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
            <InputNumber min={0} className="w-full" disabled={isSeller} />
          </Form.Item>
        </Col>
      ))}

      {!isSeller && (
        <Col>
          <DeleteOutlined
            className="cursor-pointer text-red-500"
            onClick={() => remove(field.name)}
          />
        </Col>
      )}
    </Row>
  );
}
