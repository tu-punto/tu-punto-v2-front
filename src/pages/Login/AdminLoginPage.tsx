import { Button } from "antd";
import { useNavigate } from "react-router-dom";
import LoginForm from "../../components/LoginForm";
import logoImg from "../../../public/logo.png";
import AuthShell from "../../components/AuthShell";

export default function AdminLoginPage() {
  const navigate = useNavigate();

  return (
    <AuthShell
      title="Panel interno de administración"
      subtitle="Accede a las herramientas operativas con una interfaz más seria, clara y pensada para control interno."
      badge="Tu Punto · Admin"
      accentClassName="bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.26),transparent_28%)]"
      panelLabel="Acceso operativo"
      panelTitle="Supervisión de sucursales y flujo interno"
      panelDescription="Gestiona inventario, cierres, vendedores y seguimiento con una entrada más formal y segura."
      highlights={[
        { title: "Sucursales", value: "Selecciona tu punto" },
        { title: "Cierres", value: "Control centralizado" },
        { title: "Usuarios", value: "Acceso interno" },
      ]}
      images={[
        { src: "/login/admin-1.jpg", alt: "Panel admin 1" },
        { src: "/login/admin-2.jpg", alt: "Panel admin 2" },
        { src: "/login/admin-3.jpg", alt: "Panel admin 3" },
      ]}
    >
      <div className="mb-8 flex items-center gap-4">
        <img alt="logo" src={logoImg} className="h-14 w-14 rounded-2xl object-contain shadow-sm" />
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Tu Punto</div>
          <h2 className="text-2xl font-black text-slate-900">Ingreso administrativo</h2>
        </div>
      </div>

      <LoginForm showBranchSelect={true} redirectTo="/stock" />

      <div className="mt-6 text-center">
        <Button type="default" onClick={() => navigate("/login-seller")} className="w-full h-11 rounded-xl">
          Iniciar sesión como vendedor
        </Button>
      </div>
    </AuthShell>
  );
}
