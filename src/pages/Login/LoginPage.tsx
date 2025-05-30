import { useContext, useState, useEffect } from "react";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Form, Input, message, Select } from "antd";
import { checkLoginAPI, getUserByCookieAPI } from "../../api/user";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/userContext";
import logoImg from "../../../public/logo.png";
import { sendHelloAPI } from "../../api/whatsapp";
import { getSucursalsAPI } from "../../api/sucursal"; // asegurate de tener este import

const { Option } = Select;

const LoginPage = () => {
  const { setUser } = useContext(UserContext)!;
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);

  // Llamar a la API para traer las sucursales reales
  const fetchSucursal = async () => {
    try {
      const response = await getSucursalsAPI();
      setBranches(response);
    } catch (error) {
      message.error("Error al obtener las sucursales");
      console.error(error);
    }
  };

  useEffect(() => {
    fetchSucursal();
  }, []);

  const handleFinish = async (values: any) => {
    try {
      console.log("Valores enviados al login:", values);

      const loginRes = await checkLoginAPI(values);
      if (!loginRes?.success) {
        message.error("Error al iniciar sesión");
        return;
      }

      const userRes = await getUserByCookieAPI();
      if (!userRes?.success) {
        message.error("Error al recuperar el usuario");
        return;
      }

      setUser(userRes.data);

      if (userRes.data.role === "seller") {
        navigate("/seller-info");
      } else {
        await sendHelloAPI("+59170186881");
        navigate("/stock");
      }

      message.success("¡Inicio de sesión exitoso!");
    } catch (error) {
      message.error("Error al iniciar sesión");
      console.error(error);
    }
  };

  return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 bg-[url('/background-login.png')] bg-cover bg-center">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <img alt="logo" src={logoImg} className="mx-auto h-20 w-auto rounded-full" />
            <h2 className="mt-6 text-mobile-2xl xl:text-desktop-3xl font-bold text-gray-900">
              Tu Punto
            </h2>
          </div>
          <Form
              name="login"
              initialValues={{ autoLogin: true }}
              onFinish={handleFinish}
              className="mt-8 space-y-6"
          >
            <Form.Item
                name="sucursalId"
                rules={[{ required: true, message: "¡Por favor seleccione una sucursal!" }]}
            >
              <Select
                  size="large"
                  placeholder="Seleccione una sucursal"
                  className="text-mobile-base xl:text-desktop-base border-blue-500"
                  style={{
                    borderRadius: "0.5rem",
                    borderColor: "#3b82f6",
                    boxShadow: "0 1px 4px rgba(59, 130, 246, 0.2)"
                  }}
              >
                {branches.map((branch:any) => (
                    <Option key={branch._id} value={branch._id}>
                      {branch.nombre}
                    </Option>
                ))}
              </Select>
            </Form.Item>
           
            <Form.Item
                name="email"
                rules={[{ required: true, message: "¡Por favor ingrese su email!" }]}
            >
              <Input
                  size="large"
                  prefix={<UserOutlined className="site-form-item-icon" />}
                  placeholder="Correo electrónico"
                  className="text-mobile-base xl:text-desktop-base"
              />
            </Form.Item>

            <Form.Item
                name="password"
                rules={[{ required: true, message: "¡Por favor ingrese su contraseña!" }]}
            >
              <Input.Password
                  size="large"
                  prefix={<LockOutlined className="site-form-item-icon" />}
                  placeholder="Contraseña"
                  className="text-mobile-base xl:text-desktop-base"
              />
            </Form.Item>

            <Form.Item>
              <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  className="text-mobile-lg xl:text-desktop-lg"
              >
                Iniciar sesión
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
  );
};

export default LoginPage;
