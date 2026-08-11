import { expect, test } from "@playwright/test";

import { stockPhase1Cases } from "./data/stock-phase1.cases";
import {
  buildUniqueProductName,
  clearStockSearch,
  expectSuccessMessage,
  expandProductRow,
  getVariantRow,
  openStockAsAdmin,
  searchStock,
  selectAntdOption,
  selectCategory,
  selectSeller,
} from "./support/stock-helpers";
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
  test.beforeEach(async ({ page }) => {
    skipIfMissing(AUTH_ENV_KEYS);
    await openStockAsAdmin(page);
  });

  test("Stock - Acceso administrativo", async ({ page }) => {
    await expect(page.getByTestId("stock-page")).toBeVisible();
    await expect(page.getByText(/Gesti.n de Inventario/i)).toBeVisible();
    await expect(page.getByTestId("stock-products-table-wrapper")).toBeVisible();
  });

  test("Stock - Carga inicial de filtros y tabla", async ({ page }) => {
    await expect(page.getByTestId("stock-seller-selector-container")).toBeVisible();
    await expect(page.getByTestId("stock-search-input")).toBeVisible();
    await expect(page.getByTestId("stock-category-selector")).toBeVisible();
    await expect(page.getByTestId("stock-product-create-button")).toBeDisabled();
    await expect(page.getByTestId("stock-update-button")).toBeDisabled();
  });

  test("Stock - Seleccionar vendedor carga inventario", async ({ page }) => {
    await selectSeller(page, stockPhase1Cases.searches[0].sellerName);
    await expect(page.getByTestId("stock-product-create-button")).toBeEnabled();
    await expect(page.getByTestId("stock-update-button")).toBeEnabled();
    await expect(page.getByTestId("stock-group-section").first()).toBeVisible();
  });

  for (const searchCase of stockPhase1Cases.searches) {
    test(`Stock - Buscar producto por nombre - ${searchCase.name}`, async ({ page }) => {
      await selectSeller(page, searchCase.sellerName);
      await searchStock(page, searchCase.searchTerm);
    await expect(
        page.getByTestId("stock-products-table-wrapper").getByText(searchCase.expectedProduct, { exact: false }).first()
    ).toBeVisible();
    });
  }

  for (const emptyCase of stockPhase1Cases.emptySearches) {
    test(`Stock - Busqueda sin resultados - ${emptyCase.name}`, async ({ page }) => {
      await selectSeller(page, emptyCase.sellerName);
      await searchStock(page, emptyCase.emptySearchTerm);
    await expect(page.getByTestId("stock-empty-state")).toBeVisible();
    });
  }

  for (const searchCase of stockPhase1Cases.searches) {
    test(`Stock - Filtrar por categoria - ${searchCase.name}`, async ({ page }) => {
      await selectSeller(page, searchCase.sellerName);
      await selectCategory(page, searchCase.categoryName);
    await expect(
        page.locator('[data-testid="stock-products-table-wrapper"] td').filter({ hasText: searchCase.categoryName }).first()
    ).toBeVisible();
    });
  }

  for (const searchCase of stockPhase1Cases.searches) {
    test(`Stock - Combinar vendedor, categoria y busqueda - ${searchCase.name}`, async ({ page }) => {
      await selectSeller(page, searchCase.sellerName);
      await selectCategory(page, searchCase.categoryName);
      await searchStock(page, searchCase.searchTerm);
    await expect(
        page.getByTestId("stock-products-table-wrapper").getByText(searchCase.expectedProduct, { exact: false }).first()
    ).toBeVisible();
    });
  }

  for (const paginationCase of stockPhase1Cases.paginations) {
    test(`Stock - Navegar paginacion de resultados - ${paginationCase.name}`, async ({ page }) => {
      await selectSeller(page, paginationCase.sellerName);

      const nextPageButton = page.locator(".ant-pagination-next");
      await expect(nextPageButton).toBeVisible();
      await expect(nextPageButton).not.toHaveClass(/ant-pagination-disabled/);
      await nextPageButton.click();

      await expect(page.locator(".ant-pagination-item-active")).toContainText("2");
      await expect(
        page.getByTestId("stock-products-table-wrapper").getByText(paginationCase.page2ExpectedProduct, { exact: false }).first()
      ).toBeVisible();
    });
  }

  for (const creationCase of stockPhase1Cases.productCreations) {
    test(`Stock - Agregar producto y confirmar alta - ${creationCase.name}`, async ({ page }) => {
      const productName = buildUniqueProductName();

      await selectSeller(page, creationCase.sellerName);
      await page.getByTestId("stock-product-create-button").click();

      await expect(page.getByTestId("stock-product-form-content")).toBeVisible();
      await page.getByTestId("stock-product-name-input").fill(productName);
      await selectAntdOption(page, page.getByTestId("stock-product-category-select"), creationCase.categoryName);
      await page.getByTestId("stock-add-variant-button").click();
      await page.getByTestId("stock-variant-name-input-0").fill(creationCase.variantName);
      await page.getByTestId("stock-subvariant-input-0").fill(creationCase.variantValue);
      await page.getByTestId("stock-subvariant-add-button-0").click();

      const stockInputs = page.getByTestId("stock-combination-stock-input");
      const priceInputs = page.getByTestId("stock-combination-price-input");

      await stockInputs.first().locator("input").fill(String(creationCase.initialStock));
      await priceInputs.first().locator("input").fill(String(creationCase.initialPrice));
      await page.getByTestId("stock-product-submit").click();

      await expectSuccessMessage(page, /Producto guardado localmente/i);
      await page.getByTestId("stock-update-button").click();
      await expect(page.getByTestId("stock-confirm-new-products-table")).toContainText(productName);
      await page.getByTestId("stock-confirm-save-button").click();
      await expectSuccessMessage(page, /Cambios aplicados|Todos los cambios fueron aplicados correctamente/i);

      await searchStock(page, productName);
      await expect(
        page.getByTestId("stock-products-table-wrapper").getByText(productName, { exact: false }).first()
      ).toBeVisible();
    });
  }

  for (const updateCase of stockPhase1Cases.stockUpdates) {
    test(`Stock - Actualizar stock existente correctamente - ${updateCase.name}`, async ({ page }) => {
      await selectSeller(page, updateCase.sellerName);
      await searchStock(page, updateCase.existingProduct);
      await expandProductRow(page, updateCase.existingProduct);

      const variantRow = getVariantRow(page, updateCase.existingVariant);
      await expect(variantRow).toBeVisible();

      const stockInput = variantRow.getByTestId("stock-income-input").locator("input");
      await stockInput.fill(String(updateCase.updateDelta));

      await page.getByTestId("stock-update-button").click();
      await expect(page.getByTestId("stock-confirm-movements-table")).toContainText(updateCase.existingVariant);
      await page.getByTestId("stock-confirm-save-button").click();
      await expectSuccessMessage(page, /Todos los cambios fueron aplicados correctamente|Cambios aplicados/i);

      await clearStockSearch(page);
    });
  }
});
