import { Button, Drawer, Form, InputNumber, Select, Space, Table, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { getSucursalsAPI } from "../../api/sucursal";
import { updateFinanceFluxAPI } from "../../api/financeFlux";

type ServiceDetail = {
  id_sucursal?: any;
  sucursalName?: string;
  alquiler?: number;
  exhibicion?: number;
  entrega_simple?: number;
  delivery?: number;
  total?: number;
};

const money = (value: number) =>
  `Bs. ${Number(value || 0).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
  })}`;

const getId = (value: any) => String(value?._id || value || "").trim();

const normalizeDetail = (details: ServiceDetail[] = []) =>
  details.map((detail, index) => {
    const sucursalId = getId(detail.id_sucursal);
    return {
      key: `${sucursalId || "branch"}-${index}`,
      id_sucursal: sucursalId || undefined,
      sucursalName: detail.sucursalName || detail.id_sucursal?.nombre || "",
      alquiler: Number(detail.alquiler || 0),
      exhibicion: Number(detail.exhibicion || 0),
      entrega_simple: Number(detail.entrega_simple || 0),
      delivery: Number(detail.delivery || 0),
    };
  });

export default function ServiceDetailDrawer({
  open,
  onClose,
  flux,
  sellerName,
  readOnly = false,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  flux: any;
  sellerName?: string;
  readOnly?: boolean;
  onSaved?: () => void;
}) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [sucursals, setSucursals] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      detalle_servicios: normalizeDetail(flux?.detalle_servicios || []),
    });
  }, [open, flux, form]);

  useEffect(() => {
    if (!open) return;
    getSucursalsAPI()
      .then((rows) => setSucursals(Array.isArray(rows) ? rows : []))
      .catch(() => setSucursals([]));
  }, [open]);

  const branchOptions = useMemo(
    () =>
      sucursals.map((sucursal: any) => ({
        value: sucursal._id,
        label: sucursal.nombre,
      })),
    [sucursals]
  );

  const details = Form.useWatch("detalle_servicios", form) || [];
  const total = details.reduce(
    (sum: number, detail: any) =>
      sum +
      Number(detail?.alquiler || 0) +
      Number(detail?.exhibicion || 0) +
      Number(detail?.entrega_simple || 0) +
      Number(detail?.delivery || 0),
    0
  );

  const handleSave = async () => {
    if (!flux?._id && !flux?.id_flujo_financiero) return;
    setSaving(true);
    try {
      const values = await form.validateFields();
      const payloadDetail = (values.detalle_servicios || []).map((detail: any) => {
        const sucursal = sucursals.find((item: any) => item._id === detail.id_sucursal);
        return {
          id_sucursal: detail.id_sucursal,
          sucursalName: sucursal?.nombre || detail.sucursalName || "",
          alquiler: Number(detail.alquiler || 0),
          exhibicion: Number(detail.exhibicion || 0),
          entrega_simple: Number(detail.entrega_simple || 0),
          delivery: Number(detail.delivery || 0),
        };
      });

      const response = await updateFinanceFluxAPI(
        flux.id_flujo_financiero || flux._id,
        { detalle_servicios: payloadDetail }
      );
      if (!response?.ok) throw new Error("update failed");

      message.success("Detalle actualizado");
      onSaved?.();
      onClose();
    } catch (error) {
      message.error("Error al actualizar el detalle");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: "Sucursal",
      dataIndex: "id_sucursal",
      key: "id_sucursal",
      render: (_: any, record: any) =>
        readOnly ? (
          record.sucursalName || "N/A"
        ) : (
          <Form.Item
            name={[record.name, "id_sucursal"]}
            rules={[{ required: true, message: "Selecciona una sucursal" }]}
            style={{ margin: 0 }}
          >
            <Select
              options={branchOptions}
              showSearch
              style={{ minWidth: 150 }}
              optionFilterProp="label"
            />
          </Form.Item>
        ),
    },
    {
      title: "Almacenamiento",
      dataIndex: "alquiler",
      key: "alquiler",
      render: (_: any, record: any) =>
        readOnly ? money(record.alquiler) : (
          <Form.Item name={[record.name, "alquiler"]} style={{ margin: 0 }}>
            <InputNumber min={0} prefix="Bs." style={{ width: 120 }} />
          </Form.Item>
        ),
    },
    {
      title: "Exhibición",
      dataIndex: "exhibicion",
      key: "exhibicion",
      render: (_: any, record: any) =>
        readOnly ? money(record.exhibicion) : (
          <Form.Item name={[record.name, "exhibicion"]} style={{ margin: 0 }}>
            <InputNumber min={0} prefix="Bs." style={{ width: 120 }} />
          </Form.Item>
        ),
    },
    {
      title: "Entrega Simple",
      dataIndex: "entrega_simple",
      key: "entrega_simple",
      render: (_: any, record: any) =>
        readOnly ? money(record.entrega_simple) : (
          <Form.Item name={[record.name, "entrega_simple"]} style={{ margin: 0 }}>
            <InputNumber min={0} prefix="Bs." style={{ width: 120 }} />
          </Form.Item>
        ),
    },
    {
      title: "Delivery",
      dataIndex: "delivery",
      key: "delivery",
      render: (_: any, record: any) =>
        readOnly ? money(record.delivery) : (
          <Form.Item name={[record.name, "delivery"]} style={{ margin: 0 }}>
            <InputNumber min={0} prefix="Bs." style={{ width: 120 }} />
          </Form.Item>
        ),
    },
  ];

  return (
    <Drawer
      title={`Detalle por sucursal - ${sellerName || "Sin vendedor"}`}
      placement="right"
      width={760}
      onClose={onClose}
      open={open}
      extra={!readOnly && <strong>Total: {money(total)}</strong>}
    >
      <Form form={form} component={false}>
        <Form.List name="detalle_servicios">
          {(fields, { add, remove }) => {
            const dataSource = fields.map((field) => ({
              ...field,
              ...(details[field.name] || {}),
              key: field.key,
            }));

            const tableColumns = readOnly
              ? columns
              : [
                  ...columns,
                  {
                    title: "Acciones",
                    key: "actions",
                    render: (_: any, __: any, index: number) => (
                      <Button type="link" danger onClick={() => remove(index)}>
                        Quitar
                      </Button>
                    ),
                  },
                ];

            return (
              <>
                <Table
                  columns={tableColumns as any}
                  dataSource={dataSource}
                  pagination={false}
                  scroll={{ x: "max-content" }}
                />
                {!readOnly && (
                  <Space style={{ marginTop: 16 }}>
                    <Button onClick={() => add({ alquiler: 0, exhibicion: 0, entrega_simple: 0, delivery: 0 })}>
                      Añadir sucursal
                    </Button>
                    <Button type="primary" onClick={handleSave} loading={saving}>
                      Guardar cambios
                    </Button>
                  </Space>
                )}
              </>
            );
          }}
        </Form.List>
      </Form>
    </Drawer>
  );
}
