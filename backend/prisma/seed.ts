import "dotenv/config";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";
import { diagnosticChallenges } from "./seed-data/diagnostic";
import { mvpChallenges } from "./seed-data";

const prisma = new PrismaClient();

const departments = ["Finanzas", "Operaciones", "Desarrollo", "Administración", "Recursos Humanos"];

const roles = [
  { name: "COLABORADOR", description: "Personal operativo, comercial y administrativo" },
  { name: "ANALISTA", description: "Personal técnico o de TI con acceso a la ruta técnica" },
  { name: "SECOPS", description: "Administrador de seguridad: CRUD de reactivos y métricas" },
];

const categories = [
  { name: "Typosquatting", description: "Dominios y remitentes falsificados" },
  { name: "Enlaces ocultos", description: "Hipervínculos camuflados y redirecciones" },
  { name: "Adjuntos peligrosos", description: "Extensiones dobles o ejecutables camuflados" },
  { name: "Ingeniería social", description: "Pretexting, urgencia y suplantación" },
  { name: "Manipulación de credenciales", description: "MFA, contraseñas y repositorios" },
  { name: "Preservación forense", description: "Orden de volatilidad, hashes e IoCs" },
];

// Usuarios de prueba (datos sintéticos, NDA). Contraseña desde SEED_PASSWORD.
const users = [
  { email: "colaborador@dsintelligence.test", fullName: "Colaboradora de Prueba", role: "COLABORADOR", dept: "Finanzas" },
  { email: "analista@dsintelligence.test", fullName: "Analista de Prueba", role: "ANALISTA", dept: "Desarrollo" },
  { email: "secops@dsintelligence.test", fullName: "SecOps de Prueba", role: "SECOPS", dept: "Operaciones" },
];

async function main() {
  for (const name of departments) {
    await prisma.department.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const r of roles) {
    await prisma.role.upsert({ where: { name: r.name }, update: {}, create: r });
  }
  for (const c of categories) {
    await prisma.category.upsert({ where: { name: c.name }, update: {}, create: c });
  }

  // Usuarios de prueba: solo en desarrollo, o en producción si se pide expresamente (SEED_DEMO_USERS=true).
  // En producción el primer administrador se crea con `npm run admin:create`.
  const demoUsers = process.env.SEED_DEMO_USERS ? process.env.SEED_DEMO_USERS === "true" : process.env.NODE_ENV !== "production";
  if (demoUsers) {
    const password = process.env.SEED_PASSWORD;
    if (!password) throw new Error("SEED_PASSWORD no está definido en .env");
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    for (const u of users) {
      const role = await prisma.role.findUniqueOrThrow({ where: { name: u.role } });
      const department = await prisma.department.findUniqueOrThrow({ where: { name: u.dept } });
      await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: { email: u.email, fullName: u.fullName, passwordHash, roleId: role.id, departmentId: department.id },
      });
    }
  }

  // Retos de muestra de las primeras etapas: los reemplazan los 20 del MVP.
  const legacy = await prisma.challenge.findMany({ where: { title: { in: ["Remitente sospechoso", "Orden de volatilidad"] } }, select: { id: true } });
  if (legacy.length) {
    await prisma.attempt.deleteMany({ where: { challengeId: { in: legacy.map((l) => l.id) } } });
    await prisma.challenge.deleteMany({ where: { id: { in: legacy.map((l) => l.id) } } });
  }

  for (const { category, ...c } of [...mvpChallenges, ...diagnosticChallenges]) {
    const cat = await prisma.category.findUniqueOrThrow({ where: { name: category } });
    const data = { ...c, categoryId: cat.id, payloadConfig: c.payloadConfig as object, solution: c.solution as object };
    const existing = await prisma.challenge.findFirst({ where: { title: c.title } });
    // Un reto que ya existe no se toca (el administrador pudo editarlo): se reescribe solo con SEED_OVERWRITE=true.
    if (!existing) await prisma.challenge.create({ data });
    else if (process.env.SEED_OVERWRITE === "true") await prisma.challenge.update({ where: { id: existing.id }, data });
  }
  console.log("Seed completo");
}

main().finally(() => prisma.$disconnect());
