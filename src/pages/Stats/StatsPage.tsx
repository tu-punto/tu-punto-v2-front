import StatisticsDashboard from "./StatsDashboard";
import SidebarNavButton from "../../components/SidebarNavButton";
import ReportsLauncher from "../../components/ReportsLauncher";
import sellerIcon from "../../assets/sellersIcon.svg";
import servicesIcon from "../../assets/services.png";

import { useState } from "react";

const StatsPage = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div>
      <div className="px-4 pt-4 flex justify-end">
        <ReportsLauncher />
      </div>
      <StatisticsDashboard />
      <div className="p-2 space-y-2">
        <SidebarNavButton 
          to="/sellerFactura"
          description="Detalle Vendedores"
          icon={sellerIcon}
          isOpen={isOpen}
        />
        <SidebarNavButton 
          to="/servicesPage"
          description="Desglose de servicios"
          icon={servicesIcon} 
          isOpen={isOpen}
        />
      </div>
    </div>

  );
};
export default StatsPage;
