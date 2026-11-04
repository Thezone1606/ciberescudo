import { describe, expect, it } from "vitest";
import { generatePassword, parseCsv, parseParticipants } from "../src/modules/pilot/pilot-users";

const DEPTS = ["Finanzas", "Operaciones", "Desarrollo", "Administración", "Recursos Humanos"];
const parse = (csv: string) => parseParticipants(csv, DEPTS);

describe("lector de CSV", () => {
  it("maneja BOM, CRLF, líneas vacías, comillas, comas y saltos de línea dentro de comillas", () => {
    const csv = '﻿a,b,c\r\n"1,5","dice ""hola""","x\ny"\r\n\r\n4,5,6\r\n';
    expect(parseCsv(csv)).toEqual([["a", "b", "c"], ["1,5", 'dice "hola"', "x\ny"], ["4", "5", "6"]]);
  });
});

describe("validación del archivo de participantes", () => {
  it("acepta encabezados en español, en cualquier orden y normaliza correo y departamento", () => {
    const { rows, errors } = parse("nombre,rol,Departamento,CORREO\nAna Pérez,analista,desarrollo,ANA@DSINTELLIGENCE.COM\nLuis Gómez,,administración,luis@dsintelligence.com\n");
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { email: "ana@dsintelligence.com", fullName: "Ana Pérez", department: "Desarrollo", role: "ANALISTA" },
      { email: "luis@dsintelligence.com", fullName: "Luis Gómez", department: "Administración", role: "COLABORADOR" }, // rol vacío → colaborador
    ]);
  });

  it("reporta cada error con su línea y no inventa filas", () => {
    const { errors } = parse(
      ["correo,nombre,departamento,rol", "no-es-correo,Ana,Finanzas,", "a@x.com,,Finanzas,", "b@x.com,Beto,Marte,", "c@x.com,Carla,Finanzas,SECOPS", "d@x.com,Dani,Finanzas,", "d@x.com,Dani otra vez,Finanzas,"].join("\n"),
    );
    expect(errors.map((e) => e.line)).toEqual([2, 3, 4, 5, 7]);
    expect(errors[0].message).toMatch(/Correo no válido/);
    expect(errors[1].message).toMatch(/nombre es obligatorio/);
    expect(errors[2].message).toMatch(/Departamento desconocido.*Finanzas/);
    expect(errors[3].message).toMatch(/Rol no permitido/); // un administrador no se da de alta como participante
    expect(errors[4].message).toMatch(/repetido/);
  });

  it("falta de columnas obligatorias o archivo vacío", () => {
    expect(parse("correo,nombre\na@x.com,Ana").errors[0].message).toMatch(/departamento/);
    expect(parse("").errors[0].message).toMatch(/vacío/);
    expect(parse("   \n\n").errors[0].message).toMatch(/vacío/);
  });
});

describe("contraseñas iniciales", () => {
  it("16 caracteres, sin caracteres ambiguos y distintas en cada llamada", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const p = generatePassword();
      expect(p).toHaveLength(16);
      expect(p).toMatch(/^[A-HJ-NP-Za-km-z2-9]+$/); // sin 0, O, 1, I, l
      seen.add(p);
    }
    expect(seen.size).toBe(2000);
  });

  it("usa todo el alfabeto (no un subconjunto)", () => {
    const chars = new Set(Array.from({ length: 400 }, () => generatePassword()).join(""));
    expect(chars.size).toBeGreaterThan(45);
  });
});
