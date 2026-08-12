import { Alert, Button, Form, Input, Modal, Radio, Select, Space, Switch, Tag, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useUserStore } from "../stores/userStore";
import {
  getMaintenanceModeAPI,
  updateMaintenanceModeAPI,
  type MaintenanceAllowedRole,
  type MaintenanceModeConfig,
} from "../api/maintenanceMode";

const MAINTENANCE_ROLE_OPTIONS: Array<{ label: string; value: MaintenanceAllowedRole }> = [
  { label: "Administrador", value: "admin" },
  { label: "Operador", value: "operator" },
  { label: "Vendedor", value: "seller" },
];

const DEFAULT_MESSAGE = "Estamos realizando tareas de mantenimiento. Vuelve a intentar en unos minutos.";
const DEFAULT_SUBTITLE = "Estamos haciendo ajustes para mejorar el sistema.";

type MaintenanceModeModalProps = {
  open: boolean;
  onClose: () => void;
};

const normalizeConfigToForm = (config?: MaintenanceModeConfig | null) => ({
  message: config?.message || DEFAULT_MESSAGE,
  subtitle: config?.subtitle || DEFAULT_SUBTITLE,
  allowedRoles: Array.isArray(config?.allowedRoles) ? config.allowedRoles : [],
  targetUserScope: config?.targetUserScope === "specific" ? "specific" : "all",
  targetUserIds: Array.isArray(config?.targetUserIds) ? config.targetUserIds : [],
});

const MaintenanceModeModal = ({ open, onClose }: MaintenanceModeModalProps) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const users = useUserStore((state) => state.users);
  const fetchUsers = useUserStore((state) => state.fetchUsers);
  const targetUserScope = Form.useWatch("targetUserScope", form);

  useEffect(() => {
    if (!open) return;
    if (users.length === 0) {
      void fetchUsers();
    }
  }, [fetchUsers, open, users.length]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await getMaintenanceModeAPI();
        if (!cancelled && res?.success) {
          setEnabled(Boolean(res.data?.enabled));
          form.setFieldsValue(normalizeConfigToForm(res.data));
        }
      } catch (error) {
        if (!cancelled) {
          console.error("No se pudo cargar la configuracion de mantenimiento:", error);
          form.setFieldsValue(normalizeConfigToForm());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [form, open]);

  const userOptions = useMemo(
    () =>
      users.map((user) => ({
        label: `${user.email} · ${user.role}${user.is_superadmin ? " · superadmin" : ""}`,
        value: user._id,
      })),
    [users]
  );

  const handleScopeChange = (scope: "all" | "specific") => {
    form.setFieldValue("targetUserScope", scope);
    if (scope === "all") {
      form.setFieldValue("targetUserIds", []);
      form.setFields([{ name: "targetUserIds", errors: [] }]);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      Modal.confirm({
        title: "Confirmar cambios",
        content: "Este ajuste cambiará quién ve la pantalla de mantenimiento. ¿Deseas guardarlo?",
        okText: "Sí, guardar",
        cancelText: "Cancelar",
        onOk: async () => {
          setSaving(true);
          try {
            const res = await updateMaintenanceModeAPI({
              enabled,
              message: String(values.message || "").trim(),
              subtitle: String(values.subtitle || "").trim(),
              allowedRoles: Array.isArray(values.allowedRoles) ? values.allowedRoles : [],
              targetUserScope: values.targetUserScope === "specific" ? "specific" : "all",
              targetUserIds:
                values.targetUserScope === "specific" && Array.isArray(values.targetUserIds)
                  ? values.targetUserIds
                  : [],
            });

            if (!res?.success) {
              throw new Error(res?.message || "No se pudo guardar la configuracion");
            }

            setEnabled(Boolean(res.data?.enabled));
            form.setFieldsValue(normalizeConfigToForm(res.data));
            message.success("Configuracion de mantenimiento actualizada");
            onClose();
          } catch (error: any) {
            message.error(error?.message || "No se pudo guardar la configuracion");
            throw error;
          } finally {
            setSaving(false);
          }
        },
      });
    } catch (_error) {
      // validation already shown by antd
    }
  };

  return (
    <Modal open={open} title="Modo mantenimiento" onCancel={onClose} width={860} footer={null} destroyOnClose={false}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <Typography.Title level={5} style={{ margin: 0 }}>
            Estado general
          </Typography.Title>
          <Tag color={enabled ? "red" : "green"}>{enabled ? "Activo" : "Desactivado"}</Tag>
        </div>

        <Alert
          type="info"
          showIcon
          message="Superadmin siempre tiene bypass"
          description="Puedes dejar permitido a algunos roles o limitar la pantalla a usuarios concretos."
        />

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Switch checked={enabled} onChange={setEnabled} />
          <Typography.Text strong>{enabled ? "Mantenimiento activado" : "Mantenimiento desactivado"}</Typography.Text>
        </div>

        <Form form={form} layout="vertical" disabled={loading || saving} preserve={false}>
          <Form.Item
            name="message"
            label="Mensaje principal"
            rules={[{ required: true, message: "Escribe el mensaje de mantenimiento" }]}
          >
            <Input.TextArea rows={3} maxLength={240} placeholder={DEFAULT_MESSAGE} />
          </Form.Item>

          <Form.Item name="subtitle" label="Subtítulo">
            <Input placeholder={DEFAULT_SUBTITLE} />
          </Form.Item>

          <Form.Item name="allowedRoles" label="Roles permitidos">
            <Select mode="multiple" options={MAINTENANCE_ROLE_OPTIONS} placeholder="Selecciona roles que sí podrán entrar" />
          </Form.Item>

          <Form.Item name="targetUserScope" label="Usuarios a los que aplica">
            <Radio.Group onChange={(e) => handleScopeChange(e.target.value)}>
              <Radio value="all">Todos</Radio>
              <Radio value="specific">Usuarios específicos</Radio>
            </Radio.Group>
          </Form.Item>

          {targetUserScope === "specific" ? (
            <Form.Item
              name="targetUserIds"
              label="Selecciona usuarios"
              rules={[{ required: true, message: "Selecciona al menos un usuario" }]}
            >
              <Select
                mode="multiple"
                showSearch
                optionFilterProp="label"
                placeholder="Selecciona usuarios concretos"
                options={userOptions}
              />
            </Form.Item>
          ) : null}
        </Form>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="primary" onClick={() => void handleSubmit()} loading={saving}>
            Guardar configuración
          </Button>
        </div>
      </Space>
    </Modal>
  );
};

export default MaintenanceModeModal;
