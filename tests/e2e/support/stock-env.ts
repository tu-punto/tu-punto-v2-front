export type StockPhase1Env = {
  adminEmail: string;
  adminPassword: string;
  branchName: string;
};

export const stockEnv: StockPhase1Env = {
  adminEmail: process.env.PW_ADMIN_EMAIL?.trim() || "user@user.com",
  adminPassword: process.env.PW_ADMIN_PASSWORD?.trim() || "Lm123456*",
  branchName: process.env.PW_BRANCH_NAME?.trim() || "Prado",
};

export const missingEnv = (keys: string[]) =>
  keys.filter((key) => {
    const value = process.env[key];
    return value === undefined || value.trim() === "";
  });
