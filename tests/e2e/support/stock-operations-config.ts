export type StockOperationStartStep =
  | "login"
  | "select-seller"
  | "create-products"
  | "ingress"
  | "egress"
  | "verify";

export type StockOperationsConfig = {
  sellerName?: string;
  createProducts: boolean;
  productCount: number;
  ingressCount: number;
  egressCount: number;
  minAmount: number;
  maxAmount: number;
  startStep: StockOperationStartStep;
};

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

const parseInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
};

const parseStartStep = (value: string | undefined): StockOperationStartStep => {
  const normalized = value?.trim().toLowerCase();
  switch (normalized) {
    case "login":
    case "select-seller":
    case "create-products":
    case "ingress":
    case "egress":
    case "verify":
      return normalized;
    default:
      return "login";
  }
};

export const stockOperationsConfig: StockOperationsConfig = {
  sellerName: process.env.PW_OP_SELLER_NAME?.trim() || undefined,
  createProducts: parseBoolean(process.env.PW_OP_CREATE_PRODUCTS, false),
  productCount: parseInteger(process.env.PW_OP_PRODUCT_COUNT, 1),
  ingressCount: parseInteger(process.env.PW_OP_INGRESS_COUNT, 1),
  egressCount: parseInteger(process.env.PW_OP_EGRESS_COUNT, 0),
  minAmount: parseInteger(process.env.PW_OP_MIN_AMOUNT, 1),
  maxAmount: parseInteger(process.env.PW_OP_MAX_AMOUNT, 5),
  startStep: parseStartStep(process.env.PW_OP_START_STEP),
};

export const validateStockOperationsConfig = (config: StockOperationsConfig) => {
  if (config.minAmount < 1) {
    throw new Error("PW_OP_MIN_AMOUNT debe ser mayor o igual a 1.");
  }

  if (config.maxAmount < config.minAmount) {
    throw new Error("PW_OP_MAX_AMOUNT debe ser mayor o igual a PW_OP_MIN_AMOUNT.");
  }

  if (config.productCount < 0 || config.ingressCount < 0 || config.egressCount < 0) {
    throw new Error("PW_OP_PRODUCT_COUNT, PW_OP_INGRESS_COUNT y PW_OP_EGRESS_COUNT no pueden ser negativos.");
  }

  if (
    config.createProducts &&
    ["ingress", "egress", "verify"].includes(config.startStep)
  ) {
    throw new Error(
      "No puedes iniciar en ingress/egress/verify cuando PW_OP_CREATE_PRODUCTS=true, porque no existirian productos creados en esta corrida."
    );
  }
};

