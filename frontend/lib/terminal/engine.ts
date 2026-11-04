// Motor de comandos de la terminal de práctica. Es un intérprete cerrado: solo conoce la lista
// de abajo y trabaja sobre archivos y datos que vienen del reto. No ejecuta nada del sistema,
// no abre conexiones y no evalúa código: cualquier otra cosa es «orden no encontrada».

export interface TermFile {
  name: string;
  content?: string;
  binary?: boolean;
  sha256?: string;
  size?: string;
}

export interface TermEnv {
  host: string;
  cwd: string;
  files: TermFile[];
  whois: Record<string, string>;
}

export interface RunResult {
  lines: string[];
  clear?: boolean;
}

export const COMMANDS = ["help", "ls", "cat", "grep", "sha256sum", "whois", "clear"] as const;

const out = (...lines: string[]): RunResult => ({ lines });
const MAX_LINE = 400;

/** Separa en palabras respetando comillas. Devuelve error si hay comilla sin cerrar u operadores de shell. */
export function tokenize(line: string): { tokens: string[] } | { error: string } {
  const tokens: string[] = [];
  let cur = "";
  let quote: '"' | "'" | null = null;
  let started = false;
  for (const ch of line) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
    } else if (/\s/.test(ch)) {
      if (started || cur) tokens.push(cur);
      cur = "";
      started = false;
    } else if ("|><;&`".includes(ch) || (ch === "$" && line.includes("$("))) {
      return { error: "bash: los operadores de shell (| > < ; & $( `) no están disponibles en este entorno de práctica." };
    } else {
      cur += ch;
    }
  }
  if (quote) return { error: "bash: se esperaba el cierre de una comilla." };
  if (started || cur) tokens.push(cur);
  return { tokens };
}

function findFile(env: TermEnv, name: string) {
  return env.files.find((f) => f.name === name);
}

function ls(args: string[], env: TermEnv): RunResult {
  const long = args.includes("-l");
  const targets = args.filter((a) => a !== "-l" && a !== "." && a !== "./");
  if (targets.length) return out(`ls: no se puede acceder a '${targets[0]}': No existe el archivo o el directorio`);
  if (long) return out(...env.files.map((f) => `${(f.size ?? "").padStart(7)}  ${f.name}`));
  return out(env.files.map((f) => f.name).join("  "));
}

function cat(args: string[], env: TermEnv): RunResult {
  if (!args.length) return out("cat: falta el nombre del archivo");
  const lines: string[] = [];
  for (const name of args) {
    const f = findFile(env, name);
    if (!f) lines.push(`cat: ${name}: No existe el archivo o el directorio`);
    else if (f.binary || f.content === undefined) lines.push(`cat: ${name}: es un archivo binario (usa sha256sum para analizarlo)`);
    else lines.push(...f.content.split("\n"));
  }
  return { lines };
}

function grep(args: string[], env: TermEnv): RunResult {
  const flags = args.filter((a) => /^-[inE]+$/.test(a)).join("");
  const rest = args.filter((a) => !/^-[inE]+$/.test(a));
  if (rest.length < 2) return out("Uso: grep [-i] [-n] [-E] PATRÓN ARCHIVO");
  const [pattern, name] = rest;
  const f = findFile(env, name);
  if (!f) return out(`grep: ${name}: No existe el archivo o el directorio`);
  if (f.binary || f.content === undefined) return out(`grep: ${name}: es un archivo binario`);
  if (pattern.length > 100) return out("grep: el patrón es demasiado largo");
  let re: RegExp;
  try {
    // Como grep básico: sin -E, los símbolos | + ? ( ) { } son texto literal.
    const source = flags.includes("E") ? pattern : pattern.replace(/[|+?(){}]/g, (m) => String.fromCharCode(92) + m);
    re = new RegExp(source, flags.includes("i") ? "i" : "");
  } catch {
    return out("grep: expresión regular no válida");
  }
  const lines = f.content.split("\n");
  const hits: string[] = [];
  lines.forEach((l, i) => {
    if (re.test(l)) hits.push(flags.includes("n") ? `${i + 1}:${l}` : l);
  });
  return { lines: hits };
}

function sha256sum(args: string[], env: TermEnv): RunResult {
  if (!args.length) return out("sha256sum: falta el nombre del archivo");
  return {
    lines: args.map((name) => {
      const f = findFile(env, name);
      if (!f) return `sha256sum: ${name}: No existe el archivo o el directorio`;
      if (!f.sha256) return `sha256sum: ${name}: este archivo no se puede analizar en el entorno de práctica`;
      return `${f.sha256}  ${f.name}`;
    }),
  };
}

function whois(args: string[], env: TermEnv): RunResult {
  if (!args.length) return out("whois: falta el dominio");
  const domain = args[0].toLowerCase();
  const text = env.whois[domain];
  return text ? { lines: text.split("\n") } : out(`No match for "${domain.toUpperCase()}".`);
}

function help(): RunResult {
  return out(
    "Comandos disponibles:",
    "  ls [-l]                     lista los archivos",
    "  cat ARCHIVO                 muestra un archivo de texto",
    "  grep [-i -n -E] PATRÓN ARCHIVO",
    "                              busca líneas que coincidan",
    "  sha256sum ARCHIVO           calcula el hash SHA-256",
    "  whois DOMINIO               consulta el registro de un dominio",
    "  clear                       limpia la pantalla",
  );
}

export function runCommand(line: string, env: TermEnv): RunResult {
  const trimmed = line.trim();
  if (!trimmed) return { lines: [] };
  if (trimmed.length > MAX_LINE) return out("bash: la línea es demasiado larga");

  const parsed = tokenize(trimmed);
  if ("error" in parsed) return out(parsed.error);
  const [cmd, ...args] = parsed.tokens;

  switch (cmd) {
    case "help":
      return help();
    case "ls":
      return ls(args, env);
    case "cat":
      return cat(args, env);
    case "grep":
      return grep(args, env);
    case "sha256sum":
      return sha256sum(args, env);
    case "whois":
      return whois(args, env);
    case "clear":
      return { lines: [], clear: true };
    default:
      return out(`bash: ${cmd}: orden no encontrada. Escribe help para ver las disponibles.`);
  }
}

export const prompt = (env: TermEnv) => `${env.host}:${env.cwd}$ `;
