import { Link } from "react-router-dom";

type SidebarNavButtonProps = {
  to: string;
  description: string;
  icon: string;
  isOpen: boolean;
};

const SidebarNavButton = ({ to, description, icon, isOpen }: SidebarNavButtonProps) => {
  return (
    <Link
      to={to}
      className="flex items-center p-4 bg-blue hover:bg-light-blue/10 transition-colors duration-200"
    >
      <img src={icon} alt={description} className="w-6 h-6 mx-3" />
      {isOpen && (
        <span className="ml-2 text-mobile-sm xl:text-desktop-sm whitespace-normal break-words text-left">
          {description}
        </span>
      )}
    </Link>
  );
};

export default SidebarNavButton;
