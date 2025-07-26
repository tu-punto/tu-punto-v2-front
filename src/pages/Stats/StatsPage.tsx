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
          to="/servicesPage"
          description="Desglose de servicios"
          icon={sellerIcon}
          isOpen={isOpen}
        />
      </div>
    </div>

  );
};
export default StatsPage;
