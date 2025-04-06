import { Link } from "react-router-dom";
import "./Sidebar.css";
import { useContext } from "react";
import { UserContext } from "../../context/userContext";
import { menu } from "../../constants/menu";
import { Button, message } from "antd";
import { logoutUserAPI } from "../../api/user";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  isMobile: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  toggleSidebar,
  isMobile,
}) => {
  const { user, setUser } = useContext(UserContext)!;

  const handleLogout = async () => {
    try {
      const res = await logoutUserAPI();
      if (!res?.success) {
        message.error("Error al cerrar sesión");
      }
      setUser(null);
      message.success("Sesión cerrada correctamente");
    } catch (error) {
      message.error("Error al cerrar sesión");
      console.error(error);
    }
  };

  const filteredMenuItems = menu.filter((item) =>
    item.roles.includes(user?.role)
  );

  return (
    <div className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <button
        className="text-light-blue text-2xl p-4 bg-transparent hover:bg-light-blue/10 self-start"
        onClick={toggleSidebar}
      >
        &#9776;
      </button>
      <div className="flex flex-col bg-blue">
        {filteredMenuItems.map((item) => (
          <Link
            to={item.path}
            className="flex items-center p-4 bg-blue hover:bg-light-blue/10 transition-colors duration-200"
            key={item.path}
          >
            <img src={item.icon} alt={item.label} className="w-6 h-6 mx-3" />
            {isOpen && (
              <span className="ml-2 text-mobile-sm xl:text-desktop-sm whitespace-normal break-words text-left">
                {item.label}
              </span>
            )}
          </Link>
        ))}
      </div>
      {isMobile && (
        <Button
          onClick={handleLogout}
          type="text"
          className="bg-light-blue text-dark-blue text-mobile-sm"
        >
          Cerrar sesión
        </Button>
      )}
    </div>
  );
};

export default Sidebar;
