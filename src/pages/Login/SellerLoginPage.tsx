import { useNavigate } from "react-router-dom";
import LoginTemplate from "../../components/LoginTemplate";

export default function SellerLoginPage() {
  const navigate = useNavigate();

  return (
    <LoginTemplate
      title="Tu Punto (Vendedor)"
      buttonTitle="Inicia sesión como Admin"
      buttonOnClick={() => navigate("/login-admin")}
      redirectTo="/seller-info"
    />
  )
}