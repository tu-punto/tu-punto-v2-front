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
      panelLabel="Flujo vendedor"
      panelTitle="Todo tu trabajo en un solo lugar"
      panelDescription="Consulta ventas, servicios, stock y cobros con un acceso visualmente más limpio y moderno."
      highlights={[
        { title: "Ventas", value: "Rápidas y seguras" },
        { title: "Stock", value: "Controlado por sucursal" },
        { title: "Cobros", value: "Sin pasos extra" },
      ]}
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
