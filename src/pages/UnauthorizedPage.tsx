import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { usePublicPageTitle } from "../utils/publicPageTitle";

const UnauthorizedPage = () => {
  usePublicPageTitle();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as any) || {};
  const redirectTo = String(state.redirectTo || "").trim() || "";
  const seconds = Number(state.seconds || 4);
  const [countdown, setCountdown] = useState(Number.isFinite(seconds) && seconds > 0 ? seconds : 4);
  const shouldRedirect = Boolean(redirectTo);

  useEffect(() => {
    if (!shouldRedirect) return;

    if (countdown <= 0) {
      navigate(redirectTo, { replace: true });
      return;
    }

    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, navigate, redirectTo, shouldRedirect]);

  const statusLabel = useMemo(() => {
    const reason = String(state.reason || "").trim();
    if (reason === "stock") return "Stock";
    if (reason === "sales") return "Carrito";
    if (reason === "shop") return "Vender";
    if (reason === "simple-packages") return "Paquetes";
    return "esta pagina";
  }, [state.reason]);

  return (
    <div className="h-screen flex flex-col justify-center items-center bg-gray-100">
      <h1 className="text-5xl font-bold text-red-600">403</h1>
      <p className="text-mobile-lg xl:text-desktop-lg mt-2 text-gray-800">Acceso denegado</p>
      <p className="text-mobile-base xl:text-desktop-base mt-4 text-gray-600">
        No tienes permisos para ver {statusLabel}.
      </p>
      {shouldRedirect && (
        <p className="text-mobile-base xl:text-desktop-base mt-2 text-gray-500">
          Redirigiendote a Mi Informacion en {Math.max(0, countdown)} segundos...
        </p>
      )}
      <Link to="/" className="text-mobile-lg xl:text-desktop-lg mt-6 text-blue-500 hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
};

export default UnauthorizedPage;

