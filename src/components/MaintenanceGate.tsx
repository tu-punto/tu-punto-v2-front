import { Button, Result, Spin, Typography, message } from "antd";
import { useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/userContext";
import { logoutUserAPI } from "../api/user";
import { getMaintenanceModeStatusAPI, type MaintenanceModeStatus } from "../api/maintenanceMode";
import { normalizeRole } from "../utils/role";

const MaintenanceGate = ({ children }: { children: ReactNode }) => {
  const { user, loading, setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const [status, setStatus] = useState<MaintenanceModeStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const loginRoute = normalizeRole(user?.role) === "seller" ? "/login-seller" : "/login-admin";

  useEffect(() => {
    if (loading) return;
    if (!user?._id) {
      setStatus(null);
      setChecking(false);
      return;
    }

    let cancelled = false;
    setChecking(true);

    (async () => {
      try {
        const res = await getMaintenanceModeStatusAPI();
        if (!cancelled && res?.success) {
          setStatus(res.data || null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("No se pudo evaluar el mantenimiento:", error);
          setStatus(null);
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, user?._id, user?.role]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutUserAPI();
    } catch (_error) {
      message.error("No se pudo cerrar la sesion");
    } finally {
      setUser(null);
      setLoggingOut(false);
      navigate(loginRoute, { replace: true });
    }
  };

  if (loading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spin size="large" tip="Verificando acceso..." />
      </div>
    );
  }

  if (!status?.blocked) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#f8fbff,_#edf3ff_45%,_#e2e8f0)] p-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.14)] backdrop-blur">
        <Result
          status="warning"
          title="Sistema en mantenimiento"
          subTitle={
            <div className="space-y-2 text-base text-slate-600">
              <Typography.Paragraph className="!mb-0 text-slate-600">
                {status.message}
              </Typography.Paragraph>
              {status.subtitle ? (
                <Typography.Text className="block text-slate-500">
                  {status.subtitle}
                </Typography.Text>
              ) : null}
            </div>
          }
          extra={
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => window.location.reload()}>Reintentar</Button>
              <Button danger loading={loggingOut} onClick={() => void handleLogout()}>
                Cerrar sesión
              </Button>
            </div>
          }
        />
      </div>
    </div>
  );
};

export default MaintenanceGate;
