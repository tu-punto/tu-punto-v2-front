import { normalizeRole } from "./role";

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const branchesEnableCommissionService = (branches: any[] = []) =>
  (Array.isArray(branches) ? branches : []).some(
    (branch) =>
      toNumber(branch?.almacenamiento ?? branch?.alquiler) > 0 ||
      toNumber(branch?.exhibicion) > 0
  );

export const branchesEnableSimplePackageService = (branches: any[] = []) =>
  (Array.isArray(branches) ? branches : []).some(
    (branch) => toNumber(branch?.entrega_simple) > 0
  );

export const hasSimplePackageService = (user?: any) =>
  normalizeRole(user?.role) === "seller" && user?.seller_has_simple_package_service === true;

// Temporal: permitir carrito a todos los vendedores sin tocar la regla de stock.
export const TEMP_ALLOW_ALL_SELLERS_SHOP = true;

export const canSellerAccessInventory = (user?: any) =>
  normalizeRole(user?.role) !== "seller" || user?.seller_has_commission_service === true;

export const canSellerAccessShop = (user?: any) =>
  TEMP_ALLOW_ALL_SELLERS_SHOP || canSellerAccessInventory(user);
