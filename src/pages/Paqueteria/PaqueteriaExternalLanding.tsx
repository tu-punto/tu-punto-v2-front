import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Spin, message } from "antd";
import { useContext, useEffect, useState } from "react";
import { getPublicPaqueteriaBySlugAPI } from "../../api/paqueterias";
import { getMyCourierAPI } from "../../api/paqueteriaPortal";
import { checkLoginAPI, getUserByCookieAPI, logoutUserAPI } from "../../api/user";
import { UserContext } from "../../context/userContext";
import { normalizeRole } from "../../utils/role";
import PaqueteriaExternaPortal from "./PaqueteriaExternaPortal";

export default function PaqueteriaExternalLanding({ slug }: { slug: string }) {
  const { setUser } = useContext(UserContext);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const validateSession = async () => {
    const userRes = await getUserByCookieAPI();
    if (!userRes?.success || normalizeRole(userRes.data?.role) !== "paqueteria") return false;
    try {
      const ownCourier = await getMyCourierAPI();
      if (ownCourier?.data?.tipo !== "externa" || ownCourier.data.slug !== slug) return false;
      setUser({ ...userRes.data, role: "paqueteria", must_change_password: userRes.data?.must_change_password === true });
      setCompany((current: any) => ({ ...current, ...ownCourier.data }));
      setAuthenticated(true);
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const result = await getPublicPaqueteriaBySlugAPI(slug);
        setCompany(result.data);
        await validateSession();
      } catch (requestError: any) {
        setError(requestError?.response?.status === 404 ? "Esta paquetería no existe o no está disponible." : "No se pudo cargar la paquetería.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [slug]);

  const login = async (values: { email: string; password: string }) => {
    setLoggingIn(true);
    try {
      const loginResult = await checkLoginAPI(values);
      if (!loginResult?.success) {
        message.error(loginResult?.msg || loginResult?.error || "No se pudo iniciar sesión");
        return;
      }
      if (!(await validateSession())) {
        await logoutUserAPI();
        message.error("Esta cuenta no pertenece a esta paquetería.");
      }
    } catch {
      message.error("No se pudo iniciar sesión");
    } finally {
      setLoggingIn(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Spin size="large" /></div>;
  if (error || !company) return <div className="min-h-screen flex items-center justify-center p-5 bg-slate-50"><Alert type="error" showIcon message="Acceso no disponible" description={error || "No se encontró la paquetería."} /></div>;
  if (authenticated) return <PaqueteriaExternaPortal company={company} />;

  const primary = company.color_primario || "#1677ff";
  const secondary = company.color_secundario || "#f8fafc";
  return <div className="min-h-screen flex items-center justify-center p-5" style={{ background: secondary }}>
    <Card className="w-full max-w-md overflow-hidden" styles={{ body: { padding: 0 } }}>
      <div className="p-8 text-center" style={{ borderTop: `6px solid ${primary}` }}>
        {company.logo_url ? <img src={company.logo_url} alt={`Logo de ${company.nombre}`} className="mx-auto mb-5 h-20 w-20 rounded-2xl object-contain bg-white shadow-sm" /> : <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold text-white" style={{ background: primary }}>{company.nombre.slice(0, 1).toUpperCase()}</div>}
        <p className="mb-1 text-sm uppercase tracking-[0.2em] text-slate-500">Portal de paquetería</p>
        <h1 className="m-0 text-2xl font-bold text-slate-900">{company.nombre}</h1>
        <p className="mt-3 text-slate-500">Ingresa para registrar y consultar tus pedidos.</p>
      </div>
      <div className="border-t border-slate-100 p-6">
        <Form layout="vertical" onFinish={login} requiredMark={false}>
          <Form.Item name="email" label="Correo electrónico" rules={[{ required: true, type: "email", message: "Ingresa un correo válido" }]}><Input size="large" prefix={<UserOutlined />} autoComplete="email" /></Form.Item>
          <Form.Item name="password" label="Contraseña" rules={[{ required: true, message: "Ingresa tu contraseña" }]}><Input.Password size="large" prefix={<LockOutlined />} autoComplete="current-password" /></Form.Item>
          <Button htmlType="submit" type="primary" size="large" block loading={loggingIn} style={{ background: primary, borderColor: primary }}>Ingresar</Button>
        </Form>
      </div>
    </Card>
  </div>;
}
