import LoginForm from "../../components/LoginForm";
import logoImg from "../../../public/logo.png";
import AuthShell from "../../components/AuthShell";

export default function SellerLoginPage() {
  return (
    <AuthShell
      title="Acceso de vendedor"
      subtitle="Ingresa a tu panel con una experiencia más clara, rápida y enfocada en ventas y seguimiento diario."
      badge="Tu Punto · Vendedor"
      accentClassName="bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.28),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.18),transparent_28%)]"
      highlights={[
        { title: "vendedores activos", value: "120+" },
        { title: "sucursales físicas", value: "5" },
        { title: "ciudades principales", value: "4" },
      ]}
      heroImage="/login-seller-hero.png"
      heroImageAlt="Acceso de vendedor"
      heroImageClassName="object-cover object-center"
    >
      <div className="mb-8 flex items-center gap-4">
        <img alt="logo" src={logoImg} className="h-14 w-14 rounded-2xl object-contain shadow-sm" />
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Tu Punto</div>
          <h2 className="text-2xl font-black text-slate-900">Ingreso de vendedor</h2>
        </div>
      </div>
      <LoginForm showBranchSelect={false} redirectTo="/seller-info" />
    </AuthShell>
  );
}
