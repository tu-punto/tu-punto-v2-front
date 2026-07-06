import { useEffect } from "react";
import { Form, Input, Modal, Select, Typography } from "antd";

const REASONS = [
  { value: "precio_alto", label: "Precio alto" },
  { value: "poco_uso", label: "Poco uso" },
  { value: "problemas_entrega", label: "Problemas con entrega" },
  { value: "cambio_negocio", label: "Cambio de negocio" },
  { value: "cierre_temporal", label: "Cierre temporal" },
  { value: "mala_atencion", label: "Problemas de atención" },
  { value: "no_vende", label: "No vende" },
  { value: "otro", label: "Otro" },
];

const LABEL_BY_VALUE = new Map(REASONS.map((reason) => [reason.value, reason.label]));

const buildReasonText = (reasonType: string, otherReason?: string) => {
  if (reasonType === "otro") return otherReason?.trim() || "Otro";
  return LABEL_BY_VALUE.get(reasonType) || reasonType || "Motivo no especificado";
};

export default function DeclineServiceReasonModal({
  open,
  loading,
  title,
  description,
  okText = "Confirmar",
  onCancel,
  onConfirm,
}: {
  open: boolean;
  loading?: boolean;
  title: string;
  description?: string;
  okText?: string;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
}) {
  const [form] = Form.useForm();
  const reasonType = Form.useWatch("reasonType", form);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }
    form.setFieldsValue({ reasonType: "precio_alto" });
  }, [form, open]);

  const handleOk = async () => {
    const values = await form.validateFields();
    await onConfirm(buildReasonText(values.reasonType, values.otherReason));
  };

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      onOk={handleOk}
      okButtonProps={{ danger: true, loading }}
      okText={okText}
      cancelText="Cancelar"
      destroyOnClose
    >
      {description ? (
        <Typography.Paragraph type="secondary" className="mb-4">
          {description}
        </Typography.Paragraph>
      ) : null}

      <Form form={form} layout="vertical">
        <Form.Item
          name="reasonType"
          label="Motivo"
          rules={[{ required: true, message: "Selecciona un motivo" }]}
        >
          <Select
            options={REASONS}
            placeholder="Selecciona el motivo"
            size="large"
          />
        </Form.Item>

        {reasonType === "otro" && (
          <Form.Item
            name="otherReason"
            label="Especifica el motivo"
            rules={[{ required: true, message: "Escribe el motivo" }]}
          >
            <Input.TextArea rows={3} maxLength={250} showCount placeholder="Describe el motivo" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
