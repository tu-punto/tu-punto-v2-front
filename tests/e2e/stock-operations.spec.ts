import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { openStockAsAdmin } from "./support/stock-helpers";
import { stockOperationsConfig, validateStockOperationsConfig } from "./support/stock-operations-config";
import { runStockOperationsFlow } from "./support/stock-operations-runner";
import { missingEnv } from "./support/stock-env";

const AUTH_ENV_KEYS = ["PW_ADMIN_EMAIL", "PW_ADMIN_PASSWORD", "PW_BRANCH_NAME"];

const skipIfMissing = (keys: string[]) => {
  const missing = missingEnv(keys);
  test.skip(missing.length > 0, `Missing environment variables: ${missing.join(", ")}`);
};

test.describe.serial("Stock Operations", () => {
  test.describe.configure({ timeout: 180_000 });

  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    skipIfMissing(AUTH_ENV_KEYS);
    validateStockOperationsConfig(stockOperationsConfig);
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
  });

  test("Stock - Ejecutar flujo operativo parametrizado", async () => {
    const runState = await runStockOperationsFlow(page, stockOperationsConfig);

    expect(runState.targets.length).toBeGreaterThan(0);

    if (stockOperationsConfig.ingressCount + stockOperationsConfig.egressCount > 0) {
      expect(runState.operations.length).toBeGreaterThan(0);
    }
  });
});
