import "dotenv/config";
import { z } from "zod";

const bool = (fallback: boolean) =>
  z
    .enum(["true", "false"])
    .default(fallback ? "true" : "false")
    .transform((v) => v === "true");

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1),
    CORS_ORIGIN: z.string().default("http://localhost:3000"),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    // Detrás de Nginx: confía en el primer proxy para leer la IP real del cliente.
    TRUST_PROXY: bool(false),
    // Swagger (/docs) solo en desarrollo, salvo que se active expresamente.
    DOCS_ENABLED: bool(process.env.NODE_ENV !== "production"),
  })
  .superRefine((v, ctx) => {
    if (v.NODE_ENV !== "production") return;
    const bad = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    // En producción los secretos de ejemplo no son aceptables: el servidor se niega a arrancar.
    for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const) {
      if (/cambia-este|changeme|ejemplo/i.test(v[key])) bad(key, "es un valor de ejemplo; genera uno propio (openssl rand -base64 48)");
    }
    if (v.JWT_ACCESS_SECRET === v.JWT_REFRESH_SECRET) bad("JWT_REFRESH_SECRET", "debe ser distinto de JWT_ACCESS_SECRET");
  });

export const env = schema.parse(process.env);
