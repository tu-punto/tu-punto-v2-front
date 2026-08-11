import { expect, type Locator, type Page } from "@playwright/test";

import { stockEnv } from "./stock-env";

const waitForHashRoute = async (page: Page, hashPath: string) => {
  await page.waitForURL(new RegExp(`${hashPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
};

export const selectAntdOption = async (page: Page, trigger: Locator, optionText: string) => {
  await trigger.click();
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(dropdown).toBeVisible();

  const visibleOptions = dropdown.locator(".ant-select-item-option-content");
  await expect(visibleOptions.first()).toBeVisible({ timeout: 10_000 });
  const normalizedTarget = optionText.trim().toLowerCase();
  const escapedTarget = optionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let lastVisibleTexts: string[] = [];

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const visibleOptionCount = await visibleOptions.count();
    lastVisibleTexts = [];

    for (let index = 0; index < visibleOptionCount; index += 1) {
      const option = visibleOptions.nth(index);
      const rawText = (await option.textContent()) || "";
      const normalizedText = rawText.trim();

      if (!normalizedText) continue;
      lastVisibleTexts.push(normalizedText);

      if (new RegExp(`^\\s*${escapedTarget}\\s*$`, "i").test(normalizedText)) {
        await option.click();
        return;
      }

      if (normalizedText.toLowerCase().includes(normalizedTarget)) {
        await option.click();
        return;
      }
    }

    await page.waitForTimeout(300);
  }

  throw new Error(
    `No se pudo encontrar la opcion "${optionText}" en el selector. Opciones visibles: ${lastVisibleTexts.join(" | ")}`
  );
};

export const loginAsAdmin = async (page: Page) => {
  await page.goto("/#/login-admin");
  await expect(page.getByTestId("login-email-input")).toBeVisible();

  await selectAntdOption(page, page.getByTestId("login-branch-select"), stockEnv.branchName);
  await page.getByTestId("login-email-input").fill(stockEnv.adminEmail);
  await page.getByPlaceholder(/Contrase/i).fill(stockEnv.adminPassword);
  await page.getByTestId("login-submit-button").click();

  await waitForHashRoute(page, "#/stock");
  await expect(page.getByTestId("stock-page")).toBeVisible();
};

export const openStockAsAdmin = async (page: Page) => {
  await loginAsAdmin(page);
  await expect(page.getByTestId("stock-search-input")).toBeVisible();
};

export const selectSeller = async (page: Page, sellerName: string) => {
  await selectAntdOption(page, page.getByTestId("stock-seller-selector"), sellerName);
  await expect(page.getByText("Vendedor seleccionado")).toBeVisible();
};

export const selectCategory = async (page: Page, categoryName: string) => {
  await selectAntdOption(page, page.getByTestId("stock-category-selector"), categoryName);
};

export const searchStock = async (page: Page, term: string) => {
  const searchInput = page
    .getByPlaceholder(/Buscar producto o variante/i)
    .or(page.getByTestId("stock-search-input"))
    .first();
  await expect(searchInput).toBeVisible();
  await searchInput.fill(term);
  await page.waitForTimeout(450);
};

export const clearStockSearch = async (page: Page) => {
  const searchInput = page
    .getByPlaceholder(/Buscar producto o variante/i)
    .or(page.getByTestId("stock-search-input"))
    .first();
  await expect(searchInput).toBeVisible();
  await searchInput.fill("");
  await page.waitForTimeout(450);
};

export const expectSuccessMessage = async (page: Page, pattern: RegExp) => {
  await expect(page.locator(".ant-message")).toContainText(pattern);
};

export const buildUniqueProductName = () => {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `E2E Stock ${timestamp}`;
};

export const expandProductRow = async (page: Page, productName: string) => {
  const productRow = page.locator("tr").filter({ hasText: productName }).first();
  await expect(productRow).toBeVisible();
  await productRow.click();
};

export const getVariantRow = (page: Page, variantLabel: string) =>
  page.locator("tr").filter({ hasText: variantLabel }).first();
