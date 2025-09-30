import { Modal, Form, Input, Select, Checkbox } from "antd";
import { useEffect, useState } from "react";

interface UserFormModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => Promise<boolean>;
  editingUser?: any;
}

const UserFormModal = ({
  visible,
  onCancel,
  onSubmit,
  editingUser,
}: UserFormModalProps) => {
  const [form] = Form.useForm();
  const [changePassword, setChangePassword] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editingUser) {
        form.setFieldsValue({
          email: editingUser.email,
          role: editingUser.role,
        });
        setChangePassword(false);
      } else {
        form.resetFields();
        setChangePassword(false);
      }
    }
  }, [visible, editingUser, form]);

  const handleSubmit = async (values: any) => {
    const submitData = { ...values };
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
      width={500}
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
          <Select size="large">
            <Select.Option value="admin">Administrador</Select.Option>
            <Select.Option value="seller">Vendedor</Select.Option>
          </Select>
        </Form.Item>

        {/* Checkbox para cambiar contraseña en modo edición */}
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
