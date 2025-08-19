import {
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { TextArea } = Input;

const BranchFields = ({
  field,
  remove,
  sucursalOptions,
  form,
  isSeller = false,
}: any) => {
  const sucursales = form.getFieldValue("sucursales") || [];
  const currentBranch = sucursales[field.name] || {};
  const handleActivoChange = (e: any) => {
    const isActive = e.target.value;

    if (!isActive) {
      form.setFieldValue(["sucursales", field.name, "fecha_salida"], dayjs());
    } else {
      form.setFieldValue(["sucursales", field.name, "fecha_salida"], null);
    }
  };

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
            initialValue={
              currentBranch.fecha_ingreso
                ? dayjs(currentBranch.fecha_ingreso)
                : dayjs()
            }
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
            initialValue={
              currentBranch.fecha_salida
                ? dayjs(currentBranch.fecha_salida)
                : null
            }
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
        {["Almacenamiento", "Exhibicion", "Delivery", "Entrega_simple"].map(
          (k) => (
            <Col xs={12} sm={6} md={6} key={k}>
              <Form.Item
                {...field}
                name={[field.name, k.toLowerCase()]}
                label={k.replace("_", " ")}
                rules={[{ required: true, message: "Obligatorio" }]}
                initialValue={currentBranch[k.toLowerCase()] || 0}
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
          )
        )}
      </Row>

      {/* Comentario y Activo */}
      <Row gutter={[16, 16]}>
        <Col xs={12}>
          <Form.Item
            {...field}
            name={[field.name, "comentario"]}
            label="Comentario"
            initialValue={currentBranch.comentario || ""}
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

        <Col xs={12}>
          <Form.Item
            {...field}
            name={[field.name, "activo"]}
            label="Activo"
            initialValue={
              currentBranch.activo !== undefined ? currentBranch.activo : true
            }
          >
            <Radio.Group onChange={handleActivoChange} disabled={isSeller}>
              <Radio value={true}>Sí</Radio>
              <Radio value={false}>No</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
      </Row>
    </>
  );
};

export default BranchFields;
