const SELLER_PRODUCT_INFO_ALLOWED_EMAILS = ["prueba@gmail.com"];

export const canAccessSellerProductInfo = (user?: { email?: string | null } | null) => {
  const email = String(user?.email || "")
    .trim()
    .toLowerCase();

  return SELLER_PRODUCT_INFO_ALLOWED_EMAILS.includes(email);
};

export { SELLER_PRODUCT_INFO_ALLOWED_EMAILS };
