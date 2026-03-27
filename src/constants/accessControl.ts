import { roles } from "./roles";

const { ADMIN, OPERATOR, SELLER } = roles;

export const routeRoleMap: Record<string, string[]> = {
  "/product": [ADMIN],
  "/seller": [ADMIN],
  "/sales": [ADMIN, OPERATOR],
  "/shipping": [ADMIN, SELLER, OPERATOR],
  "/find-shipping": [ADMIN],
  "/financeFlux": [ADMIN],
  "/stock": [ADMIN, SELLER, OPERATOR],
  "/stats": [ADMIN],
  "/sellerFactura": [ADMIN],
  "/servicesPage": [ADMIN],
  "/seller-info": [SELLER],
  "/shop": [SELLER],
  "/cash": [ADMIN, OPERATOR],
  "/cierreCaja": [ADMIN],
  "/branch": [ADMIN, SELLER, OPERATOR],
  "/sales-history": [ADMIN, OPERATOR],
  "/user": [ADMIN],
  "/shipping-guide": [SELLER],
  "/seller-product-info": [SELLER],
  "/admin-seller-product-info": [ADMIN],
};

export const getAllowedRoles = (path: string): string[] => routeRoleMap[path] || [];

