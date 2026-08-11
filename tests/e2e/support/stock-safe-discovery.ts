import { expect, type Page } from "@playwright/test";

import { searchStock, selectAntdOption, selectCategory } from "./stock-helpers";

export type StockSafeFixture = {
  sellerName: string;
  productName: string;
  categoryName: string;
  searchTerm: string;
};

const normalizeText = (value: string | null | undefined) => (value || "").replace(/\s+/g, " ").trim();

const buildSearchTerm = (productName: string) => {
  const parts = productName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);

  if (parts.length > 0) {
    return parts[0];
  }

  return productName.slice(0, Math.min(productName.length, 6)).trim();
};

const getVisibleTableRows = (page: Page) =>
  page.locator('[data-testid="stock-products-table-wrapper"] tbody tr').filter({
    has: page.locator("td"),
  });

const getVisibleSellerOptions = async (page: Page) => {
  const trigger = page.getByTestId("stock-seller-selector");
  await trigger.click();

  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(dropdown).toBeVisible();

  const visibleOptions = dropdown.locator(".ant-select-item-option-content");
  await expect(visibleOptions.first()).toBeVisible({ timeout: 10_000 });

  const optionCount = await visibleOptions.count();
  const labels: string[] = [];

  for (let index = 0; index < optionCount; index += 1) {
    const text = normalizeText(await visibleOptions.nth(index).textContent());
    if (!text || /^todos$/i.test(text)) continue;
    labels.push(text);
  }

  await page.keyboard.press("Escape");
  return labels;
};

const waitForInventoryState = async (page: Page) => {
  const groups = page.getByTestId("stock-group-section");
  const emptyState = page.getByTestId("stock-empty-state");

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if ((await groups.count()) > 0) {
      await expect(groups.first()).toBeVisible({ timeout: 2_000 });
      return "groups" as const;
    }

    if (await emptyState.isVisible().catch(() => false)) {
      return "empty" as const;
    }

    await page.waitForTimeout(250);
  }

  return "unknown" as const;
};

const extractCategoryName = async (page: Page, sellerName: string) => {
  const rows = getVisibleTableRows(page);
  const rowCount = await rows.count();

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const row = rows.nth(rowIndex);
    const cells = row.locator("td");
    const cellCount = await cells.count();

    for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
      const text = normalizeText(await cells.nth(cellIndex).textContent());
      if (!text || /^sin categor/i.test(text)) continue;
      if (/^(ropa|calzado|accesorios|belleza|tecnologia|hogar|comida|mascotas)/i.test(text)) {
        return text;
      }
    }
  }

  throw new Error(`No se pudo descubrir una categoria visible para el vendedor ${sellerName}.`);
};

const extractProductName = async (page: Page) => {
  const rows = getVisibleTableRows(page);
  const rowCount = await rows.count();

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const row = rows.nth(rowIndex);
    const cells = row.locator("td");
    const cellCount = await cells.count();

    for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
      const text = normalizeText(await cells.nth(cellIndex).textContent());
      if (!text) continue;
      if (/^\d+$/.test(text)) continue;
      if (text === "-") continue;
      if (/^(ropa|calzado|accesorios|belleza|tecnologia|hogar|comida|mascotas)$/i.test(text)) continue;
      return text;
    }
  }

  return "";
};

export const discoverSafeFixture = async (page: Page): Promise<StockSafeFixture> => {
  const sellerOptions = await getVisibleSellerOptions(page);

  for (const sellerName of sellerOptions) {
    await selectAntdOption(page, page.getByTestId("stock-seller-selector"), sellerName);
    await expect(page.getByText("Vendedor seleccionado")).toBeVisible();

    const inventoryState = await waitForInventoryState(page);
    if (inventoryState !== "groups") {
      continue;
    }

    const groups = page.getByTestId("stock-group-section");
    await expect(groups.first()).toBeVisible({ timeout: 10_000 });

    const productName = await extractProductName(page);

    if (!productName) {
      continue;
    }

    const categoryName = await extractCategoryName(page, sellerName);

    return {
      sellerName,
      productName,
      categoryName,
      searchTerm: buildSearchTerm(productName),
    };
  }

  throw new Error("No se encontro ningun vendedor con productos visibles para las pruebas safe.");
};

export const prepareSafeFixture = async (page: Page) => {
  const fixture = await discoverSafeFixture(page);
  return fixture;
};

export const prepareSafeFixtureWithCategory = async (page: Page) => {
  const fixture = await prepareSafeFixture(page);
  await selectCategory(page, fixture.categoryName);
  return fixture;
};

export const prepareSafeFixtureWithSearch = async (page: Page) => {
  const fixture = await prepareSafeFixture(page);
  await searchStock(page, fixture.searchTerm);
  return fixture;
};

export const prepareSafeFixtureWithCategoryAndSearch = async (page: Page) => {
  const fixture = await prepareSafeFixture(page);
  await selectCategory(page, fixture.categoryName);
  await searchStock(page, fixture.searchTerm);
  return fixture;
};
