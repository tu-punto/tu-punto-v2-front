import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import {
  buildUniqueProductName,
  clearStockSearch,
  expectSuccessMessage,
  openStockAsAdmin,
  searchStock,
  selectAntdOption,
  selectSeller,
} from "./support/stock-helpers";
import {
  prepareSafeFixture,
  prepareSafeFixtureWithCategory,
  prepareSafeFixtureWithCategoryAndSearch,
  prepareSafeFixtureWithSearch,
} from "./support/stock-safe-discovery";
import { missingEnv } from "./support/stock-env";

const AUTH_ENV_KEYS = [
  "PW_ADMIN_EMAIL",
  "PW_ADMIN_PASSWORD",
  "PW_BRANCH_NAME",
];

const skipIfMissing = (keys: string[]) => {
  const missing = missingEnv(keys);
  test.skip(missing.length > 0, `Missing environment variables: ${missing.join(", ")}`);
};

test.describe.serial("Stock Management Phase 1", () => {
  test.describe.configure({ timeout: 90_000 });
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(90_000);
    skipIfMissing(AUTH_ENV_KEYS);
    context = await browser.newContext();
    page = await context.newPage();
    await openStockAsAdmin(page);
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test.beforeEach(async () => {
    await page.goto("/#/stock");
    await page.reload();
    await expect(page.getByTestId("stock-page")).toBeVisible();
    await expect(page.getByTestId("stock-search-input")).toBeVisible();
  });

  test("Stock - Acceso administrativo", async () => {
    await expect(page.getByTestId("stock-page")).toBeVisible();
    await expect(page.getByText(/Gesti.n de Inventario/i)).toBeVisible();
    await expect(page.getByTestId("stock-products-table-wrapper")).toBeVisible();
  });

  test("Stock - Carga inicial de filtros y tabla", async () => {
    await expect(page.getByTestId("stock-seller-selector-container")).toBeVisible();
    await expect(page.getByTestId("stock-search-input")).toBeVisible();
    await expect(page.getByTestId("stock-category-selector")).toBeVisible();
    await expect(page.getByTestId("stock-product-create-button")).toBeDisabled();
    await expect(page.getByTestId("stock-update-button")).toBeDisabled();
  });

  test("Stock - Seleccionar vendedor carga inventario", async () => {
    await prepareSafeFixture(page);
    await expect(page.getByTestId("stock-product-create-button")).toBeEnabled();
    await expect(page.getByTestId("stock-update-button")).toBeEnabled();
    await expect(page.getByTestId("stock-group-section").first()).toBeVisible();
  });

  test("Stock - Buscar producto por nombre", async () => {
    const fixture = await prepareSafeFixtureWithSearch(page);
    await expect(
      page.getByTestId("stock-products-table-wrapper").getByText(fixture.productName, { exact: false }).first()
    ).toBeVisible();
  });

  test("Stock - Busqueda sin resultados", async () => {
    const fixture = await prepareSafeFixture(page);
    await searchStock(page, `${fixture.searchTerm}-inexistente-e2e`);
    await expect(page.getByTestId("stock-empty-state")).toBeVisible();
  });

  test("Stock - Filtrar por categoria", async () => {
    const fixture = await prepareSafeFixtureWithCategory(page);
    await expect(
      page.locator('[data-testid="stock-products-table-wrapper"] td').filter({ hasText: fixture.categoryName }).first()
    ).toBeVisible();
  });

  test("Stock - Combinar vendedor, categoria y busqueda", async () => {
    const fixture = await prepareSafeFixtureWithCategoryAndSearch(page);
    await expect(
      page.getByTestId("stock-products-table-wrapper").getByText(fixture.productName, { exact: false }).first()
    ).toBeVisible();
  });

  test("Stock - Navegar paginacion de resultados", async () => {
    await prepareSafeFixture(page);

    const nextPageButton = page.locator(".ant-pagination-next");
    await expect(nextPageButton).toBeVisible();

    if (await nextPageButton.evaluate((node) => node.className.includes("ant-pagination-disabled"))) {
      test.skip(true, "El vendedor descubierto no tiene suficientes resultados para paginacion.");
    }

    const firstPageText = await page
      .locator('[data-testid="stock-products-table-wrapper"] tbody')
      .textContent();

    await nextPageButton.click();
    await expect(page.locator(".ant-pagination-item-active")).toContainText("2");

    const secondPageText = await page
      .locator('[data-testid="stock-products-table-wrapper"] tbody')
      .textContent();

    expect(secondPageText).not.toBe(firstPageText);
  });

  test("Stock - Agregar producto y confirmar alta", async () => {
    const fixture = await prepareSafeFixture(page);
    const productName = buildUniqueProductName();
    const variantName = "Color";
    const variantValue = `Rojo E2E ${Date.now().toString().slice(-6)}`;

    await selectSeller(page, fixture.sellerName);
    await page.getByTestId("stock-product-create-button").click();

    await expect(page.getByTestId("stock-product-form-content")).toBeVisible();
    await page.getByTestId("stock-product-name-input").fill(productName);
    await selectAntdOption(page, page.getByTestId("stock-product-category-select"), fixture.categoryName);
    await page.getByTestId("stock-add-variant-button").click();
    await page.getByTestId("stock-variant-name-input-0").locator("input").fill(variantName);
    await page.getByTestId("stock-subvariant-input-0").locator("input").fill(variantValue);
    await page.getByTestId("stock-subvariant-add-button-0").click();

    const combinationRow = page.locator("tr").filter({ hasText: variantValue }).first();
    await expect(combinationRow).toBeVisible();

    const combinationInputs = combinationRow.getByRole("spinbutton");
    await expect(combinationInputs).toHaveCount(2);
    await combinationInputs.nth(0).fill("2");
    await combinationInputs.nth(1).fill("25");
    await page.getByTestId("stock-product-submit").click();

    await expectSuccessMessage(page, /Producto guardado localmente/i);
    await page.getByTestId("stock-update-button").click();
    await expect(page.getByTestId("stock-confirm-new-products-table")).toContainText(productName);
    await page.getByTestId("stock-confirm-save-button").click();
    await expect(page.getByTestId("stock-confirm-content")).toBeHidden({ timeout: 20_000 });

    await searchStock(page, productName);
    await expect(
      page.getByTestId("stock-products-table-wrapper").getByText(productName, { exact: false }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("Stock - Actualizar stock existente correctamente", async () => {
    const fixture = await prepareSafeFixture(page);

    await selectSeller(page, fixture.sellerName);
    await searchStock(page, fixture.productName);

    const productRow = page.locator("tr").filter({ hasText: fixture.productName }).first();
    await expect(productRow).toBeVisible();
    await productRow.click();

    const variantRows = page.locator("tr").filter({ has: page.getByRole("spinbutton") });
    await expect(variantRows.first()).toBeVisible();

    const variantRowCount = await variantRows.count();
    let selectedVariantLabel = fixture.productName;
    let selectedVariantRow = variantRows.first();

    for (let index = 0; index < variantRowCount; index += 1) {
      const candidateRow = variantRows.nth(index);
      const stockText = (await candidateRow.locator("td").nth(1).textContent())?.trim() || "";
      const currentStock = Number(stockText);
      if (!Number.isFinite(currentStock) || currentStock <= 0) continue;

      selectedVariantRow = candidateRow;
      const firstCellText = (await candidateRow.locator("td").first().textContent())?.replace(/\s+/g, " ").trim() || "";
      selectedVariantLabel = firstCellText.replace(/^→\s*/, "").replace(`${fixture.productName} - `, "").trim() || fixture.productName;
      break;
    }

    const stockInput = selectedVariantRow.getByRole("spinbutton").first();
    await stockInput.fill("1");

    await page.getByTestId("stock-update-button").click();
    await expect(page.getByTestId("stock-confirm-movements-table")).toContainText(selectedVariantLabel);
    await page.getByTestId("stock-confirm-save-button").click();
    await expect(page.getByTestId("stock-confirm-content")).toBeHidden({ timeout: 20_000 });

    await clearStockSearch(page);
  });
});
