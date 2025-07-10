import { Modal, Form, Input, Select } from "antd";
import { useEffect } from "react";

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

  useEffect(() => {
    if (visible) {
      if (editingUser) {
        form.setFieldsValue({
          email: editingUser.email,
          role: editingUser.role,
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, editingUser, form]);

  const handleSubmit = async (values: any) => {
    const success = await onSubmit(values);
    if (success) {
      form.resetFields();
      onCancel();
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
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

        {!editingUser && (
          <Form.Item
            name="password"
            label="Contraseña"
            rules={[
              { required: true, message: "Contraseña requerida" },
              { min: 6, message: "Mínimo 6 caracteres" },
            ]}
          >
            <Input.Password size="large" />
          </Form.Item>
        )}

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
      </Form>
    </Modal>
  );
};

export default UserFormModal;
