-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_login_at" TIMESTAMPTZ;

-- Las cuentas que ya tienen actividad (sesiones o intentos) cuentan como existentes.
UPDATE "users" SET "last_login_at" = "updated_at"
WHERE EXISTS (SELECT 1 FROM "refresh_tokens" r WHERE r."user_id" = "users"."id")
   OR EXISTS (SELECT 1 FROM "attempts" a WHERE a."user_id" = "users"."id");
