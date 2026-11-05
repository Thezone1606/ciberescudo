import { expect, test } from "@playwright/test";
import { ADMIN, login, PLAYER, seedPassword } from "./helpers";

const INVITED = `e2e.invitado.${Date.now()}@dsintelligence.test`;

// El administrador ve a quien ya entró en «Existentes» con su avance, edita su cuenta y la desactiva:
// esa persona deja de poder entrar hasta que se reactiva.
test("administrar usuarios: ver avance, editar y desactivar", async ({ browser, page }) => {
  const ctx = await browser.newContext({ locale: "es-MX", timezoneId: "America/Mexico_City" });
  const player = await ctx.newPage();
  await login(player, PLAYER); // primer acceso: la cuenta pasa a «existente»
  await ctx.close();

  await login(page, ADMIN);
  await page.goto("/admin/usuarios");
  await expect(page.getByRole("heading", { name: "Usuarios" })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Existentes/ })).toHaveAttribute("aria-selected", "true");

  const card = page.getByRole("listitem").filter({ hasText: PLAYER });
  await expect(card).toBeVisible();
  await expect(card.getByText("Ruta corporativa")).toBeVisible();
  await expect(card.getByRole("progressbar", { name: "Ruta técnica" })).toBeVisible();

  // Edita el departamento.
  await card.getByRole("button", { name: "Editar" }).click();
  await card.getByLabel("Departamento").selectOption({ label: "Recursos Humanos" });
  await card.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(card.getByText(/Recursos Humanos · Colaborador/)).toBeVisible();

  // Desactivada: ya no puede iniciar sesión.
  await card.getByRole("button", { name: "Editar" }).click();
  await card.getByLabel("Cuenta activa").uncheck();
  await card.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(card.getByText("Desactivada")).toBeVisible();

  const denied = await page.request.post("/api/session/login", { data: { email: PLAYER, password: seedPassword() } });
  expect(denied.status()).toBe(401);

  // Reactivada.
  await card.getByRole("button", { name: "Editar" }).click();
  await card.getByLabel("Cuenta activa").check();
  await card.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(card.getByText("Desactivada")).toHaveCount(0);

  // Invita a una persona: aparece en «Invitados» con su contraseña inicial, y esa contraseña sirve.
  await page.getByRole("button", { name: "Invitar", exact: true }).click();
  await page.getByLabel("Nombre completo", { exact: true }).fill("Persona Invitada E2E");
  await page.getByLabel("Correo", { exact: true }).fill(INVITED);
  await page.getByRole("button", { name: "Crear cuentas" }).click();
  const row = page.getByRole("row", { name: new RegExp(INVITED) });
  await expect(row).toBeVisible();
  const initial = (await row.getByRole("cell").last().innerText()).trim();
  await page.getByRole("tab", { name: /Invitados/ }).click();
  await expect(page.getByRole("listitem").filter({ hasText: INVITED }).getByText("Primer acceso")).toBeVisible();
  const first = await page.request.post("/api/session/login", { data: { email: INVITED, password: initial } });
  expect(first.status()).toBe(200);

  // Un administrador no puede quitarse su propio acceso desde la interfaz.
  await page.getByRole("tab", { name: /Existentes/ }).click();
  await page.getByLabel("Buscar por nombre o correo").fill(ADMIN);
  const mine = page.getByRole("listitem").filter({ hasText: ADMIN });
  await mine.getByRole("button", { name: "Editar" }).click();
  await expect(mine.getByLabel("Cuenta activa")).toBeDisabled();
});
