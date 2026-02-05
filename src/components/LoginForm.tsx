import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Select, Button, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { getSucursalsAPI } from "../api/sucursal";
import { checkLoginAPI, getUserByCookieAPI } from "../api/user";
import { UserContext } from "../context/userContext";
import { IBranch } from "../models/branchModel";

type LoginFormProps = {
  showBranchSelect: boolean;
  redirectTo: string;
}

export default function LoginForm({ showBranchSelect, redirectTo }: LoginFormProps) {
  const [form] = Form.useForm();
  const [branches, setBranches] = useState<IBranch[]>([]);
  const [loading, setLoading] = useState(false);
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();

  interface formValues {
    sucursalId: string,
    email: string,
    password: string,
  }

  useEffect(() => {
    if (!showBranchSelect) return;
    fetchBranches();
  }, [showBranchSelect]);

  const fetchBranches = async () => {
    const data = await getSucursalsAPI()
    if (!data) {
      setBranches([])
      return message.error("No se pudieron cargar las sucursales")
    }
    setBranches(data)
  }

  const onFinish = async (values: formValues) => {
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
