import { expect, test } from "@playwright/test";
import { ADMIN, login, PLAYER } from "./helpers";

// Flujo completo de la Etapa 6: el administrador crea un reto → un colaborador lo resuelve →
// el panel de administración refleja los intentos.
test("el administrador crea un reto, un colaborador lo resuelve y el panel se actualiza", async ({ browser, page }) => {
  const title = `E2E reto ${Date.now()}`;

  // 1. El administrador entra y ve la sección de administración.
  await login(page, ADMIN);
  await page.getByRole("link", { name: "Administración" }).first().click();
  await expect(page.getByRole("heading", { name: "Administración", level: 1 })).toBeVisible();

  // Intentos totales antes (indicador «N intentos en el periodo»).
  const attemptsOf = async () => {
    await page.getByRole("combobox", { name: "Periodo" }).selectOption("all");
    const note = page.getByText(/\d+ intentos en el periodo/);
    await expect(note).toBeVisible();
    return Number((await note.innerText()).match(/(\d+) intentos/)![1]);
  };
  const before = await attemptsOf();

  // 2. Crea un reto de decisión rápida.
  await page.getByRole("link", { name: "Retos", exact: true }).last().click();
  await page.getByRole("link", { name: "Nuevo reto" }).click();
  await page.getByRole("radio", { name: /Decisión rápida/ }).check();
  await page.getByLabel("Título").fill(title);
  await page.getByRole("combobox", { name: "Categoría" }).selectOption({ label: "Manipulación de credenciales" });
  await page.getByLabel("Explicación para el jugador").fill("Un aviso de verificación que no pediste indica que alguien tiene tu contraseña.");
  await page.getByLabel("Escenario").fill("Te llega una solicitud de aprobación que tú no iniciaste.");
  await page.getByLabel("Pregunta").fill("¿Qué haces?");
  await page.getByLabel("Texto de la opción 1").fill("Apruebo para que deje de sonar");
  await page.getByLabel("Texto de la opción 2").fill("Rechazo y reporto el intento");
  await page.getByLabel("La opción 2 es la correcta").check();
  await page.getByRole("button", { name: "Crear reto" }).click();

  const row = page.getByRole("row", { name: new RegExp(title) });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Activo");
  const href = await row.getByRole("link", { name: title }).getAttribute("href");
  const challengeId = href!.split("/").pop()!;

  // 3. Un colaborador (sesión aparte) lo resuelve: primero se equivoca y luego acierta.
  const playerContext = await browser.newContext({ locale: "es-MX", timezoneId: "America/Mexico_City" });
  const player = await playerContext.newPage();
  await login(player, PLAYER);
  await player.goto(`/retos/${challengeId}`);
  await expect(player.getByRole("heading", { name: title })).toBeVisible();
  await player.getByLabel("Apruebo para que deje de sonar").check();
  await player.getByRole("button", { name: "Responder" }).click();
  await expect(player.getByRole("heading", { name: "Aún no" })).toBeVisible();
  await player.getByRole("button", { name: "Intentar de nuevo" }).click();
  await player.getByLabel("Rechazo y reporto el intento").check();
  await player.getByRole("button", { name: "Responder" }).click();
  await expect(player.getByRole("heading", { name: "¡Correcto!" })).toBeVisible();
  await expect(player.getByRole("status").getByText("+10 XP")).toBeVisible();
  await playerContext.close();

  // 4. El panel de administración refleja los dos intentos y el 50 % de fallo.
  await page.reload();
  await page.getByRole("row", { name: new RegExp(title) }).waitFor();
  const updated = page.getByRole("row", { name: new RegExp(title) });
  await expect(updated).toContainText("50 %");
  await expect(updated.getByRole("cell", { name: "2", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Panel" }).click();
  expect(await attemptsOf()).toBeGreaterThanOrEqual(before + 2);

  // 5. Retira el reto: desaparece para los jugadores.
  await page.getByRole("link", { name: "Retos", exact: true }).last().click();
  await page.getByRole("row", { name: new RegExp(title) }).getByRole("button", { name: "Retirar" }).click();
  await expect(page.getByRole("row", { name: new RegExp(title) })).toContainText("Retirado");
});

test("un colaborador no puede entrar a administración", async ({ page }) => {
  await login(page, PLAYER);
  await expect(page.getByRole("link", { name: "Administración" })).toHaveCount(0);
  await page.goto("/admin");
  await page.waitForURL("**/");
  await expect(page.getByRole("heading", { name: "Tus retos" })).toBeVisible();
});
