import { useNavigate } from "react-router-dom";
import { Button } from "antd";

import LoginForm from "../../components/LoginForm";
import logoImg from "../../../public/logo.png";

export default function SellerLoginPage() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 bg-[url('/background-login.png')] bg-cover bg-center">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <img
            alt="logo"
            src={logoImg}
            className="mx-auto h-20 w-auto rounded-full"
          />
          <h2 className="mt-6 text-mobile-2xl xl:text-desktop-3xl font-bold text-gray-900">
            Tu Punto (Vendedor)
          </h2>
        </div>
        <LoginForm showBranchSelect={false} redirectTo="/seller-info" />
        <div className="text-center">
          <Button
            type="default"
            onClick={() => navigate("/login-admin")}
            className="w-full"
          >
            Iniciar sesión como Admin
          </Button>
        </div>
      </div>
    </div>
  );
}