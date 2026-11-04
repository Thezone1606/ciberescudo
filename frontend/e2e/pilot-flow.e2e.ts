import { expect, test, type Page } from "@playwright/test";
import { ADMIN, login, PLAYER } from "./helpers";

// Flujo del piloto: el administrador abre el diagnóstico inicial → la práctica queda bloqueada hasta
// terminarlo → el colaborador lo contesta → la práctica se desbloquea → evaluación final y cuestionario SUS →
// el reporte del administrador cuenta a esa persona.
async function setPhase(admin: Page, label: string) {
  await admin.goto("/admin/piloto");
  await admin.getByRole("radio", { name: new RegExp(label) }).check();
  await admin.getByRole("button", { name: "Confirmar cambio" }).click();
  await expect(admin.getByText("Fase actual")).toBeVisible();
}

async function answerDiagnostic(player: Page, heading: string) {
  await player.goto("/diagnostico");
  await expect(player.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
  const start = player.getByRole("button", { name: "Comenzar" });
  if (await start.isVisible().catch(() => false)) await start.click();
  for (let i = 0; i < 8; i++) {
    await player.getByRole("button", { name: "Es un correo legítimo" }).click();
    // Se espera a que avance el contador (o aparezca el cierre) antes de contestar el siguiente.
    if (i < 7) await expect(player.getByText(new RegExp(String.raw`Correo\s*${i + 2}\s*de`))).toBeVisible();
  }
  await expect(player.getByRole("heading", { name: "Listo, gracias" })).toBeVisible();
}

test("el piloto: diagnóstico inicial bloquea la práctica, se contesta y el reporte lo refleja", async ({ browser, page }) => {
  await login(page, ADMIN);
  await setPhase(page, "Diagnóstico inicial");

  const ctx = await browser.newContext({ locale: "es-MX", timezoneId: "America/Mexico_City" });
  const player = await ctx.newPage();
  await login(player, PLAYER);

  // Con el diagnóstico pendiente no hay rutas para practicar.
  await expect(player.getByText("Primero, el diagnóstico inicial")).toBeVisible();
  await expect(player.getByRole("tab")).toHaveCount(0);

  await answerDiagnostic(player, "Diagnóstico inicial");
  await player.goto("/");
  await expect(player.getByRole("tab").first()).toBeVisible();

  // Práctica → evaluación final → cuestionario.
  await setPhase(page, "Evaluación final");
  await answerDiagnostic(player, "Evaluación final");

  await player.goto("/encuesta");
  for (let i = 0; i < 10; i++) await player.locator(`input[name="q${i}"]`).nth(4).check({ force: true });
  await player.getByRole("button", { name: "Enviar respuestas" }).click();
  await expect(player.getByRole("status").getByText(/gracias/i)).toBeVisible();
  await ctx.close();

  // El reporte cuenta esa persona en el emparejamiento y en la encuesta.
  await page.goto("/admin/piloto");
  await expect(page.getByRole("heading", { name: "Resultados" })).toBeVisible();
  await expect(page.getByText(/Solo cuentan las\s*[1-9]\d*\s*personas/)).toBeVisible();
  await expect(page.getByText(/[1-9]\d* respuestas/)).toBeVisible();
});
