import { expect, test } from "@playwright/test";

// Una persona nueva crea su cuenta desde la página de usuarios, entra directo a sus retos,
// puede volver a iniciar sesión con la contraseña que eligió y no ve nada de administración.
test("registro propio: crear cuenta, entrar a los retos y volver a iniciar sesión", async ({ page }) => {
  const email = `e2e.registro.${Date.now()}@dsintelligence.test`;
  const password = "Mi-Clave-123";

  await page.goto("/login");
  await page.getByRole("link", { name: "Crea tu cuenta" }).click();
  await page.waitForURL("**/registro", { timeout: 90_000 }); // la primera visita compila la página en desarrollo
  await expect(page.getByRole("heading", { name: "Crea tu cuenta" })).toBeVisible();

  // El botón espera a que se cumplan los requisitos de la contraseña.
  await page.getByLabel("Nombre completo").fill("Persona Registrada E2E");
  await page.getByLabel("Correo corporativo").fill(email);
  await page.getByLabel("Departamento").selectOption({ label: "Desarrollo" });
  await page.getByLabel("Contraseña", { exact: true }).fill("corta");
  await page.getByLabel("Repite la contraseña").fill("corta");
  await expect(page.getByRole("button", { name: "Crear cuenta" })).toBeDisabled();
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByLabel("Repite la contraseña").fill("otra-distinta-123");
  await expect(page.getByRole("button", { name: "Crear cuenta" })).toBeDisabled();
  await page.getByLabel("Repite la contraseña").fill(password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  // Entra directo a sus retos, sin administración.
  await page.waitForURL("**/");
  await expect(page.getByRole("heading", { name: "Tus retos" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Administración" })).toHaveCount(0);

  // Con otro dominio no se puede registrar.
  const other = await page.context().browser()!.newContext({ locale: "es-MX" });
  const p2 = await other.newPage();
  await p2.goto("/registro");
  await p2.getByLabel("Nombre completo").fill("Externo Prueba");
  await p2.getByLabel("Correo corporativo").fill(`externo.${Date.now()}@gmail.com`);
  await p2.getByLabel("Contraseña", { exact: true }).fill(password);
  await p2.getByLabel("Repite la contraseña").fill(password);
  await p2.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(p2.getByRole("alert").filter({ hasText: "correo corporativo" })).toBeVisible();
  await other.close();

  // Cierra sesión y vuelve a entrar con la contraseña elegida.
  await page.getByRole("button", { name: /Cuenta de/ }).click();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.waitForURL("**/login");
  await page.getByLabel("Correo corporativo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/");
  await expect(page.getByRole("heading", { name: "Tus retos" })).toBeVisible();
});
