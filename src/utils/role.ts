export const normalizeRole = (role?: string): "admin" | "operator" | "seller" | "" => {
  const value = String(role || "").trim().toLowerCase();

  if (value === "admin") return "admin";
  if (value === "superadmin") return "admin";
  if (value === "operator") return "operator";
  if (value === "seller" || value === "vendedor") return "seller";

  return "";
};

export const isSuperadminUser = (user?: { is_superadmin?: boolean | null } | null): boolean =>
  user?.is_superadmin === true;

