import { useNavigate } from "react-router-dom";
import LoginTemplate from "../../components/LoginTemplate";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  
  return (
    <LoginTemplate
      title="Tu Punto (Admin)"
      buttonTitle="Iniciar sesión como Vendedor"
      buttonOnClick={() => navigate("/login-seller")}
      showBranchSelect
      redirectTo="/stock"
    />
  )
}
