import "dotenv/config";
import { prisma } from "../src/db";

// Limpieza tras la prueba E2E: borra los retos «E2E …» (y sus intentos), devuelve el progreso del
// usuario de prueba a cero y deja el piloto apagado sin datos de diagnóstico ni cuestionarios.
// Solo para la base de desarrollo.
async function main() {
  const e2e = await prisma.challenge.findMany({ where: { title: { startsWith: "E2E " } }, select: { id: true } });
  const ids = e2e.map((c) => c.id);
  await prisma.attempt.deleteMany({ where: { challengeId: { in: ids } } });
  await prisma.challenge.deleteMany({ where: { id: { in: ids } } });
  await prisma.attempt.deleteMany({ where: { phase: { not: "PRACTICE" } } });
  await prisma.susResponse.deleteMany();
  await prisma.setting.deleteMany({ where: { key: "pilot_phase" } });
  await prisma.user.updateMany({
    where: { email: "colaborador@dsintelligence.test" },
    data: { currentXp: 0, currentStreak: 0, shieldIntegrity: 100, cooldownUntil: null, lastActivityDate: null, isActive: true },
  });
  // La prueba de usuarios cambia el departamento del usuario de prueba: se devuelve a Finanzas.
  const finanzas = await prisma.department.findUnique({ where: { name: "Finanzas" } });
  if (finanzas) await prisma.user.updateMany({ where: { email: "colaborador@dsintelligence.test" }, data: { departmentId: finanzas.id } });
  console.log(`E2E limpio: ${ids.length} retos eliminados; piloto apagado`);
}

main().finally(() => prisma.$disconnect());
