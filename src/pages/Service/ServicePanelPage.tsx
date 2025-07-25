import React from "react";
import ServicesSummaryTable from "./components/ServicesSummaryTable";
import { useEffect, useState } from "react";
import { getSellersAPI } from "../../api/seller";
import { ISeller } from "../../models/sellerModels";

export const ServicePanelPage: React.FC<{ isFactura: boolean }> = () => {
  const [sellers, setSellers] = useState<ISeller[]>([]);

  useEffect(() => {
    (async () => {
      const res = await getSellersAPI();
      setSellers(res.data || res);
    })();
  }, []);

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md mb-4">
        <img src="/seller-icon.png" alt="Vendedores" className="w-8 h-8" />
        <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">
          PANEL DE CONTROL DE SERVICIOS
        </h1>
      </div>

      <ServicesSummaryTable sellers={sellers} />
    </div>
  );
};

export default ServicePanelPage;