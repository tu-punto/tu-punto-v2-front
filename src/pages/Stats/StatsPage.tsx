import StatisticsDashboard from "./StatsDashboard";
import SidebarNavButton  from "../../components/SidebarNavButton";
import sellerIcon from "../../assets/sellersIcon.svg";

import { useState } from "react";

const StatsPage = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div>
      <StatisticsDashboard />
      <div className="p-2 space-y-2">
        <SidebarNavButton 
          to="/sellerFactura"
          description="Detalle Vendedores"
          icon={sellerIcon}
          isOpen={isOpen}
        />
        <SidebarNavButton 
          to="/sellerFactura"
          description="Desglose de servicios"
          icon={sellerIcon}
          isOpen={isOpen}
        />
        {/* <Link
          to="/services"
          className="flex items-center p-4 bg-blue hover:bg-light-blue/10 transition-colors duration-200"
          key="/breakdownServices"
        >
          <img src={sellerIcon} alt="Desglose de servi" className="w-6 h-6 mx-3" />
          {isOpen && (
            <span className="ml-2 text-mobile-sm xl:text-desktop-sm whitespace-normal break-words text-left">
              Desglose de servicios
            </span>
          )}
        </Link> */}
      </div>
    </div>

  );
};
export default StatsPage;
