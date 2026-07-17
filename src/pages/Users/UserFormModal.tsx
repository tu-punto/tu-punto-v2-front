import { Modal, Form, Input, Select, Checkbox, Switch, TimePicker, Typography } from "antd";
import { useEffect, useState } from "react";
import { getSucursalsAPI } from "../../api/sucursal";
import dayjs from "dayjs";

const DEFAULT_SYSTEM_ACCESS_HOURS = {
  weekdays: { enabled: true, start: "08:00", end: "18:00" },
  saturday: { enabled: true, start: "08:00", end: "12:00" },
  sunday: { enabled: false, start: "00:00", end: "00:00" },
};

const toTimeValue = (value?: string) => {
  const normalized = String(value || "").trim();
  if (!normalized) return null;

  return dayjs(`1970-01-01T${normalized.slice(0, 5)}:00`);
};

const toTimeString = (value: any) => {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 5);
  if (typeof value?.format === "function") return value.format("HH:mm");
  return "";
};

const buildInitialAccessHours = (accessHours?: any) => ({
  weekdays: {
    ...DEFAULT_SYSTEM_ACCESS_HOURS.weekdays,
    ...(accessHours?.weekdays || {}),
    start: accessHours?.weekdays?.start || DEFAULT_SYSTEM_ACCESS_HOURS.weekdays.start,
    end: accessHours?.weekdays?.end || DEFAULT_SYSTEM_ACCESS_HOURS.weekdays.end,
  },
  saturday: {
    ...DEFAULT_SYSTEM_ACCESS_HOURS.saturday,
    ...(accessHours?.saturday || {}),
    start: accessHours?.saturday?.start || DEFAULT_SYSTEM_ACCESS_HOURS.saturday.start,
    end: accessHours?.saturday?.end || DEFAULT_SYSTEM_ACCESS_HOURS.saturday.end,
  },
  sunday: {
    ...DEFAULT_SYSTEM_ACCESS_HOURS.sunday,
    ...(accessHours?.sunday || {}),
    start: accessHours?.sunday?.start || DEFAULT_SYSTEM_ACCESS_HOURS.sunday.start,
    end: accessHours?.sunday?.end || DEFAULT_SYSTEM_ACCESS_HOURS.sunday.end,
  },
});

const normalizeAccessHours = (accessHours: any) => {
  if (!accessHours) return undefined;

  return {
    weekdays: {
      enabled: Boolean(accessHours?.weekdays?.enabled),
      start: toTimeString(accessHours?.weekdays?.start),
      end: toTimeString(accessHours?.weekdays?.end),
    },
    saturday: {
      enabled: Boolean(accessHours?.saturday?.enabled),
      start: toTimeString(accessHours?.saturday?.start),
      end: toTimeString(accessHours?.saturday?.end),
    },
    sunday: {
      enabled: Boolean(accessHours?.sunday?.enabled),
      start: toTimeString(accessHours?.sunday?.start),
      end: toTimeString(accessHours?.sunday?.end),
    },
  };
};

interface UserFormModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => Promise<boolean>;
  editingUser?: any;
  canAssignRoles?: boolean;
}

const UserFormModal = ({
  visible,
  onCancel,
  onSubmit,
  editingUser,
  canAssignRoles = false,
}: UserFormModalProps) => {
  const [form] = Form.useForm();
  const [changePassword, setChangePassword] = useState(false);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const selectedRole = Form.useWatch("role", form);
  const weekdaysEnabled = Form.useWatch(["system_access_hours", "weekdays", "enabled"], form);
  const saturdayEnabled = Form.useWatch(["system_access_hours", "saturday", "enabled"], form);
  const sundayEnabled = Form.useWatch(["system_access_hours", "sunday", "enabled"], form);

  useEffect(() => {
    if (!visible) return;

    getSucursalsAPI()
      .then((data) => setSucursales(Array.isArray(data) ? data : []))
      .catch(() => setSucursales([]));
  }, [visible]);

  useEffect(() => {
    if (visible) {
      if (editingUser) {
        const initialAccessHours = buildInitialAccessHours(editingUser.system_access_hours);
        form.setFieldsValue({
          email: editingUser.email,
          role: editingUser.role,
          sucursal: editingUser.sucursal?._id || editingUser.sucursal || editingUser.sucursalId,
          system_access_hours: {
            weekdays: {
              ...initialAccessHours.weekdays,
              start: toTimeValue(editingUser.system_access_hours?.weekdays?.start),
              end: toTimeValue(editingUser.system_access_hours?.weekdays?.end),
            },
            saturday: {
              ...initialAccessHours.saturday,
              start: toTimeValue(editingUser.system_access_hours?.saturday?.start),
              end: toTimeValue(editingUser.system_access_hours?.saturday?.end),
            },
            sunday: {
              ...initialAccessHours.sunday,
              start: toTimeValue(editingUser.system_access_hours?.sunday?.start),
              end: toTimeValue(editingUser.system_access_hours?.sunday?.end),
            },
          },
        });
        setChangePassword(false);
      } else {
        form.resetFields();
        form.setFieldsValue({
          system_access_hours: {
            weekdays: {
              ...DEFAULT_SYSTEM_ACCESS_HOURS.weekdays,
              start: toTimeValue(DEFAULT_SYSTEM_ACCESS_HOURS.weekdays.start),
              end: toTimeValue(DEFAULT_SYSTEM_ACCESS_HOURS.weekdays.end),
            },
            saturday: {
              ...DEFAULT_SYSTEM_ACCESS_HOURS.saturday,
              start: toTimeValue(DEFAULT_SYSTEM_ACCESS_HOURS.saturday.start),
              end: toTimeValue(DEFAULT_SYSTEM_ACCESS_HOURS.saturday.end),
            },
            sunday: {
              ...DEFAULT_SYSTEM_ACCESS_HOURS.sunday,
              start: toTimeValue(DEFAULT_SYSTEM_ACCESS_HOURS.sunday.start),
              end: toTimeValue(DEFAULT_SYSTEM_ACCESS_HOURS.sunday.end),
            },
          },
        });
        setChangePassword(false);
      }
    }
  }, [visible, editingUser, form]);

  const handleSubmit = async (values: any) => {
    const submitData = { ...values };
    if (submitData.role !== "operator") {
      submitData.sucursal = null;
      delete submitData.system_access_hours;
    } else {
      submitData.system_access_hours = normalizeAccessHours(submitData.system_access_hours);
    }

    if (editingUser && !changePassword) {
      delete submitData.password;
      delete submitData.confirmPassword;
    }

    const success = await onSubmit(submitData);
    if (success) {
      form.resetFields();
      setChangePassword(false);
      onCancel();
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setChangePassword(false);
    onCancel();
  };

  const handleChangePasswordToggle = (checked: boolean) => {
    setChangePassword(checked);
    if (!checked) {
      form.setFieldsValue({ password: "", confirmPassword: "" });
    }
  };

  return (
    <Modal
      title={editingUser ? "Editar Usuario" : "Nuevo Usuario"}
      open={visible}
      onCancel={handleCancel}
      onOk={form.submit}
      okText="Guardar"
      cancelText="Cancelar"
      width={760}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Email requerido" },
            { type: "email", message: "Email inválido" },
          ]}
        >
          <Input size="large" />
        </Form.Item>

        <Form.Item
          name="role"
          label="Rol"
          rules={[{ required: true, message: "Rol requerido" }]}
        >
          <Select size="large" disabled={!canAssignRoles}>
            <Select.Option value="admin">Administrador</Select.Option>
            <Select.Option value="operator">Operador</Select.Option>
            <Select.Option value="seller">Vendedor</Select.Option>
          </Select>
        </Form.Item>

        {/* Checkbox para cambiar contraseña en modo edición */}
        {selectedRole === "operator" && (
          <Form.Item
            name="sucursal"
            label="Sucursal asignada"
            rules={[{ required: true, message: "Sucursal requerida para operadores" }]}
          >
            <Select
              size="large"
              placeholder="Selecciona una sucursal"
              options={sucursales.map((sucursal) => ({
                label: sucursal.nombre,
                value: sucursal._id,
              }))}
            />
          </Form.Item>
        )}

        {canAssignRoles && selectedRole === "operator" && (
          <div style={{ marginBottom: 16, padding: 16, border: "1px solid #f0f0f0", borderRadius: 8 }}>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              Horarios de acceso al sistema
            </Typography.Title>
            <Typography.Text type="secondary">
              El domingo queda desactivado por defecto, pero puedes habilitarlo si hace falta.
            </Typography.Text>

            <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
              <div>
                <Form.Item name={["system_access_hours", "weekdays", "enabled"]} valuePropName="checked" style={{ marginBottom: 8 }}>
                  <Switch checkedChildren="L-V habilitado" unCheckedChildren="L-V deshabilitado" />
                </Form.Item>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Form.Item name={["system_access_hours", "weekdays", "start"]} label="Inicio L-V" rules={[{ required: weekdaysEnabled !== false, message: "Indica la hora de inicio" }]}>
                    <TimePicker format="HH:mm" minuteStep={15} style={{ width: "100%" }} disabled={weekdaysEnabled === false} />
                  </Form.Item>
                  <Form.Item name={["system_access_hours", "weekdays", "end"]} label="Fin L-V" rules={[{ required: weekdaysEnabled !== false, message: "Indica la hora de fin" }]}>
                    <TimePicker format="HH:mm" minuteStep={15} style={{ width: "100%" }} disabled={weekdaysEnabled === false} />
                  </Form.Item>
                </div>
              </div>

              <div>
                <Form.Item name={["system_access_hours", "saturday", "enabled"]} valuePropName="checked" style={{ marginBottom: 8 }}>
                  <Switch checkedChildren="Sábado habilitado" unCheckedChildren="Sábado deshabilitado" />
                </Form.Item>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Form.Item name={["system_access_hours", "saturday", "start"]} label="Inicio sábado" rules={[{ required: saturdayEnabled !== false, message: "Indica la hora de inicio" }]}>
                    <TimePicker format="HH:mm" minuteStep={15} style={{ width: "100%" }} disabled={saturdayEnabled === false} />
                  </Form.Item>
                  <Form.Item name={["system_access_hours", "saturday", "end"]} label="Fin sábado" rules={[{ required: saturdayEnabled !== false, message: "Indica la hora de fin" }]}>
                    <TimePicker format="HH:mm" minuteStep={15} style={{ width: "100%" }} disabled={saturdayEnabled === false} />
                  </Form.Item>
                </div>
              </div>

              <div>
                <Form.Item name={["system_access_hours", "sunday", "enabled"]} valuePropName="checked" style={{ marginBottom: 8 }}>
                  <Switch checkedChildren="Domingo habilitado" unCheckedChildren="Domingo deshabilitado" />
                </Form.Item>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Form.Item name={["system_access_hours", "sunday", "start"]} label="Inicio domingo" rules={[{ required: sundayEnabled !== false, message: "Indica la hora de inicio" }]}>
                    <TimePicker format="HH:mm" minuteStep={15} style={{ width: "100%" }} disabled={sundayEnabled === false} />
                  </Form.Item>
                  <Form.Item name={["system_access_hours", "sunday", "end"]} label="Fin domingo" rules={[{ required: sundayEnabled !== false, message: "Indica la hora de fin" }]}>
                    <TimePicker format="HH:mm" minuteStep={15} style={{ width: "100%" }} disabled={sundayEnabled === false} />
                  </Form.Item>
                </div>
              </div>
            </div>
          </div>
        )}

        {editingUser && (
          <Form.Item>
            <Checkbox
              checked={changePassword}
              onChange={(e) => handleChangePasswordToggle(e.target.checked)}
            >
              Cambiar contraseña
            </Checkbox>
          </Form.Item>
        )}

        {/* Campos de contraseña */}
        {(!editingUser || changePassword) && (
          <>
            <Form.Item
              name="password"
              label="Contraseña"
              rules={[
                { required: true, message: "Contraseña requerida" },
                { min: 6, message: "Mínimo 6 caracteres" },
              ]}
            >
              <Input.Password
                size="large"
                placeholder={editingUser ? "Nueva contraseña" : "Contraseña"}
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Confirmar contraseña"
              dependencies={["password"]}
              rules={[
                { required: true, message: "Confirma la contraseña" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error("Las contraseñas no coinciden")
                    );
                  },
                }),
              ]}
            >
              <Input.Password size="large" placeholder="Confirmar contraseña" />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default UserFormModal;
