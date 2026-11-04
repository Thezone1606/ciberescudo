import "dotenv/config";
import fs from "node:fs";
import { prisma } from "../src/db";
import { credentialsCsv, importParticipants, parseParticipants } from "../src/modules/pilot/pilot-users";

// Alta masiva de los participantes del piloto.
//   npx tsx scripts/pilot-users.ts participantes.csv > credenciales.csv
//   cat participantes.csv | node dist/scripts/pilot-users.js > credenciales.csv      (Docker, por stdin)
// El CSV lleva las columnas: correo, nombre, departamento, rol (COLABORADOR o ANALISTA; vacío = COLABORADOR).
// Las contraseñas iniciales salen SOLO por la salida estándar (la hoja de credenciales): entrégalas por un
// canal seguro y borra la hoja. Con --reset se restablece la contraseña de cuentas que ya existen.
async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes("--reset");
  const file = args.find((a) => !a.startsWith("--"));
  const text = file ? fs.readFileSync(file, "utf8") : fs.readFileSync(0, "utf8");

  const departments = (await prisma.department.findMany()).map((d) => d.name);
  const { rows, errors } = parseParticipants(text, departments);
  if (errors.length) {
    console.error("No se creó ninguna cuenta: corrige el archivo.");
    for (const e of errors) console.error(`  línea ${e.line}: ${e.message}`);
    process.exitCode = 1;
    return;
  }

  const results = await importParticipants(rows, { resetExisting: reset });
  process.stdout.write(credentialsCsv(results));
  const count = (s: string) => results.filter((r) => r.status === s).length;
  console.error(`Listo: ${count("creada")} creadas, ${count("contraseña restablecida")} restablecidas, ${count("ya existía")} ya existían.`);
  console.error("La hoja de credenciales contiene contraseñas: entrégalas por un canal seguro y bórrala después.");
}

main()
  .catch((e) => {
    console.error(`Error: ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
