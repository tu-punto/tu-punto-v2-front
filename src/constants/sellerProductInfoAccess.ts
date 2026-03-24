export const canAccessSellerProductInfo = (
  user?: { role?: string | null; can_access_seller_product_info?: boolean | null } | null
) => {
  return (
    String(user?.role || "").trim().toLowerCase() === "seller" &&
    user?.can_access_seller_product_info === true
  );
};
