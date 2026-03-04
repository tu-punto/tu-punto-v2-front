import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Form, Input, InputNumber, Modal, message } from "antd";
import { registerExternalPackagesAPI } from "../../api/externalSale";

interface ExternalPackagesFormModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  currentSucursal?: { _id?: string; nombre?: string } | null;
}

const MIN_PACKAGES = 1;

const buildPackages = (count: number, existing: any[] = []) =>
  Array.from({ length: count }, (_, index) => ({
    comprador: existing[index]?.comprador || "",
    descripcion_paquete: existing[index]?.descripcion_paquete || "",
    telefono_comprador: existing[index]?.telefono_comprador || "",
    precio_paquete: existing[index]?.precio_paquete ?? 0,
    esta_pagado: existing[index]?.esta_pagado ?? false,
  }));

const ExternalPackagesFormModal = ({ visible, onClose, onCreated, currentSucursal }: ExternalPackagesFormModalProps) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [packageCount, setPackageCount] = useState<number>(MIN_PACKAGES);

  const packageRows = useMemo(() => Array.from({ length: packageCount }, (_, i) => i), [packageCount]);

  const handlePackageCountChange = (value: number | null) => {
    const nextCount = Math.max(MIN_PACKAGES, Number(value || MIN_PACKAGES));
    const currentRows = form.getFieldValue("paquetes") || [];
    form.setFieldsValue({
      numero_paquetes: nextCount,
      paquetes: buildPackages(nextCount, currentRows),
    });
    setPackageCount(nextCount);
  };

  const resetModal = () => {
    setPackageCount(MIN_PACKAGES);
    form.resetFields();
  };

  useEffect(() => {
    if (!visible) return;
    form.setFieldsValue({
      numero_paquetes: MIN_PACKAGES,
      paquetes: buildPackages(MIN_PACKAGES),
    });
  }, [form, visible]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      if (!currentSucursal?._id || !currentSucursal?.nombre) {
        message.error("No se pudo identificar la sucursal actual para registrar la entrega externa");
        return;
      }

      const paquetes = (values.paquetes || []).slice(0, packageCount).map((row: any, index: number) => ({
        numero_paquete: index + 1,
        comprador: row.comprador,
        descripcion_paquete: row.descripcion_paquete,
        telefono_comprador: row.telefono_comprador,
        precio_paquete: Number(row.precio_paquete || 0),
        esta_pagado: row.esta_pagado ? "si" : "no",
      }));

      const payload = {
        carnet_vendedor: values.carnet_vendedor,
        vendedor: values.vendedor,
        telefono_vendedor: values.telefono_vendedor,
        id_sucursal: currentSucursal?._id,
        lugar_entrega: currentSucursal?.nombre || "Externo",
        numero_paquetes: packageCount,
        paquetes,
      };

      const response = await registerExternalPackagesAPI(payload);
      if (!response.success) {
        message.error(response.message || "No se pudieron registrar las entregas externas");
        return;
      }

      message.success(`Se registraron ${response.createdCount || packageCount} entregas externas`);
      resetModal();
      onCreated();
    } catch (error) {
      console.error(error);
      message.error("Error registrando entregas externas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Registrar Entregas Externas"
      open={visible}
      onCancel={() => {
        resetModal();
        onClose();
      }}
      footer={null}
      width={980}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Form.Item
            name="carnet_vendedor"
            label="Carnet del vendedor"
            rules={[{ required: true, message: "El carnet es obligatorio" }]}
          >
            <Input placeholder="Ej: 1234567" />
          </Form.Item>
          <Form.Item
            name="vendedor"
            label="Nombre del vendedor"
            rules={[{ required: true, message: "El nombre es obligatorio" }]}
          >
            <Input placeholder="Nombre completo" />
          </Form.Item>
          <Form.Item
            name="telefono_vendedor"
            label="Celular del vendedor"
          >
            <Input
              placeholder="Ej: 7XXXXXXX"
              onKeyDown={(e) => {
                if (!/[0-9]/.test(e.key) && !["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete"].includes(e.key)) {
                  e.preventDefault();
                }
              }}
            />
          </Form.Item>
          <Form.Item
            name="numero_paquetes"
            label="Numero de paquetes"
            rules={[{ required: true, message: "Debe indicar la cantidad de paquetes" }]}
          >
            <InputNumber min={MIN_PACKAGES} style={{ width: "100%" }} onChange={handlePackageCountChange} />
          </Form.Item>
        </div>

        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #d9d9d9", padding: 8 }}>Nombre del comprador</th>
                <th style={{ border: "1px solid #d9d9d9", padding: 8 }}>Descripcion del paquete</th>
                <th style={{ border: "1px solid #d9d9d9", padding: 8 }}>Celular</th>
                <th style={{ border: "1px solid #d9d9d9", padding: 8 }}>Precio paquete</th>
                <th style={{ border: "1px solid #d9d9d9", padding: 8 }}>Pago o no</th>
              </tr>
            </thead>
            <tbody>
              {packageRows.map((rowIndex) => (
                <tr key={rowIndex}>
                  <td style={{ border: "1px solid #d9d9d9", padding: 6 }}>
                    <Form.Item
                      name={["paquetes", rowIndex, "comprador"]}
                      rules={[{ required: true, message: "Requerido" }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input placeholder="Comprador" />
                    </Form.Item>
                  </td>
                  <td style={{ border: "1px solid #d9d9d9", padding: 6 }}>
                    <Form.Item
                      name={["paquetes", rowIndex, "descripcion_paquete"]}
                      rules={[{ required: true, message: "Requerido" }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input.TextArea
                        placeholder="Descripcion"
                        autoSize={{ minRows: 1, maxRows: 8 }}
                        style={{ resize: "vertical", overflow: "auto" }}
                      />
                    </Form.Item>
                  </td>
                  <td style={{ border: "1px solid #d9d9d9", padding: 6 }}>
                    <Form.Item
                      name={["paquetes", rowIndex, "telefono_comprador"]}
                      rules={[{ required: true, message: "Requerido" }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input
                        placeholder="Celular"
                        onKeyDown={(e) => {
                          if (
                            !/[0-9]/.test(e.key) &&
                            !["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete"].includes(e.key)
                          ) {
                            e.preventDefault();
                          }
                        }}
                      />
                    </Form.Item>
                  </td>
                  <td style={{ border: "1px solid #d9d9d9", padding: 6 }}>
                    <Form.Item
                      name={["paquetes", rowIndex, "precio_paquete"]}
                      rules={[{ required: true, message: "Requerido" }]}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber prefix="Bs." min={0} style={{ width: "100%" }} />
                    </Form.Item>
                  </td>
                  <td style={{ border: "1px solid #d9d9d9", padding: 6, textAlign: "center" }}>
                    <Form.Item
                      name={["paquetes", rowIndex, "esta_pagado"]}
                      valuePropName="checked"
                      style={{ marginBottom: 0 }}
                    >
                      <Checkbox />
                    </Form.Item>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <Button
            onClick={() => {
              resetModal();
              onClose();
            }}
          >
            Cancelar
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Guardar
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default ExternalPackagesFormModal;
