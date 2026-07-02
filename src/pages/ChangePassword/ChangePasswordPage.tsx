import { useContext, useMemo, useState } from "react";
import { Alert, Button, Form, Input, Progress, Space, Typography, message } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, KeyOutlined, LockOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import logoImg from "../../../public/logo.png";
import { changePasswordAPI } from "../../api/user";
import { UserContext } from "../../context/userContext";
import { normalizeRole } from "../../utils/role";

const { Text, Title } = Typography;

const passwordChecks = [
  { key: "length", label: "Minimo 8 caracteres", test: (value: string) => value.length >= 8 },
  { key: "lowercase", label: "Una letra minuscula", test: (value: string) => /[a-z]/.test(value) },
  { key: "uppercase", label: "Una letra mayuscula", test: (value: string) => /[A-Z]/.test(value) },
  { key: "number", label: "Un numero", test: (value: string) => /\d/.test(value) },
  { key: "symbol", label: "Un simbolo", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

const getPasswordStatus = (password: string) => {
  const checks = passwordChecks.map((check) => ({
    ...check,
    passed: check.test(password),
  }));
  const passed = checks.filter((check) => check.passed).length;
  const percent = Math.round((passed / passwordChecks.length) * 100);
  const label = passed <= 2 ? "Debil" : passed <= 4 ? "Media" : "Fuerte";
  const status = passed <= 2 ? "exception" : passed <= 4 ? "normal" : "success";
  return { checks, passed, percent, label, status };
};

const getDefaultRedirect = (role?: string) => {
  if (normalizeRole(role) === "seller") return "/seller-info";
  return "/stock";
};

export default function ChangePasswordPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const newPassword = Form.useWatch("newPassword", form) || "";
  const passwordStatus = useMemo(() => getPasswordStatus(String(newPassword || "")), [newPassword]);

  const validateNewPassword = (_: unknown, value: string) => {
    const password = String(value || "");
    if (!password) return Promise.reject(new Error("Ingresa una nueva contrasena"));

    const missing = getPasswordStatus(password)
      .checks
      .filter((check) => !check.passed)
      .map((check) => check.label);

    if (missing.length > 0) {
      return Promise.reject(new Error(`Falta: ${missing.join(", ")}`));
    }

    return Promise.resolve();
  };

  const onFinish = async (values: any) => {
    setServerErrors([]);
    setLoading(true);
    try {
      const response = await changePasswordAPI(values);
      if (!response?.success) {
        const details = Array.isArray(response?.details) ? response.details.map(String) : [];
        setServerErrors(details.length ? details : [response?.msg || response?.error || "No se pudo cambiar la contrasena"]);
        message.error(response?.msg || response?.error || "No se pudo cambiar la contrasena");
        return;
      }

      const updatedUser = response.data?.data;
      const nextRole = normalizeRole(updatedUser?.role || user?.role);
      setUser({
        ...(user || {}),
        ...(updatedUser || {}),
        role: nextRole,
        must_change_password: false,
      });
      message.success("Contrasena actualizada");
      navigate(getDefaultRedirect(nextRole), { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 bg-[url('/background-login.png')] bg-cover bg-center px-4 py-8">
      <div className="w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-[#f97316] p-8 text-white">
            <img alt="logo" src={logoImg} className="h-20 w-20 rounded-full bg-white object-contain p-1" />
            <Title level={2} style={{ color: "white", marginTop: 28, marginBottom: 10 }}>
              Cambiar contrasena
            </Title>
            <Text style={{ color: "rgba(255,255,255,0.86)" }}>
              Protege tu cuenta con una contrasena distinta a la actual.
            </Text>
            <div className="mt-8 rounded-md bg-white/12 p-4">
              <Space align="center">
                <SafetyCertificateOutlined style={{ fontSize: 22 }} />
                <div>
                  <div className="font-semibold">Acceso para todos los roles</div>
                  <div className="text-sm text-white/80">Admin, operador, superadmin y vendedor.</div>
                </div>
              </Space>
            </div>
          </div>

          <div className="p-8">
            {serverErrors.length > 0 && (
              <Alert
                type="error"
                showIcon
                style={{ marginBottom: 18 }}
                message="No se pudo cambiar la contrasena"
                description={
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    {serverErrors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                }
              />
            )}

            <Form form={form} layout="vertical" onFinish={onFinish} className="space-y-4">
              <Form.Item
                name="currentPassword"
                label="Contrasena actual"
                rules={[{ required: true, message: "Ingresa tu contrasena actual" }]}
              >
                <Input.Password prefix={<LockOutlined />} size="large" autoComplete="current-password" />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label="Nueva contrasena"
                validateTrigger={["onChange", "onBlur"]}
                rules={[{ validator: validateNewPassword }]}
              >
                <Input.Password prefix={<KeyOutlined />} size="large" autoComplete="new-password" />
              </Form.Item>

              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <Text strong>Nivel: {passwordStatus.label}</Text>
                  <Text type="secondary">{passwordStatus.passed}/{passwordChecks.length}</Text>
                </div>
                <Progress
                  percent={passwordStatus.percent}
                  status={passwordStatus.status as "success" | "exception" | "normal"}
                  showInfo={false}
                />
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {passwordStatus.checks.map((check) => (
                    <div key={check.key} className="flex items-center gap-2 text-sm">
                      {check.passed ? (
                        <CheckCircleOutlined style={{ color: "#16a34a" }} />
                      ) : (
                        <CloseCircleOutlined style={{ color: "#9ca3af" }} />
                      )}
                      <span className={check.passed ? "text-gray-800" : "text-gray-500"}>{check.label}</span>
                    </div>
                  ))}
                </div>
              </div>

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
                <Input.Password prefix={<KeyOutlined />} size="large" autoComplete="new-password" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" block loading={loading} size="large">
                  Guardar contrasena
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
