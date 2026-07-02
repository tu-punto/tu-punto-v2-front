import { useContext, useState } from "react";
import { Button, Form, Input, Typography, message } from "antd";
import { KeyOutlined, LockOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import logoImg from "../../../public/logo.png";
import { changePasswordAPI } from "../../api/user";
import { UserContext } from "../../context/userContext";
import { normalizeRole } from "../../utils/role";

const { Text } = Typography;

const passwordRules = [
  { pattern: /^.{8,}$/, message: "Minimo 8 caracteres" },
  { pattern: /[a-z]/, message: "Incluye una letra minuscula" },
  { pattern: /[A-Z]/, message: "Incluye una letra mayuscula" },
  { pattern: /\d/, message: "Incluye un numero" },
  { pattern: /[^A-Za-z0-9]/, message: "Incluye un simbolo" },
];

const getDefaultRedirect = (role?: string) => {
  if (normalizeRole(role) === "seller") return "/seller-info";
  return "/stock";
};

export default function ChangePasswordPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await changePasswordAPI(values);
      if (!response?.success) {
        message.error(response?.msg || response?.error || "No se pudo cambiar la contrasena");
        return;
      }

      const updatedUser = response.data?.data;
      setUser({
        ...(user || {}),
        ...(updatedUser || {}),
        role: normalizeRole(updatedUser?.role || user?.role),
        must_change_password: false,
      });
      message.success("Contrasena actualizada");
      navigate(getDefaultRedirect(updatedUser?.role || user?.role), { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 bg-[url('/background-login.png')] bg-cover bg-center px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <img alt="logo" src={logoImg} className="mx-auto h-20 w-auto rounded-full" />
          <h2 className="mt-6 text-mobile-2xl xl:text-desktop-3xl font-bold text-gray-900">
            Cambiar contrasena
          </h2>
          <Text type="secondary">
            Define una contrasena nueva para continuar usando el sistema.
          </Text>
        </div>

        <Form form={form} layout="vertical" onFinish={onFinish} className="space-y-4">
          <Form.Item
            name="currentPassword"
            label="Contrasena actual"
            rules={[{ required: true, message: "Ingresa tu contrasena actual" }]}
          >
            <Input.Password prefix={<LockOutlined />} size="large" />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="Nueva contrasena"
            rules={[
              { required: true, message: "Ingresa una nueva contrasena" },
              ...passwordRules,
            ]}
          >
            <Input.Password prefix={<KeyOutlined />} size="large" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirmar contrasena"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Confirma la nueva contrasena" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Las contrasenas no coinciden"));
                },
              }),
            ]}
          >
            <Input.Password prefix={<KeyOutlined />} size="large" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Guardar contrasena
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
