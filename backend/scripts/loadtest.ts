import "dotenv/config";
import argon2 from "argon2";
import autocannon from "autocannon";
import { prisma } from "../src/db";

// Prueba de carga ligera contra una API ya levantada (idealmente la compilada, `npm start`).
//   npm run loadtest                      20 conexiones, 15 s, http://localhost:$PORT
//   npm run loadtest -- --connections 30 --duration 20 --url http://localhost:4000
// Crea cuentas temporales «carga.N@dsintelligence.test», las usa y las borra al terminar.
// Meta: latencia p97.5 < 300 ms sin errores. Mide la API directa: el límite de peticiones de Nginx no entra.
const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const connections = Number(arg("connections", "20"));
const duration = Number(arg("duration", "15"));
const base = arg("url", `http://localhost:${process.env.PORT ?? 4000}`);
const GOAL_MS = 300;
const PASSWORD = "Carga-temporal-0123456789";
const emails = Array.from({ length: connections }, (_, i) => `carga.${i + 1}@dsintelligence.test`);

async function main() {
  const quick = (await prisma.challenge.findMany({ where: { isActive: true, isDiagnostic: false } })).find(
    (c) => (c.payloadConfig as { type?: string }).type === "quick",
  );
  if (!quick) throw new Error("No hay un reto de decisión rápida activo");
  const correct = (quick.solution as { correct: string }).correct;

  const [role, department] = await Promise.all([prisma.role.findUniqueOrThrow({ where: { name: "COLABORADOR" } }), prisma.department.findFirstOrThrow()]);
  const passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.user.createMany({ data: emails.map((email, i) => ({ email, fullName: `Carga ${i + 1}`, passwordHash, roleId: role.id, departmentId: department.id })) });

  try {
    const tokens: string[] = [];
    for (const email of emails) {
      const res = await fetch(`${base}/api/v1/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: PASSWORD }) });
      if (!res.ok) throw new Error(`Login de ${email}: ${res.status}`);
      tokens.push(((await res.json()) as { accessToken: string }).accessToken);
    }

    const attempt = JSON.stringify({ time_taken_seconds: 5, response: { choice: correct } });
    let n = 0;
    const result = await autocannon({
      url: base,
      connections,
      duration,
      // Cada conexión usa su propio token; las cabeceras van en cada petición del ciclo.
      setupClient: (client) => {
        const headers = { authorization: `Bearer ${tokens[n++ % tokens.length]}`, "content-type": "application/json" };
        client.setRequests([
          { method: "GET", path: "/api/v1/challenges?track=AWARENESS", headers },
          { method: "POST", path: `/api/v1/challenges/${quick.id}/attempt`, headers, body: attempt },
          { method: "GET", path: "/api/v1/auth/me", headers },
          { method: "GET", path: "/api/v1/pilot/status", headers },
        ]);
      },
    });

    const l = result.latency;
    const errors = result.errors + result.timeouts + result.non2xx;
    console.log(`Conexiones: ${connections}, duración: ${duration} s`);
    console.log(`Peticiones: ${result.requests.total} (${Math.round(result.requests.average)} por segundo)`);
    console.log(`Latencia ms  promedio ${l.average}  p50 ${l.p50}  p97.5 ${l.p97_5}  p99 ${l.p99}  máx ${l.max}`);
    console.log(`Errores: ${result.errors}, tiempos agotados: ${result.timeouts}, respuestas no 2xx: ${result.non2xx}`);
    const ok = errors === 0 && l.p97_5 < GOAL_MS;
    console.log(ok ? `CUMPLE: p97.5 < ${GOAL_MS} ms y sin errores.` : `NO CUMPLE la meta (p97.5 < ${GOAL_MS} ms y sin errores).`);
    process.exitCode = ok ? 0 : 1;
  } finally {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  }
}

main().finally(() => prisma.$disconnect());
