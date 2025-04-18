import StatisticsDashboard from "./StatsDashboard";
import { Outlet } from "react-router-dom";
import SellerFacturaButton from "../../components/SellerFacturaButton";
import { useState } from "react";
const StatsPage = () => {
    const [isOpen, setIsOpen] = useState(true);
    return (<div>
        <StatisticsDashboard />
        <SellerFacturaButton isOpen={isOpen} />
    </div>

    );
    //const [isOpen, setIsOpen] = useState(true);
    //return (
    //    <div className="p-4 space-y-4">
    //        {/* Contenido de estadísticas */}
    //        <h1 className="text-xl font-bold">Dashboard de Estadísticas</h1>
    //        <StatisticsDashboard />
    //        {/* Aquí agregas el botón */}
    //        <SellerFacturaButton isOpen={isOpen} />
    //    </div>
    //);
};
export default StatsPage;
