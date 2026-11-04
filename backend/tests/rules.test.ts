import { describe, expect, it } from "vitest";
import {
  applyAttempt,
  calendarDay,
  COOLDOWN_MS,
  dayDiff,
  isInCooldown,
  nextStreak,
  recoverShield,
  streakMultiplier,
  xpFor,
  type GameState,
} from "../src/modules/gamification/rules";

const base: GameState = { xp: 0, streak: 0, shield: 100, cooldownUntil: null, lastActivityDay: null };
const noon = (iso: string) => new Date(`${iso}T18:00:00Z`); // 12:00 en Ciudad de México
const fail = { successful: false, baseXp: 10, firstSuccess: false };

describe("días calendario", () => {
  it("usa la zona horaria de México, no UTC", () => {
    // 2026-11-03 02:30 UTC sigue siendo 2 de noviembre en CDMX
    expect(calendarDay(new Date("2026-11-03T02:30:00Z"))).toBe("2026-11-02");
    expect(calendarDay(new Date("2026-11-03T07:00:00Z"))).toBe("2026-11-03");
  });

  it("dayDiff cuenta días calendario, incluso entre meses y años", () => {
    expect(dayDiff("2026-11-02", "2026-11-03")).toBe(1);
    expect(dayDiff("2026-12-31", "2027-01-01")).toBe(1);
    expect(dayDiff("2026-11-05", "2026-11-02")).toBe(-3);
  });
});

describe("racha", () => {
  it("primer acierto arranca en 1", () => expect(nextStreak(0, null, "2026-11-02")).toBe(1));
  it("ayer suma 1", () => expect(nextStreak(4, "2026-11-01", "2026-11-02")).toBe(5));
  it("hoy mantiene la racha", () => expect(nextStreak(4, "2026-11-02", "2026-11-02")).toBe(4));
  it("hueco de más de un día reinicia en 1", () => expect(nextStreak(9, "2026-10-30", "2026-11-02")).toBe(1));
  it("un reloj atrasado no rompe ni reduce la racha", () => expect(nextStreak(4, "2026-11-05", "2026-11-02")).toBe(4));
});

describe("XP y multiplicadores", () => {
  it("multiplicador 1x, 1.2x desde 7 días y 1.5x desde 30", () => {
    expect([1, 6, 7, 29, 30, 99].map(streakMultiplier)).toEqual([1, 1, 1.2, 1.2, 1.5, 1.5]);
  });
  it("XP por dificultad con multiplicador", () => {
    expect(xpFor(10, 1)).toBe(10);
    expect(xpFor(25, 7)).toBe(30);
    expect(xpFor(50, 30)).toBe(75);
    expect(xpFor(10, 7)).toBe(12);
  });
});

describe("escudo y enfriamiento", () => {
  it("cada fallo resta 20 y no toca racha ni XP", () => {
    const { state, xpAwarded } = applyAttempt({ ...base, streak: 3, xp: 50 }, fail, noon("2026-11-02"));
    expect(state).toMatchObject({ shield: 80, streak: 3, xp: 50, cooldownUntil: null });
    expect(xpAwarded).toBe(0);
  });

  it("al llegar a 0 activa 2 minutos de enfriamiento", () => {
    const now = noon("2026-11-02");
    const { state } = applyAttempt({ ...base, shield: 20 }, fail, now);
    expect(state.shield).toBe(0);
    expect(state.cooldownUntil?.getTime()).toBe(now.getTime() + COOLDOWN_MS);
    expect(isInCooldown(state.cooldownUntil, now)).toBe(true);
  });

  it("el escudo nunca baja de 0", () => {
    const { state } = applyAttempt({ ...base, shield: 0, cooldownUntil: new Date(0) }, fail, noon("2026-11-02"));
    expect(state.shield).toBe(0);
  });

  it("pasada la ventana, el escudo se restaura; antes no", () => {
    const until = new Date("2026-11-02T18:02:00Z");
    const spent: GameState = { ...base, shield: 0, cooldownUntil: until };
    expect(recoverShield(spent, new Date("2026-11-02T18:01:59Z")).shield).toBe(0);
    expect(recoverShield(spent, until)).toMatchObject({ shield: 100, cooldownUntil: null });
  });

  it("escudo en 0 sin ventana registrada también se restaura", () => {
    expect(recoverShield({ ...base, shield: 0 }, new Date()).shield).toBe(100);
  });
});

describe("acierto", () => {
  it("primer acierto: suma XP, racha 1 y fija el día", () => {
    const { state, xpAwarded } = applyAttempt(base, { successful: true, baseXp: 25, firstSuccess: true }, noon("2026-11-02"));
    expect(xpAwarded).toBe(25);
    expect(state).toMatchObject({ xp: 25, streak: 1, lastActivityDay: "2026-11-02", shield: 100 });
  });

  it("el día 7 el XP ya sale con 1.2x", () => {
    const { xpAwarded, state } = applyAttempt(
      { ...base, streak: 6, lastActivityDay: "2026-11-01" },
      { successful: true, baseXp: 25, firstSuccess: true },
      noon("2026-11-02"),
    );
    expect(state.streak).toBe(7);
    expect(xpAwarded).toBe(30);
  });

  it("repetir un reto ya resuelto no da XP pero sí cuenta como actividad del día", () => {
    const { xpAwarded, state } = applyAttempt(
      { ...base, xp: 40, streak: 2, lastActivityDay: "2026-11-01" },
      { successful: true, baseXp: 25, firstSuccess: false },
      noon("2026-11-02"),
    );
    expect(xpAwarded).toBe(0);
    expect(state).toMatchObject({ xp: 40, streak: 3, lastActivityDay: "2026-11-02" });
  });

  it("un acierto no cambia el escudo", () => {
    const { state } = applyAttempt({ ...base, shield: 60 }, { successful: true, baseXp: 10, firstSuccess: true }, noon("2026-11-02"));
    expect(state.shield).toBe(60);
  });
});
