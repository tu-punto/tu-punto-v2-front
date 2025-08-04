import React, { useEffect, useState } from "react";
import ServiciosResumenTable from "./components/ServicesSummaryTable";
import { getServicesSummaryAPI } from "../../api/services";
import servicesIcon from "../../assets/services2.png";

export const ServicePanelPage: React.FC<{ isFactura: boolean }> = () => {
  const [summary, setSummary] = useState<any | null>(null);
  const [sucursals, setSucursals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getServicesSummaryAPI();

        const sucursalesFiltradas = Object.keys(data).filter(
          (s) => s !== "TOTAL"
        );

        setSummary(data);
        setSucursals(sucursalesFiltradas);
      } catch (err) {
        console.error("Error al cargar resumen de servicios", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md mb-4">
        <img src={servicesIcon} alt="Servicios" className="w-16" />
        <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">
          PANEL DE CONTROL DE SERVICIOS
        </h1>
      </div>

      {loading ? (
        <p className="text-center text-lg">Cargando resumen...</p>
      ) : summary && sucursals.length ? (
        <ServiciosResumenTable summary={summary} allSucursals={sucursals} />
      ) : (
        <p className="text-red-600 text-center">No se pudo cargar la información.</p>
      )}
    </div>
  );
};

export default ServicePanelPage;