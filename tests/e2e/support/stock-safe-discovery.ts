import { expect, type Page } from "@playwright/test";

import { searchStock, selectCategory, selectSeller } from "./stock-helpers";

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

export const discoverSafeSellerName = async (page: Page) => {
  const trigger = page.getByTestId("stock-seller-selector");
  await trigger.click();

  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(dropdown).toBeVisible();

  const visibleOptions = dropdown.locator(".ant-select-item-option-content");
  const optionCount = await visibleOptions.count();

  for (let index = 0; index < optionCount; index += 1) {
    const option = visibleOptions.nth(index);
    const text = normalizeText(await option.textContent());

    if (!text || /^todos$/i.test(text)) continue;

    await option.click();
    return text;
  }

  throw new Error("No se encontro ningun vendedor visible para las pruebas safe.");
};

export const discoverSafeFixture = async (page: Page): Promise<StockSafeFixture> => {
  const sellerName = await discoverSafeSellerName(page);

  await expect(page.getByTestId("stock-group-section").first()).toBeVisible();

  const firstProductCell = page
    .locator('[data-testid="stock-products-table-wrapper"] tbody tr td')
    .nth(0);
  const productName = normalizeText(await firstProductCell.textContent());

  if (!productName) {
    throw new Error(`No se pudo descubrir un producto visible para el vendedor ${sellerName}.`);
  }

  const categoryCells = page.locator('[data-testid="stock-products-table-wrapper"] tbody tr td');
  const cellCount = await categoryCells.count();
  let categoryName = "";

  for (let index = 0; index < cellCount; index += 1) {
    const text = normalizeText(await categoryCells.nth(index).textContent());
    if (!text || /^sin categor/i.test(text)) continue;
    if (/^(ropa|calzado|accesorios|belleza|tecnologia|hogar|comida|mascotas)/i.test(text)) {
      categoryName = text;
      break;
    }
  }

  if (!categoryName) {
    throw new Error(`No se pudo descubrir una categoria visible para el vendedor ${sellerName}.`);
  }

  return {
    sellerName,
    productName,
    categoryName,
    searchTerm: buildSearchTerm(productName),
  };
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

export const reselectSafeSeller = async (page: Page, sellerName: string) => {
  await selectSeller(page, sellerName);
};
