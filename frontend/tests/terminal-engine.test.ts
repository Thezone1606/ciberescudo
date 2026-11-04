import { describe, expect, it } from "vitest";
import { runCommand, tokenize, type TermEnv } from "../lib/terminal/engine";

const env: TermEnv = {
  host: "analista@dsi-lab",
  cwd: "~/caso",
  files: [
    { name: "muestra.exe", binary: true, sha256: "a".repeat(64), size: "412 KB" },
    { name: "auth.log", size: "3 KB", content: "Nov 12 Failed password for admin from 203.0.113.45\nNov 12 Accepted password for admin from 203.0.113.45\nNov 12 Accepted publickey for deploy from 10.0.4.12" },
    { name: "nota.txt", content: "hola\nmundo", size: "1 KB" },
  ],
  whois: { "ejemplo.test": "Domain Name: EJEMPLO.TEST\nRegistrar: Demo" },
};
const run = (l: string) => runCommand(l, env).lines;

describe("comandos permitidos", () => {
  it("help lista todos los comandos", () => {
    const text = run("help").join("\n");
    for (const c of ["ls", "cat", "grep", "sha256sum", "whois", "clear"]) expect(text).toContain(c);
  });

  it("ls y ls -l", () => {
    expect(run("ls")).toEqual(["muestra.exe  auth.log  nota.txt"]);
    expect(run("ls -l")[0]).toContain("412 KB");
    expect(run("ls /etc")[0]).toContain("No existe");
  });

  it("cat muestra texto, rechaza binarios y archivos inexistentes", () => {
    expect(run("cat nota.txt")).toEqual(["hola", "mundo"]);
    expect(run("cat muestra.exe")[0]).toContain("binario");
    expect(run("cat fantasma")[0]).toContain("No existe");
    expect(run("cat")[0]).toContain("falta");
  });

  it("grep encuentra líneas, respeta -i y -n", () => {
    expect(run("grep 203.0.113.45 auth.log")).toHaveLength(2);
    expect(run("grep accepted auth.log")).toEqual([]);
    expect(run("grep -i accepted auth.log")).toHaveLength(2);
    expect(run("grep -n Accepted auth.log")[0]).toMatch(/^2:/);
    expect(run('grep "Failed password" auth.log')).toHaveLength(1);
  });

  it("grep maneja uso incorrecto, regex inválida y archivos binarios", () => {
    expect(run("grep patron")[0]).toContain("Uso");
    expect(run("grep -E '(' auth.log")[0]).toContain("no válida");
    expect(run("grep '(' auth.log")).toEqual([]);
    expect(run("grep x muestra.exe")[0]).toContain("binario");
    expect(run("grep x fantasma")[0]).toContain("No existe");
  });

  it("sha256sum devuelve el hash precalculado", () => {
    expect(run("sha256sum muestra.exe")).toEqual([`${"a".repeat(64)}  muestra.exe`]);
    expect(run("sha256sum nota.txt")[0]).toContain("no se puede analizar");
    expect(run("sha256sum fantasma")[0]).toContain("No existe");
  });

  it("whois consulta dominios del caso sin distinguir mayúsculas", () => {
    expect(run("whois EJEMPLO.test")[0]).toBe("Domain Name: EJEMPLO.TEST");
    expect(run("whois otro.test")[0]).toContain("No match");
    expect(run("whois")[0]).toContain("falta");
  });

  it("clear pide limpiar y línea vacía no hace nada", () => {
    expect(runCommand("clear", env)).toEqual({ lines: [], clear: true });
    expect(run("   ")).toEqual([]);
  });
});

describe("aislamiento", () => {
  it("cualquier orden desconocida solo devuelve un mensaje", () => {
    for (const cmd of ["rm -rf /", "curl http://evil.example", "sh", "bash -c id", "python", "cmd.exe", "powershell", "nc 1.2.3.4 80", "whoami", "exit"]) {
      const r = run(cmd);
      expect(r, cmd).toHaveLength(1);
      expect(r[0], cmd).toContain("orden no encontrada");
    }
  });

  it("los operadores de shell se rechazan sin ejecutar nada", () => {
    for (const line of ["ls | cat", "cat nota.txt > otro", "ls; rm x", "ls && id", "echo $(id)", "cat `id`", "cat < nota.txt"]) {
      expect(run(line)[0], line).toContain("operadores de shell");
    }
  });

  it("los operadores dentro de comillas son texto, no operadores", () => {
    expect(run("grep 'a|b' auth.log")).toEqual([]);
    expect(run("grep -iE 'accepted|failed' auth.log")).toHaveLength(3);
  });

  it("comillas sin cerrar y líneas enormes se rechazan", () => {
    expect(run('grep "abc auth.log')[0]).toContain("comilla");
    expect(run("a".repeat(1000))[0]).toContain("demasiado larga");
  });

  it("un patrón muy largo no se evalúa", () => {
    expect(run(`grep ${"a".repeat(200)} auth.log`)[0]).toContain("demasiado largo");
  });

  it("tokenize respeta comillas y espacios", () => {
    expect(tokenize(`grep -i "dos palabras" 'otro archivo'`)).toEqual({ tokens: ["grep", "-i", "dos palabras", "otro archivo"] });
  });
});
