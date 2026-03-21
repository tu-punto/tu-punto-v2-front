import { Button, message } from "antd";
import "./Header.css";
import logoImg from "../../../public/logo-no-letter-dark-bg.png";
import { logoutUserAPI } from "../../api/user";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { UserContext } from "../../context/userContext";
import { useBranchHeaderInfo } from "../../hooks/useBranchHeaderInfo";

const Header = () => {
  const { user, setUser } = useContext(UserContext)!;
  const navigate = useNavigate();
  const { sucursalNombre, sucursalImagenHeader } = useBranchHeaderInfo();

  const cardStyle = sucursalImagenHeader
    ? {
        backgroundImage: `linear-gradient(92deg, rgba(8,46,84,0.96) 0%, rgba(8,46,84,0.88) 56%, rgba(8,46,84,0.15) 100%), url(${sucursalImagenHeader})`,
      }
    : undefined;

  const handleLogout = async () => {
    try {
      const res = await logoutUserAPI();

      if (!res?.success) {
        message.error("Error al cerrar sesion");
        return;
      }

      setUser(null);
      message.success("Sesion cerrada correctamente");

      if (user?.role === "seller") {
        navigate("/login-seller");
      } else {
        navigate("/login-admin");
      }
    } catch (error) {
      message.error("Error al cerrar sesion");
      console.error(error);
    }
  };

  return (
    <div className="flex justify-between items-center py-2 px-3 bg-blue border-light-gray gap-3">
        <div className="tp-brand-card tp-brand-card--desktop" style={cardStyle}>
        <img src={logoImg} alt="logo" className="tp-brand-card__logo" />
        <div className="tp-brand-card__text">
          <h1 className="tp-brand-card__title">TU PUNTO</h1>
          <div className="tp-branch-pill">
            <span className="tp-branch-pill__dot" />
            <span className="tp-branch-pill__label"></span>
            <span className="tp-branch-pill__name">{sucursalNombre}</span>
          </div>
        </div>
      </div>

      <Button onClick={handleLogout} type="text" className="bg-light-blue text-dark-blue text-mobile-sm xl:text-desktop-sm">
        Cerrar sesion
      </Button>
    </div>
  );
};

export default Header;
