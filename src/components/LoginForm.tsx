import { useState, useEffect, useContext } from "react";
import { Form, Input, Select, Button, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { checkLoginAPI, getUserByCookieAPI } from "../api/user";
import { getSucursalsAPI } from "../api/sucursal";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/userContext";

export default function LoginForm({
  showBranchSelect,
  redirectTo,
}: {
  showBranchSelect: boolean;
  redirectTo: string;
}) {
  const [form] = Form.useForm();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!showBranchSelect) return;
    getSucursalsAPI()
      .then((data) => setBranches(data))
      .catch(() => message.error("No se pudieron cargar las sucursales"));
  }, [showBranchSelect]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const loginRes = await checkLoginAPI(values);
      if (!loginRes?.success) {
        return message.error("Login fallido");
      }
      const userRes = await getUserByCookieAPI();
      if (!userRes.success) {
        return message.error("No se recuperó el usuario");
      }
      const selectedBranch = branches.find((b) => b._id === values.sucursalId);
      const branchName = selectedBranch?.nombre || '';

      localStorage.setItem("sucursalId", values.sucursalId);
      localStorage.setItem("sucursalNombre", branchName);
      setUser(userRes.data);
      message.success("¡Bienvenido!");
      navigate(redirectTo);
    } catch {
      message.error("Error en el proceso de login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} className="space-y-6">
      {showBranchSelect && (
        <Form.Item
          name="sucursalId"
          rules={[{ required: true, message: "Selecciona una sucursal" }]}
        >
          <Select placeholder="Sucursal" size="large">
            {branches.map((b) => (
              <Select.Option key={b._id} value={b._id}>
                {b.nombre}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      )}

      <Form.Item
        name="email"
        rules={[{ required: true, message: "Ingresa tu email" }]}
      >
        <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
      </Form.Item>

      <Form.Item
        name="password"
        rules={[{ required: true, message: "Ingresa tu contraseña" }]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="Contraseña" size="large" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" block loading={loading}>
          Iniciar sesión
        </Button>
      </Form.Item>
    </Form>
  );
}
