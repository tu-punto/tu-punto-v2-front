export const normalizeRole = (role?: string): "admin" | "operator" | "seller" | "farmer" | "paqueteria" | "" => {
  const value = String(role || "").trim().toLowerCase();

  if (value === "admin") return "admin";
  if (value === "superadmin") return "admin";
  if (value === "operator") return "operator";
  if (value === "farmer" || value === "granjero") return "farmer";
  if (value === "seller" || value === "vendedor") return "seller";
  if (value === "paqueteria") return "paqueteria";

  return "";
};

export const isSuperadminUser = (user?: { is_superadmin?: boolean | null; role?: string | null } | null): boolean =>
  user?.is_superadmin === true || String(user?.role || "").trim().toLowerCase() === "superadmin";

