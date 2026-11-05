import { expect, test } from "@playwright/test";
import { ADMIN, login, PLAYER, seedPassword } from "./helpers";

// Cada rol tiene su propia entrada: el administrador no ve la plataforma del jugador mezclada con la suya,
// y las personas usuarias nunca ven nada de administración.
test("portales separados: cada cuenta entra por el suyo", async ({ page }) => {
  // Una cuenta de administración no entra por la página de usuarios.
  await page.goto("/login");
  await page.getByLabel("Correo corporativo").fill(ADMIN);
  await page.getByLabel("Contraseña").fill(seedPassword());
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "cuenta de administración" })).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  // Una cuenta de usuario no entra por el portal de administración.
  await page.goto("/admin/login");
  await page.getByLabel("Correo de administración").fill(PLAYER);
  await page.getByLabel("Contraseña").fill(seedPassword());
  await page.getByRole("button", { name: "Entrar a administración" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "no tiene acceso a administración" })).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("el portal de administración no muestra escudo, racha ni XP, y el de usuarios no muestra administración", async ({ browser }) => {
  const admin = await (await browser.newContext({ locale: "es-MX" })).newPage();
  await login(admin, ADMIN);
  await expect(admin.getByRole("heading", { name: "Administración", level: 1 })).toBeVisible();
  await expect(admin.getByText("XP", { exact: true })).toHaveCount(0);
  await expect(admin.getByRole("link", { name: "Clasificación" })).toHaveCount(0);
  // Si entra a las pantallas de usuarios, vuelve a su portal.
  await admin.goto("/");
  await admin.waitForURL("**/admin");

  const player = await (await browser.newContext({ locale: "es-MX" })).newPage();
  await login(player, PLAYER);
  await expect(player.getByRole("link", { name: "Administración" })).toHaveCount(0);
  await player.goto("/admin/usuarios");
  await player.waitForURL("**/");
});
