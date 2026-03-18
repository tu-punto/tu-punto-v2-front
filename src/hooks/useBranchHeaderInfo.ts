import { useContext, useEffect, useState } from "react";
import { getSucursalHeaderInfoAPI } from "../api/sucursal";
import { UserContext } from "../context/userContext";

interface BranchHeaderInfo {
  sucursalNombre: string;
  sucursalImagenHeader: string;
  pillLabel: string;
}

const DEFAULT_INFO: BranchHeaderInfo = {
  sucursalNombre: "Sin sucursal",
  sucursalImagenHeader: "",
  pillLabel: "Sucursal",
};

export const useBranchHeaderInfo = () => {
  const { user } = useContext(UserContext) || {};
  const [branchHeaderInfo, setBranchHeaderInfo] = useState<BranchHeaderInfo>({
    sucursalNombre: localStorage.getItem("sucursalNombre") || DEFAULT_INFO.sucursalNombre,
    sucursalImagenHeader: localStorage.getItem("sucursalImagenHeader") || DEFAULT_INFO.sucursalImagenHeader,
    pillLabel: DEFAULT_INFO.pillLabel,
  });

  useEffect(() => {
    let mounted = true;

    const syncBranchInfo = async () => {
      if (user?.role === "seller") {
        const sellerName = String(user?.nombre_vendedor || "").trim() || "Vendedor";
        if (mounted) {
          setBranchHeaderInfo({
            sucursalNombre: sellerName,
            sucursalImagenHeader: "",
            pillLabel: "Vendedor",
          });
        }
        return;
      }

      const sucursalId = localStorage.getItem("sucursalId");
      if (!sucursalId) {
        if (mounted) setBranchHeaderInfo(DEFAULT_INFO);
        return;
      }

      try {
        const response = await getSucursalHeaderInfoAPI(sucursalId);
        const branch = response?.data;

        if (!branch || !mounted) return;

        const nextNombre = branch.nombre || DEFAULT_INFO.sucursalNombre;
        const nextImagen = branch.imagen_header || "";

        localStorage.setItem("sucursalNombre", nextNombre);
        localStorage.setItem("sucursalImagenHeader", nextImagen);
        setBranchHeaderInfo({
          sucursalNombre: nextNombre,
          sucursalImagenHeader: nextImagen,
          pillLabel: "Sucursal",
        });
      } catch (error) {
        console.error("No se pudo sincronizar la sucursal para el header", error);
      }
    };

    const handleRefresh = () => {
      syncBranchInfo();
    };

    syncBranchInfo();
    window.addEventListener("branch-header-updated", handleRefresh);
    window.addEventListener("storage", handleRefresh);

    return () => {
      mounted = false;
      window.removeEventListener("branch-header-updated", handleRefresh);
      window.removeEventListener("storage", handleRefresh);
    };
  }, [user?.role, user?.nombre_vendedor]);

  return branchHeaderInfo;
};
