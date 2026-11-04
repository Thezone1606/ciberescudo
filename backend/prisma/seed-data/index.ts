import { phishingA } from "./phishing-a";
import { phishingB } from "./phishing-b";
import { quickChallenges } from "./quick";
import { technicalChallenges } from "./technical";
import type { SeedChallenge } from "./types";

// Los 20 retos del MVP: 10 de phishing + 5 de decisión rápida (ruta corporativa) y
// 2 de cadena de custodia + 3 de terminal (ruta técnica). Todo el contenido es sintético.
export const mvpChallenges: SeedChallenge[] = [...phishingA, ...phishingB, ...quickChallenges, ...technicalChallenges];
