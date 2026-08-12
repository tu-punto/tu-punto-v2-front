import { expect, type Page } from "@playwright/test";

import {
  buildUniqueProductName,
  expectSuccessMessage,
  searchStock,
  selectAntdOption,
  selectSeller,
} from "./stock-helpers";
import {
  getVisibleSellerOptions,
  prepareSafeFixtureForSeller,
  type StockSafeFixture,
} from "./stock-safe-discovery";
import type { StockOperationsConfig, StockOperationStartStep } from "./stock-operations-config";

export type StockOperationTarget = {
  sellerName: string;
  productName: string;
  categoryName: string;
  variantName: string;
  variantValue: string;
  expectedStock: number;
  created: boolean;
};

export type StockOperationRecord = {
  kind: "ingress" | "egress";
  productName: string;
  variantValue: string;
  requestedAmount: number;
  appliedAmount: number;
};

export type StockOperationsRunState = {
  sellerName: string;
  categoryName: string;
  targets: StockOperationTarget[];
  operations: StockOperationRecord[];
};

const stepOrder: Record<StockOperationStartStep, number> = {
  login: 0,
  "select-seller": 1,
  "create-products": 2,
  ingress: 3,
  egress: 4,
  verify: 5,
};

const runStep = (startStep: StockOperationStartStep, currentStep: StockOperationStartStep) =>
  stepOrder[startStep] <= stepOrder[currentStep];

const normalizeText = (value: string | null | undefined) => (value || "").replace(/\s+/g, " ").trim();

const randomInteger = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const parseVariantLabel = (rowText: string, productName: string) =>
  normalizeText(rowText).replace(/^→\s*/, "").replace(`${productName} - `, "").trim();

const openVariantRowsForProduct = async (page: Page, productName: string) => {
  await searchStock(page, productName);

  const productRow = page.locator("tr").filter({ hasText: productName }).first();
  await expect(productRow).toBeVisible({ timeout: 20_000 });

  const variantRows = page.locator("tr").filter({ has: page.getByRole("spinbutton") });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (await variantRows.count()) {
      await expect(variantRows.first()).toBeVisible({ timeout: 5_000 });
      return variantRows;
    }

    if (attempt === 0) {
      const expandButton = productRow.getByRole("button").first();
      if (await expandButton.count()) {
        await expandButton.click({ force: true });
      }
    } else if (attempt === 1) {
      await productRow.locator("td").first().click({ force: true });
    } else {
      await productRow.click({ force: true });
    }

    await page.waitForTimeout(500);
  }

  await expect(variantRows.first()).toBeVisible({ timeout: 20_000 });
  return variantRows;
};

const readVariantStock = async (variantRow: ReturnType<Page["locator"]>) => {
  const stockText = normalizeText(await variantRow.locator("td").nth(1).textContent());
  const parsed = Number(stockText);
  if (!Number.isFinite(parsed)) {
    throw new Error(`No se pudo interpretar el stock visible de la fila: "${stockText}"`);
  }
  return parsed;
};

const getVariantRowByTarget = (page: Page, target: StockOperationTarget) =>
  page
    .locator("tr")
    .filter({ hasText: target.variantValue })
    .filter({ has: page.getByRole("spinbutton") })
    .first();

const buildCreatedVariantValue = (index: number) => `E2E-${index + 1}-${Date.now().toString().slice(-6)}`;

// Avoid duplicating seller/category discovery logic. If seller is provided, discover against that seller.
// If not, reuse the existing safe discovery entrypoint.
export const resolveOperationContext = async (
  page: Page,
  preferredSellerName?: string
): Promise<StockSafeFixture> => {
  if (preferredSellerName) {
    return prepareSafeFixtureForSeller(page, preferredSellerName);
  }

  const sellerOptions = await getVisibleSellerOptions(page);
  let lastError: unknown;

  for (const sellerName of sellerOptions) {
    try {
      return await prepareSafeFixtureForSeller(page, sellerName);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No se pudo descubrir un vendedor operable para stock-operations.");
};

export const createProductsForOperations = async (
  page: Page,
  fixture: StockSafeFixture,
  productCount: number,
  maxAmount: number
) => {
  const targets: StockOperationTarget[] = [];

  await selectSeller(page, fixture.sellerName);

  for (let index = 0; index < productCount; index += 1) {
    const productName = buildUniqueProductName();
    const variantValue = buildCreatedVariantValue(index);
    const initialStock = Math.max(1, maxAmount);

    await page.getByTestId("stock-product-create-button").click();
    await expect(page.getByTestId("stock-product-form-content")).toBeVisible();

    await page.getByTestId("stock-product-name-input").fill(productName);
    await selectAntdOption(page, page.getByTestId("stock-product-category-select"), fixture.categoryName);
    await page.getByTestId("stock-add-variant-button").click();
    await page.getByTestId("stock-variant-name-input-0").locator("input").fill("Color");
    await page.getByTestId("stock-subvariant-input-0").locator("input").fill(variantValue);
    await page.getByTestId("stock-subvariant-add-button-0").click();

    const combinationRow = page.locator("tr").filter({ hasText: variantValue }).first();
    await expect(combinationRow).toBeVisible();

    const combinationInputs = combinationRow.getByRole("spinbutton");
    await expect(combinationInputs).toHaveCount(2);
    await combinationInputs.nth(0).fill(String(initialStock));
    await combinationInputs.nth(1).fill("25");
    await page.getByTestId("stock-product-submit").click();

    await expectSuccessMessage(page, /Producto guardado localmente/i);
    await page.getByTestId("stock-update-button").click();
    await expect(page.getByTestId("stock-confirm-new-products-table")).toContainText(productName);
    await page.getByTestId("stock-confirm-save-button").click();
    await expect(page.getByTestId("stock-confirm-content")).toBeHidden({ timeout: 20_000 });

    targets.push({
      sellerName: fixture.sellerName,
      productName,
      categoryName: fixture.categoryName,
      variantName: "Color",
      variantValue,
      expectedStock: initialStock,
      created: true,
    });
  }

  return targets;
};

export const discoverExistingTargets = async (page: Page, fixture: StockSafeFixture) => {
  await selectSeller(page, fixture.sellerName);
  const variantRows = await openVariantRowsForProduct(page, fixture.productName);
  const variantRowCount = await variantRows.count();
  const targets: StockOperationTarget[] = [];

  for (let index = 0; index < variantRowCount; index += 1) {
    const row = variantRows.nth(index);
    const firstCellText = normalizeText(await row.locator("td").first().textContent());
    const variantValue = parseVariantLabel(firstCellText, fixture.productName);
    const currentStock = await readVariantStock(row);

    if (!variantValue) continue;

    targets.push({
      sellerName: fixture.sellerName,
      productName: fixture.productName,
      categoryName: fixture.categoryName,
      variantName: "descubierta",
      variantValue,
      expectedStock: currentStock,
      created: false,
    });
  }

  if (!targets.length) {
    throw new Error(`No se encontraron variantes operables para ${fixture.productName}.`);
  }

  return targets;
};

export const applyStockOperation = async (
  page: Page,
  target: StockOperationTarget,
  kind: "ingress" | "egress",
  amount: number
) => {
  const signedAmount = kind === "egress" ? -Math.abs(amount) : Math.abs(amount);

  await selectSeller(page, target.sellerName);
  await openVariantRowsForProduct(page, target.productName);

  const variantRow = getVariantRowByTarget(page, target);
  await expect(variantRow).toBeVisible({ timeout: 20_000 });

  const stockInput = variantRow.getByRole("spinbutton").first();
  await stockInput.fill(String(signedAmount));

  await page.getByTestId("stock-update-button").click();
  await expect(page.getByTestId("stock-confirm-movements-table")).toContainText(target.variantValue);
  await page.getByTestId("stock-confirm-save-button").click();
  await expect(page.getByTestId("stock-confirm-content")).toBeHidden({ timeout: 20_000 });

  target.expectedStock += signedAmount;

  return {
    kind,
    productName: target.productName,
    variantValue: target.variantValue,
    requestedAmount: amount,
    appliedAmount: Math.abs(signedAmount),
  } satisfies StockOperationRecord;
};

export const verifyTargetStock = async (page: Page, target: StockOperationTarget) => {
  await selectSeller(page, target.sellerName);
  await openVariantRowsForProduct(page, target.productName);

  const variantRow = getVariantRowByTarget(page, target);
  await expect(variantRow).toBeVisible({ timeout: 20_000 });
  const visibleStock = await readVariantStock(variantRow);

  expect(visibleStock).toBe(target.expectedStock);
};

export const runStockOperationsFlow = async (page: Page, config: StockOperationsConfig) => {
  const fixture = await resolveOperationContext(page, config.sellerName);
  const runState: StockOperationsRunState = {
    sellerName: fixture.sellerName,
    categoryName: fixture.categoryName,
    targets: [],
    operations: [],
  };

  if (runStep(config.startStep, "select-seller")) {
    await selectSeller(page, fixture.sellerName);
  }

  if (config.createProducts) {
    if (!runStep(config.startStep, "create-products")) {
      throw new Error(
        "La corrida con creacion de productos no puede saltarse create-products porque luego no habria objetivos creados."
      );
    }

    runState.targets = await createProductsForOperations(page, fixture, config.productCount, config.maxAmount);
  } else {
    runState.targets = await discoverExistingTargets(page, fixture);
  }

  if (runStep(config.startStep, "ingress")) {
    for (let index = 0; index < config.ingressCount; index += 1) {
      const target = runState.targets[index % runState.targets.length];
      const amount = randomInteger(config.minAmount, config.maxAmount);
      const operation = await applyStockOperation(page, target, "ingress", amount);
      runState.operations.push(operation);
    }
  }

  if (runStep(config.startStep, "egress")) {
    const egressCandidates = runState.targets.filter((target) => target.expectedStock > 0);
    if (config.egressCount > 0 && !egressCandidates.length) {
      throw new Error("No se encontraron objetivos con stock positivo para ejecutar salidas.");
    }

    for (let index = 0; index < config.egressCount; index += 1) {
      const positiveTargets = runState.targets.filter((target) => target.expectedStock > 0);
      if (!positiveTargets.length) {
        throw new Error("Se agotaron los objetivos con stock positivo antes de completar las salidas solicitadas.");
      }

      const target = positiveTargets[index % positiveTargets.length];
      const requestedAmount = randomInteger(config.minAmount, config.maxAmount);
      const amount = Math.min(requestedAmount, target.expectedStock);
      const operation = await applyStockOperation(page, target, "egress", amount);
      runState.operations.push(operation);
    }
  }

  if (runStep(config.startStep, "verify")) {
    for (const target of runState.targets) {
      await verifyTargetStock(page, target);
    }
  }

  return runState;
};
