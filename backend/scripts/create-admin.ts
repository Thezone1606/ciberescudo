import "dotenv/config";
import argon2 from "argon2";
import { prisma } from "../src/db";

// Crea (o restablece la contraseña de) una cuenta de administración SECOPS.
// Uso: ADMIN_EMAIL=... ADMIN_PASSWORD=... [ADMIN_NAME=...] [ADMIN_DEPARTMENT=...] npm run admin:create
// La contraseña nunca se imprime ni se guarda en texto plano.
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_NAME?.trim() || "Administrador";
  const departmentName = process.env.ADMIN_DEPARTMENT?.trim() || "Desarrollo";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("ADMIN_EMAIL no es un correo válido");
  if (!password || password.length < 12) throw new Error("ADMIN_PASSWORD debe tener al menos 12 caracteres");
  if (password.toLowerCase().includes(email.split("@")[0])) throw new Error("ADMIN_PASSWORD no debe contener el nombre del correo");

  const [role, department] = await Promise.all([
    prisma.role.findUnique({ where: { name: "SECOPS" } }),
    prisma.department.findUnique({ where: { name: departmentName } }),
  ]);
  if (!role) throw new Error("No existe el rol SECOPS: ejecuta primero el seed (npm run db:seed)");
  if (!department) throw new Error(`No existe el departamento «${departmentName}»`);

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Restablecer la contraseña también cierra las sesiones abiertas de esa cuenta.
    await prisma.$transaction([
      prisma.user.update({ where: { id: existing.id }, data: { passwordHash, roleId: role.id, fullName, tokenVersion: { increment: 1 } } }),
      prisma.refreshToken.deleteMany({ where: { userId: existing.id } }),
    ]);
    console.log(`Cuenta actualizada: ${email} (rol SECOPS)`);
  } else {
    await prisma.user.create({ data: { email, fullName, passwordHash, roleId: role.id, departmentId: department.id } });
    console.log(`Cuenta creada: ${email} (rol SECOPS)`);
  }
}

main()
  .catch((e) => {
    console.error(`Error: ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
