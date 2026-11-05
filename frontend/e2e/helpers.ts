import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

// La contraseña de los usuarios de prueba vive en backend/.env (SEED_PASSWORD); no se escribe aquí.
export function seedPassword(): string {
  const env = fs.readFileSync(path.resolve(__dirname, "../../backend/.env"), "utf8");
  const m = env.match(/^SEED_PASSWORD="?([^"\r\n]+)"?/m);
  if (!m) throw new Error("SEED_PASSWORD no está definido en backend/.env");
  return m[1];
}

export const ADMIN = "secops@dsintelligence.test";
export const PLAYER = "colaborador@dsintelligence.test";

/** Entra por el portal que le corresponde: administración (/admin/login) o usuarios (/login). */
export async function login(page: Page, email: string) {
  const admin = email === ADMIN;
  await page.goto(admin ? "/admin/login" : "/login");
  await page.getByLabel(admin ? "Correo de administración" : "Correo corporativo").fill(email);
  await page.getByLabel("Contraseña").fill(seedPassword());
  await page.getByRole("button", { name: admin ? "Entrar a administración" : "Entrar" }).click();
  await page.waitForURL(admin ? "**/admin" : "**/");
}

