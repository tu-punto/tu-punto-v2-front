import { Fragment, useEffect, useMemo, useState } from "react";
import { Button, Form, Input, InputNumber, Modal, Select, message } from "antd";
import { registerExternalPackagesAPI } from "../../api/externalSale";

interface ExternalPackagesFormModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  currentSucursal?: { _id?: string; nombre?: string } | null;
}

const MIN_PACKAGES = 1;
const roundCurrency = (value: number) => +Number(value || 0).toFixed(2);

const buildPackages = (count: number, existing: any[] = []) =>
  Array.from({ length: count }, (_, index) => ({
    comprador: existing[index]?.comprador || "",
    descripcion_paquete: existing[index]?.descripcion_paquete || "",
    telefono_comprador: existing[index]?.telefono_comprador || "",
    precio_paquete: existing[index]?.precio_paquete ?? undefined,
    esta_pagado: existing[index]?.esta_pagado ?? "no",
    monto_paga_vendedor: existing[index]?.monto_paga_vendedor ?? 0,
    monto_paga_comprador: existing[index]?.monto_paga_comprador ?? 0,
  }));

const ExternalPackagesFormModal = ({ visible, onClose, onCreated, currentSucursal }: ExternalPackagesFormModalProps) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [packageCount, setPackageCount] = useState<number>(MIN_PACKAGES);

  const packageRows = useMemo(() => Array.from({ length: packageCount }, (_, i) => i), [packageCount]);
  const watchedPackages = Form.useWatch("paquetes", form) || [];
  const hasMixedPackages = useMemo(
    () => watchedPackages.slice(0, packageCount).some((row: any) => row?.esta_pagado === "mixto"),
    [packageCount, watchedPackages]
  );

  const handlePaymentModeChange = (rowIndex: number, mode: "si" | "no" | "mixto") => {
    const price = Number(form.getFieldValue(["paquetes", rowIndex, "precio_paquete"]) || 0);
    if (price <= 0) {
      message.warning("Primero ingresa el precio del paquete");
      form.setFieldValue(["paquetes", rowIndex, "esta_pagado"], "no");
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_vendedor"], 0);
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_comprador"], 0);
      return;
    }

    if (mode === "si") {
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_vendedor"], 0);
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_comprador"], price);
      return;
    }
    if (mode === "no") {
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_vendedor"], 0);
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_comprador"], 0);
      return;
    }

    const half = roundCurrency(price / 2);
    form.setFieldValue(["paquetes", rowIndex, "monto_paga_vendedor"], half);
    form.setFieldValue(["paquetes", rowIndex, "monto_paga_comprador"], roundCurrency(price - half));
  };

  const handlePackagePriceChange = (rowIndex: number, value: number | null) => {
    const price = roundCurrency(Number(value || 0));
    const mode = form.getFieldValue(["paquetes", rowIndex, "esta_pagado"]) || "no";
    const currentSellerAmount = roundCurrency(
      Number(form.getFieldValue(["paquetes", rowIndex, "monto_paga_vendedor"]) || 0)
    );
    const currentBuyerAmount = roundCurrency(
      Number(form.getFieldValue(["paquetes", rowIndex, "monto_paga_comprador"]) || 0)
    );

    if (price <= 0) {
      form.setFieldValue(["paquetes", rowIndex, "esta_pagado"], "no");
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_vendedor"], 0);
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_comprador"], 0);
      return;
    }

    if (mode === "si") {
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_vendedor"], 0);
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_comprador"], price);
      return;
    }

    if (mode === "mixto") {
      const hasManualSplit = currentSellerAmount > 0 && currentBuyerAmount > 0;

      if (hasManualSplit) {
        const nextSellerAmount = Math.min(currentSellerAmount, roundCurrency(Math.max(0, price - 0.01)));
        form.setFieldValue(["paquetes", rowIndex, "monto_paga_vendedor"], nextSellerAmount);
        form.setFieldValue(
          ["paquetes", rowIndex, "monto_paga_comprador"],
          roundCurrency(price - nextSellerAmount)
        );
        return;
      }

      const half = roundCurrency(price / 2);
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_vendedor"], half);
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_comprador"], roundCurrency(price - half));
    }
  };

  const handleMixedSellerChange = (rowIndex: number, value: number | null) => {
    const price = roundCurrency(Number(form.getFieldValue(["paquetes", rowIndex, "precio_paquete"]) || 0));
    if (price <= 0) {
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_vendedor"], 0);
      form.setFieldValue(["paquetes", rowIndex, "monto_paga_comprador"], 0);
      return;
    }

    let seller = roundCurrency(Number(value || 0));
    if (seller < 0) seller = 0;
    if (seller > price) seller = price;

    form.setFieldValue(["paquetes", rowIndex, "monto_paga_vendedor"], seller);
    form.setFieldValue(["paquetes", rowIndex, "monto_paga_comprador"], roundCurrency(price - seller));
  };

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
      metodo_pago: undefined,
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

      const paquetes = (values.paquetes || []).slice(0, packageCount).map((row: any, index: number) => {
        const price = roundCurrency(Number(row.precio_paquete || 0));
        const paidStatus = row.esta_pagado || "no";
        let sellerAmount = roundCurrency(Number(row.monto_paga_vendedor || 0));
        let buyerAmount = roundCurrency(Number(row.monto_paga_comprador || 0));

        if (paidStatus === "si") {
          sellerAmount = 0;
          buyerAmount = price;
        } else if (paidStatus === "no") {
          sellerAmount = 0;
          buyerAmount = 0;
        }

        return {
          numero_paquete: index + 1,
          comprador: row.comprador || "",
          descripcion_paquete: row.descripcion_paquete,
          telefono_comprador: row.telefono_comprador || "",
          precio_paquete: price,
          esta_pagado: paidStatus,
          monto_paga_vendedor: sellerAmount,
          monto_paga_comprador: buyerAmount,
        };
      });

      for (const p of paquetes) {
        if (p.esta_pagado === "mixto") {
          const price = Number(p.precio_paquete || 0);
          const montoVendedor = Number(p.monto_paga_vendedor || 0);
          const montoComprador = Number(p.monto_paga_comprador || 0);
          const suma = roundCurrency(montoVendedor + montoComprador);

          if (price <= 0) {
            message.error("Para pago mixto el precio del paquete debe ser mayor a 0");
            return;
          }
          if (montoVendedor <= 0 || montoComprador <= 0) {
            message.error("En pago mixto ambos deben pagar un monto mayor a 0");
            return;
          }
          if (montoVendedor >= price || montoComprador >= price) {
            message.error("En pago mixto ninguna parte puede pagar todo el paquete");
            return;
          }
          if (Math.abs(suma - price) > 0.01) {
            message.error("En pago mixto la suma debe ser igual al precio del paquete");
            return;
          }
        }
      }

      const sellerPaymentMethod = hasMixedPackages ? String(values.metodo_pago || "").trim().toLowerCase() : "";
      if (hasMixedPackages && sellerPaymentMethod !== "efectivo" && sellerPaymentMethod !== "qr") {
        message.error("Debes indicar si los pagos mixtos del vendedor seran en efectivo o QR");
        return;
      }

      const payload = {
        carnet_vendedor: values.carnet_vendedor,
        vendedor: values.vendedor,
        telefono_vendedor: values.telefono_vendedor,
        id_sucursal: currentSucursal?._id,
        lugar_entrega: currentSucursal?.nombre || "Externo",
        metodo_pago: sellerPaymentMethod,
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
      width={1120}
      style={{ maxWidth: "96vw" }}
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

        {hasMixedPackages && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Form.Item
              name="metodo_pago"
              label="Pago del vendedor para mixtos"
              rules={[{ required: true, message: "Selecciona efectivo o QR" }]}
            >
              <Select
                placeholder="Selecciona como se recibio el pago del vendedor"
                options={[
                  { label: "Efectivo", value: "efectivo" },
                  { label: "QR", value: "qr" },
                ]}
              />
            </Form.Item>
          </div>
        )}

        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #d9d9d9", padding: 8 }}>Nombre del comprador</th>
                <th style={{ border: "1px solid #d9d9d9", padding: 8 }}>Descripcion del paquete</th>
                <th style={{ border: "1px solid #d9d9d9", padding: 8 }}>Celular</th>
                <th style={{ border: "1px solid #d9d9d9", padding: 8 }}>Precio paquete</th>
                <th style={{ border: "1px solid #d9d9d9", padding: 8 }}>Estado pago</th>
              </tr>
            </thead>
            <tbody>
              {packageRows.map((rowIndex) => {
                const isMixedRow = watchedPackages?.[rowIndex]?.esta_pagado === "mixto";
                return (
                  <Fragment key={rowIndex}>
                    <tr>
                      <td style={{ border: "1px solid #d9d9d9", padding: 6 }}>
                        <Form.Item
                          name={["paquetes", rowIndex, "comprador"]}
                          dependencies={[["paquetes", rowIndex, "telefono_comprador"]]}
                          rules={[
                            {
                              validator: async (_, value) => {
                                const phone = String(form.getFieldValue(["paquetes", rowIndex, "telefono_comprador"]) || "").trim();
                                const name = String(value || "").trim();
                                if (name || phone) return;
                                throw new Error("Ingrese nombre o celular");
                              },
                            },
                          ]}
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
                          dependencies={[["paquetes", rowIndex, "comprador"]]}
                          rules={[
                            {
                              validator: async (_, value) => {
                                const name = String(form.getFieldValue(["paquetes", rowIndex, "comprador"]) || "").trim();
                                const phone = String(value || "").trim();
                                if (name || phone) return;
                                throw new Error("Ingrese nombre o celular");
                              },
                            },
                          ]}
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
                          <InputNumber
                            prefix="Bs."
                            min={0}
                            style={{ width: "100%" }}
                            onChange={(value) => handlePackagePriceChange(rowIndex, value)}
                          />
                        </Form.Item>
                      </td>
                      <td style={{ border: "1px solid #d9d9d9", padding: 6 }}>
                        <Form.Item
                          name={["paquetes", rowIndex, "esta_pagado"]}
                          initialValue="no"
                          style={{ marginBottom: 0 }}
                        >
                          <Select
                            options={[
                              { label: "Ya pagado", value: "si" },
                              { label: "No pagado", value: "no" },
                              { label: "Mixto", value: "mixto" },
                            ]}
                            onChange={(value) => handlePaymentModeChange(rowIndex, value as "si" | "no" | "mixto")}
                          />
                        </Form.Item>
                      </td>
                    </tr>
                    {isMixedRow && (
                      <tr>
                        <td colSpan={5} style={{ border: "1px solid #d9d9d9", padding: 8, background: "#fafafa" }}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Form.Item
                              label="Paga vendedor"
                              name={["paquetes", rowIndex, "monto_paga_vendedor"]}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber
                                min={0}
                                max={Math.max(0, roundCurrency(Number(watchedPackages?.[rowIndex]?.precio_paquete || 0) - 0.01))}
                                precision={2}
                                prefix="Bs."
                                style={{ width: "100%" }}
                                onChange={(value) => handleMixedSellerChange(rowIndex, value)}
                              />
                            </Form.Item>
                            <Form.Item
                              label="Paga comprador"
                              name={["paquetes", rowIndex, "monto_paga_comprador"]}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber min={0} precision={2} prefix="Bs." style={{ width: "100%" }} disabled />
                            </Form.Item>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
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
