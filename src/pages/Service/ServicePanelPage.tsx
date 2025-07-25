import React, { useEffect, useState } from "react";
import ServiciosResumenTable from "./components/ServicesSummaryTable";
import { getServicesSummaryAPI } from "../../api/services";
import { getSucursalsAPI } from "../../api/sucursal";

export const ServicePanelPage: React.FC<{ isFactura: boolean }> = () => {
  const [summary, setSummary] = useState<any | null>(null);
  const [sucursals, setSucursals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { success, data, message } = await getSucursalsAPI();
        if (success) {
          setSucursals(data.map((s: any) => s.nombre || s.name || s.sucursalName));
        } else {
          console.error("Error al obtener sucursales:", message);
        }
      } catch (error) {
        console.error("Fallo al obtener sucursales", error);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getServicesSummaryAPI();
        setSummary(data);
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
        <img src="/config-icon.png" alt="Vendedores" className="w-8 h-8" />
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