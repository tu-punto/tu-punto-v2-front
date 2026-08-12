import { menu } from "../constants/menu";
import { canAccessSellerProductInfo } from "../constants/sellerProductInfoAccess";
import { canSellerAccessInventory, canSellerAccessShop } from "./sellerServiceAccess";
import { isSuperadminUser, normalizeRole } from "./role";

export const getVisibleMenuItems = (user: any) => {
  const role = normalizeRole(user?.role);

  return menu.filter(
    (item) =>
      item.roles.includes(role) &&
      !item.hiddenInMenuForRoles?.includes(role) &&
      (item.path !== "/stock" || canSellerAccessInventory(user)) &&
      (item.path !== "/shop" || canSellerAccessShop(user)) &&
      (item.path !== "/seller-product-info" || canAccessSellerProductInfo(user)) &&
      (!item.requiresSuperadmin || isSuperadminUser(user))
  );
};
