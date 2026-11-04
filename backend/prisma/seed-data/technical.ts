import { createHash } from "node:crypto";
import { XP, type SeedChallenge } from "./types";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const base = { category: "Preservación forense", track: "TECHNICAL" as const };

// IoC sintético: el hash de la «muestra» que publica la inteligencia de amenazas.
const IOC_HASH = sha("sintetico:lumen-loader:v2");

const authLog = [
  "Nov 12 02:14:03 srv-app01 sshd[2211]: Accepted publickey for deploy from 10.0.4.12 port 51234",
  "Nov 12 02:19:40 srv-app01 sshd[2250]: Failed password for jlopez from 10.0.4.57 port 50122",
  "Nov 12 02:19:52 srv-app01 sshd[2250]: Accepted password for jlopez from 10.0.4.57 port 50124",
  "Nov 12 02:31:47 srv-app01 sshd[2301]: Failed password for admin from 203.0.113.45 port 40122",
  "Nov 12 02:31:52 srv-app01 sshd[2301]: Failed password for admin from 203.0.113.45 port 40123",
  "Nov 12 02:32:03 srv-app01 sshd[2301]: Failed password for root from 203.0.113.45 port 40125",
  "Nov 12 02:32:15 srv-app01 sshd[2301]: Failed password for admin from 203.0.113.45 port 40127",
  "Nov 12 02:32:41 srv-app01 sshd[2301]: Failed password for admin from 203.0.113.45 port 40129",
  "Nov 12 02:33:21 srv-app01 sshd[2310]: Accepted password for admin from 203.0.113.45 port 40131",
  "Nov 12 02:34:05 srv-app01 sudo: admin : TTY=pts/0 ; COMMAND=/usr/bin/cat /etc/shadow",
  "Nov 12 02:36:18 srv-app01 sshd[2344]: Accepted publickey for deploy from 10.0.4.12 port 51301",
  "Nov 12 03:02:09 srv-app01 CRON[2402]: pam_unix(cron:session): session opened for user root",
].join("\n");

const whoisInfo = [
  "Domain Name: SOPORTE-NUBE.EXAMPLE",
  "Registrar: Registrador Ejemplo S.A.",
  "Creation Date: 2014-03-18T00:00:00Z",
  "Registry Expiry Date: 2028-03-18T00:00:00Z",
  "Registrant Organization: Nube Corporativa MX S.A. de C.V.",
  "Registrant Country: MX",
  "Name Server: ns1.nube-corporativa.example",
  "DNSSEC: signedDelegation",
  "Status: clientTransferProhibited",
].join("\n");

export const technicalChallenges: SeedChallenge[] = [
  {
    ...base, title: "Orden de volatilidad básico", difficultyLevel: "INTERMEDIATE", baseXp: XP.INTERMEDIATE, orderIndex: 1,
    payloadConfig: { type: "custody", scenario: "Un servidor sigue encendido y podría estar comprometido. Antes de apagarlo, ordena las fuentes de evidencia de la más volátil (se pierde primero) a la menos volátil, según RFC 3227.",
      items: ["Almacenamiento local", "Procesos del sistema", "Memoria RAM", "Tráfico de red activo"] },
    solution: { order: ["Memoria RAM", "Tráfico de red activo", "Procesos del sistema", "Almacenamiento local"] },
    explanationGuide: "RFC 3227 e ISO/IEC 27037: se recolecta primero lo que desaparece más rápido. La RAM se pierde al apagar, luego las conexiones activas y los procesos, y el disco dura más.",
  },
  {
    ...base, title: "Verifica el binario sospechoso", difficultyLevel: "INTERMEDIATE", baseXp: XP.INTERMEDIATE, orderIndex: 2,
    payloadConfig: { type: "terminal", host: "analista@dsi-lab", cwd: "~/caso-0412",
      scenario: `El antivirus marcó el archivo updater_helper.exe en la estación de contabilidad. La inteligencia de amenazas publica este SHA-256 para la muestra «Lumen Loader»: ${IOC_HASH}`,
      objective: "Calcula el hash del archivo con sha256sum, compáralo con el indicador y emite tu veredicto.",
      files: [
        { name: "updater_helper.exe", binary: true, sha256: IOC_HASH, size: "412 KB" },
        { name: "calc_backup.exe", binary: true, sha256: sha("sintetico:calc:legitimo"), size: "96 KB" },
        { name: "nota_del_caso.txt", content: "Archivo recuperado de C:\\Users\\contabilidad\\AppData\\Local\\Temp.\nEl antivirus lo marcó a las 10:42.", size: "1 KB" },
      ], whois: {} },
    solution: { verdict: "CONFIRMED" },
    explanationGuide: "El hash de updater_helper.exe coincide exactamente con el indicador de compromiso: es la muestra conocida. Un solo carácter distinto bastaría para que fuera otro archivo.",
  },
  {
    ...base, title: "¿Dominio no confiable?", difficultyLevel: "INTERMEDIATE", baseXp: XP.INTERMEDIATE, orderIndex: 3,
    payloadConfig: { type: "terminal", host: "analista@dsi-lab", cwd: "~/caso-0415",
      scenario: "El proxy generó la alerta «dominio externo no confiable» por conexiones a soporte-nube.example desde varios equipos. El proveedor de nube contratado por la empresa es Nube Corporativa MX S.A. de C.V.",
      objective: "Consulta el registro del dominio con whois y decide si la alerta es un incidente real.",
      files: [{ name: "alerta_proxy.txt", content: "ALERTA proxy-02: conexiones HTTPS repetidas a soporte-nube.example (14 equipos, 09:00-09:40).", size: "1 KB" }],
      whois: { "soporte-nube.example": whoisInfo } },
    solution: { verdict: "FALSE_POSITIVE" },
    explanationGuide: "El dominio lleva años registrado a nombre del proveedor contratado, tiene DNSSEC y contactos verificables. Es un falso positivo: confirmar con datos evita bloquear servicios legítimos.",
  },
  {
    ...base, title: "Orden de volatilidad completo", difficultyLevel: "ADVANCED", baseXp: XP.ADVANCED, orderIndex: 4,
    payloadConfig: { type: "custody", scenario: "Preparas el procedimiento de respuesta ante un incidente. Ordena estas seis fuentes de la más volátil a la menos volátil, según RFC 3227.",
      items: ["Medios de archivo y respaldos", "Sistema de archivos temporal", "Disco duro", "Registros y caché del procesador", "Memoria RAM y tabla de procesos", "Registros de monitoreo remotos"] },
    solution: { order: ["Registros y caché del procesador", "Memoria RAM y tabla de procesos", "Sistema de archivos temporal", "Disco duro", "Registros de monitoreo remotos", "Medios de archivo y respaldos"] },
    explanationGuide: "El orden de RFC 3227 va de lo que dura nanosegundos (registros y caché) hasta lo que dura años (medios de archivo). Documenta cada paso para sostener la cadena de custodia.",
  },
  {
    ...base, title: "Rastros en el log de autenticación", difficultyLevel: "ADVANCED", baseXp: XP.ADVANCED, orderIndex: 5,
    payloadConfig: { type: "terminal", host: "analista@dsi-lab", cwd: "~/caso-0412",
      scenario: "Se detectó actividad sospechosa desde la IP 203.0.113.45 contra el servidor srv-app01 durante la madrugada.",
      objective: "Busca esa IP en auth.log con grep, revisa qué ocurrió y emite tu veredicto.",
      files: [{ name: "auth.log", content: authLog, size: "3 KB" }], whois: {} },
    solution: { verdict: "CONFIRMED" },
    explanationGuide: "Varios intentos fallidos desde 203.0.113.45 terminan en un «Accepted password» para admin y, minutos después, un comando sudo que lee /etc/shadow. Fuerza bruta exitosa y acceso a credenciales: compromiso confirmado.",
  },
];
