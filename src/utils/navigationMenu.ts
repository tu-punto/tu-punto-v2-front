import { menu } from "../constants/menu";
import { canAccessSellerProductInfo } from "../constants/sellerProductInfoAccess";
import { canSellerAccessDashboard, canSellerAccessNormalScreens, canSellerAccessInventory, canSellerAccessPersonalInventory, canSellerAccessShop, canSellerAccessSales, canSellerAccessSimplePackages } from "./sellerServiceAccess";
import { isSuperadminUser, normalizeRole } from "./role";

export const getVisibleMenuItems = (user: any) => {
  const role = normalizeRole(user?.role);

  return menu.filter(
    (item) =>
      item.roles.includes(role) &&
      !item.hiddenInMenuForRoles?.includes(role) &&
      (item.path !== "/sales" || canSellerAccessSales(user)) &&
      (item.path !== "/stock" || canSellerAccessInventory(user)) &&
      (item.path !== "/shop" || canSellerAccessShop(user)) &&
      (item.path !== "/simple-packages" || canSellerAccessSimplePackages(user)) &&
      (item.path !== "/seller-product-info" || canAccessSellerProductInfo(user)) &&
      (item.path !== "/seller-dashboard" || canSellerAccessDashboard(user)) &&
      (item.path !== "/my-inventory" || canSellerAccessPersonalInventory(user)) &&
      (!["/shop", "/stock", "/sales", "/shipping", "/simple-packages", "/seller-info", "/shipping-guide", "/seller-product-info", "/seller-promotions"].includes(item.path) || canSellerAccessNormalScreens(user)) &&
      (!item.requiresSuperadmin || isSuperadminUser(user))
  );
};
