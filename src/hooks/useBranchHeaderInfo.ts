import { useEffect, useState } from "react";
import { getSucursalHeaderInfoAPI } from "../api/sucursal";

interface BranchHeaderInfo {
  sucursalNombre: string;
  sucursalImagenHeader: string;
}

const DEFAULT_INFO: BranchHeaderInfo = {
  sucursalNombre: "Sin sucursal",
  sucursalImagenHeader: "",
};

export const useBranchHeaderInfo = () => {
  const [branchHeaderInfo, setBranchHeaderInfo] = useState<BranchHeaderInfo>({
    sucursalNombre: localStorage.getItem("sucursalNombre") || DEFAULT_INFO.sucursalNombre,
    sucursalImagenHeader: localStorage.getItem("sucursalImagenHeader") || DEFAULT_INFO.sucursalImagenHeader,
  });

  useEffect(() => {
    let mounted = true;

    const syncBranchInfo = async () => {
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
  }, []);

  return branchHeaderInfo;
};
