export const normalizeRole = (role?: string): "admin" | "operator" | "seller" | "" => {
  const value = String(role || "").trim().toLowerCase();

  if (value === "admin") return "admin";
  if (value === "operator") return "operator";
  if (value === "seller" || value === "vendedor") return "seller";

  return "";
};

