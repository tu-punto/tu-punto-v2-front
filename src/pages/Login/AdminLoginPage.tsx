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
      subtitle=""
      badge="Tu Punto · Admin"
      accentClassName="bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.26),transparent_28%)]"
      highlights={[]}
      heroImage="/login-admin-hero.png"
      heroImageAlt="Panel interno de administración"
      heroImageClassName="object-cover object-center"
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
