"use client";

import "@xterm/xterm/css/xterm.css";
import { useEffect, useRef } from "react";
import { prompt, runCommand, type TermEnv } from "@/lib/terminal/engine";

const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

/**
 * Terminal de práctica con xterm.js. Todo ocurre en el navegador: la línea que escribe la persona
 * va a `runCommand` (un intérprete cerrado) y nada se envía al servidor ni al sistema.
 * `onReady` entrega una función para ejecutar un comando desde fuera (entrada de texto alternativa).
 */
export function XTerm({ env, onReady }: { env: TermEnv; onReady: (exec: (line: string) => void) => void }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([import("@xterm/xterm"), import("@xterm/addon-fit")]);
      // El canvas de xterm no resuelve variables CSS: se lee el nombre real de la fuente y se
      // espera a que esté cargada antes de medir las celdas.
      const mono = getComputedStyle(document.documentElement).getPropertyValue("--font-jetbrains").trim();
      await document.fonts.ready;
      if (disposed || !host.current) return;

      const term = new Terminal({
        fontFamily: `${mono ? `${mono}, ` : ""}ui-monospace, monospace`,
        fontSize: 13,
        lineHeight: 1.25,
        cursorBlink: true,
        convertEol: true,
        screenReaderMode: true,
        scrollback: 500,
        theme: { background: "#0b0f19", foreground: "#e2e8f0", cursor: "#06b6d4", selectionBackground: "rgba(6,182,212,0.3)" },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(host.current);
      fit.fit();

      let buffer = "";
      const history: string[] = [];
      let cursor = 0; // posición en el historial al navegar con las flechas
      const showPrompt = () => term.write(`${CYAN}${prompt(env)}${RESET}`);

      const execute = (line: string) => {
        const { lines, clear } = runCommand(line, env);
        if (clear) term.write("\x1b[2J\x1b[H");
        lines.forEach((l) => term.writeln(l));
      };

      term.writeln("Terminal de práctica.");
      term.writeln("Escribe help para ver los comandos.");
      term.writeln("Todo ocurre en tu navegador.");
      term.writeln("");
      showPrompt();

      const replaceLine = (text: string) => {
        term.write("\r\x1b[K");
        showPrompt();
        term.write(text);
        buffer = text;
      };

      const sub = term.onData((data) => {
        if (data === "\r") {
          term.write("\r\n");
          if (buffer.trim()) {
            history.push(buffer);
            cursor = history.length;
          }
          execute(buffer);
          buffer = "";
          showPrompt();
        } else if (data === "\x7f") {
          if (buffer) {
            buffer = buffer.slice(0, -1);
            term.write("\b \b");
          }
        } else if (data === "\x1b[A") {
          if (cursor > 0) replaceLine(history[--cursor]);
        } else if (data === "\x1b[B") {
          if (cursor < history.length - 1) replaceLine(history[++cursor]);
          else if (cursor === history.length - 1) {
            cursor = history.length;
            replaceLine("");
          }
        } else if (data === "\x03") {
          term.write("^C\r\n");
          buffer = "";
          showPrompt();
        } else if (data === "\x0c") {
          term.write("\x1b[2J\x1b[H");
          showPrompt();
          term.write(buffer);
        } else {
          // Texto escrito o pegado: solo caracteres imprimibles, en una sola línea.
          const text = [...data].filter((c) => c >= " " && c !== "\x7f").join("");
          if (text) {
            buffer += text;
            term.write(text);
          }
        }
      });

      // Tab no se captura: así el foco puede salir de la terminal con el teclado.
      term.attachCustomKeyEventHandler((e) => e.key !== "Tab");

      // Ejecución desde la entrada de texto alternativa: se escribe como si lo hubiera tecleado.
      onReady((line) => {
        replaceLine(line);
        term.write("\r\n");
        history.push(line);
        cursor = history.length;
        execute(line);
        buffer = "";
        showPrompt();
      });

      const ro = new ResizeObserver(() => fit.fit());
      ro.observe(host.current);

      cleanup = () => {
        ro.disconnect();
        sub.dispose();
        term.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
    // onReady es estable por diseño del padre; el entorno del reto no cambia durante el intento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env]);

  return <div ref={host} className="h-80 overflow-hidden rounded-lg bg-ink p-2 ring-1 ring-line focus-within:ring-2 focus-within:ring-cyan" />;
}
