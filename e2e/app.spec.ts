import { test, expect, type Page } from "@playwright/test";
import { HEART_SVG, LINE_ONLY_SVG, SMALL_SVG, gridSvg } from "./fixtures";

async function loadSvg(page: Page, name: string, svg: string): Promise<void> {
  await page.setInputFiles("input[type='file']", {
    name,
    mimeType: "image/svg+xml",
    buffer: Buffer.from(svg),
  });
}

const ready = (page: Page) => page.locator(".status-badge").filter({ hasText: "Listo" });
const error = (page: Page) => page.locator(".status-badge").filter({ hasText: "Error" });

test.describe("LEDSign3D e2e", () => {
  test("carga la app en estado vacío", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "LEDSign3D" })).toBeVisible();
    await expect(page.getByText("Sin proyecto")).toBeVisible();
    await expect(page.getByRole("button", { name: /exportar zip/i })).toBeDisabled();
  });

  test("carga un SVG y muestra el ensamblaje 3D", async ({ page }) => {
    await page.goto("/");
    await loadSvg(page, "corazon.svg", HEART_SVG);
    await expect(ready(page)).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".viewer-canvas canvas")).toBeVisible();
  });

  test("un SVG pequeño se escala automáticamente al mínimo de 50 mm", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Configurar SVG")).toBeVisible();
    await loadSvg(page, "rect.svg", SMALL_SVG);
    await expect(ready(page)).toBeVisible({ timeout: 30_000 });

    await expect(page.locator(".svg-size-info")).toContainText("Ancho: 50 mm");
    await expect(page.locator(".svg-size-info")).toContainText("Alto: 50 mm");
  });

  test("cambiar un parámetro regenera el modelo sin errores", async ({ page }) => {
    await page.goto("/");
    await loadSvg(page, "corazon.svg", HEART_SVG);
    await expect(ready(page)).toBeVisible({ timeout: 30_000 });

    await page.getByLabel("Holgura (valor)").fill("1");
    await expect(ready(page)).toBeVisible({ timeout: 30_000 });
    await expect(error(page)).toHaveCount(0);
  });

  test("exporta el ZIP con el nombre derivado del SVG", async ({ page }) => {
    await page.goto("/");
    await loadSvg(page, "corazon.svg", HEART_SVG);
    await expect(ready(page)).toBeVisible({ timeout: 30_000 });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /exportar zip/i }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("corazon.zip");
  });

  test("muestra error con un SVG sin formas cerradas", async ({ page }) => {
    await page.goto("/");
    await loadSvg(page, "malo.svg", LINE_ONLY_SVG);
    await expect(error(page)).toBeVisible();
    await expect(page.locator(".error-box")).toBeVisible();
  });

  test("procesa un SVG complejo con buen rendimiento", async ({ page }) => {
    await page.goto("/");
    const svg = gridSvg(24);
    const start = Date.now();
    await loadSvg(page, "grid.svg", svg);
    await expect(ready(page)).toBeVisible({ timeout: 60_000 });
    const elapsed = Date.now() - start;

    test.info().annotations.push({
      type: "duration",
      description: `Generación completa (24 contornos): ${elapsed} ms`,
    });
    expect(elapsed).toBeLessThan(20_000);
  });
});
