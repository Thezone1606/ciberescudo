import { XP, type SeedChallenge } from "./types";

type Level = "BASIC" | "INTERMEDIATE" | "ADVANCED";

function quick(
  meta: { title: string; category: string; difficultyLevel: Level; orderIndex: number; explanationGuide: string },
  scenario: string,
  question: string,
  options: string[],
  correct: number,
): SeedChallenge {
  const ids = options.map((_, i) => String.fromCharCode(97 + i));
  return {
    ...meta,
    track: "AWARENESS",
    baseXp: XP[meta.difficultyLevel],
    payloadConfig: { type: "quick", scenario, question, options: options.map((text, i) => ({ id: ids[i], text })) },
    solution: { correct: ids[correct] },
  };
}

export const quickChallenges = [
  quick(
    { title: "Una memoria USB en el estacionamiento", category: "Ingeniería social", difficultyLevel: "BASIC", orderIndex: 2,
      explanationGuide: "Una USB abandonada es un vector clásico: puede ejecutar código al conectarla. No la conectes ni para «ver de quién es»; entrégala al equipo de seguridad." },
    "Al llegar a la oficina encuentras una memoria USB con la etiqueta «Nómina 2026» junto a tu auto.",
    "¿Qué haces?",
    ["La conecto a mi equipo para ver de quién es y devolverla.", "Se la entrego al equipo de seguridad sin conectarla.", "La conecto a una computadora vieja que no uso.", "La dejo donde estaba para que la recoja su dueño."], 1,
  ),
  quick(
    { title: "El soporte técnico que te llama", category: "Ingeniería social", difficultyLevel: "BASIC", orderIndex: 5,
      explanationGuide: "Es pretexting: alguien finge ser de soporte para ganar tu confianza. TI no te pedirá instalar herramientas de control remoto por una llamada inesperada. Cuelga y reporta por el canal oficial." },
    "Recibes una llamada de alguien que dice ser de «soporte de TI». Te pide instalar un programa de acceso remoto para «arreglar un virus» en tu equipo.",
    "¿Cuál es la mejor respuesta?",
    ["Instalo el programa, porque suena urgente.", "Le doy mi usuario para que lo revise desde su lado.", "Cuelgo y reporto la llamada por el canal oficial de TI.", "Le pido su nombre y, si me lo da, continúo."], 2,
  ),
  quick(
    { title: "Una clave pegada en el chat", category: "Manipulación de credenciales", difficultyLevel: "INTERMEDIATE", orderIndex: 8,
      explanationGuide: "Las credenciales nunca deben circular por chats ni repositorios, aunque sea un canal interno. Si ya se expuso, hay que avisar para que la rotación sea inmediata." },
    "Un compañero te pide la clave del servidor de pruebas por el chat del equipo, porque «la necesita ya». Tú la tienes guardada en un archivo de notas.",
    "¿Qué haces?",
    ["Se la pego en el chat para no demorarlo.", "Se la envío por mensaje directo, que es más privado.", "No la comparto por chat: uso el gestor de secretos del equipo y reporto si hubo exposición.", "Subo el archivo de notas al repositorio compartido."], 2,
  ),
  quick(
    { title: "Un aviso de verificación que no pediste", category: "Manipulación de credenciales", difficultyLevel: "INTERMEDIATE", orderIndex: 11,
      explanationGuide: "Si no iniciaste sesión y te llega una solicitud de verificación (MFA), alguien más tiene tu contraseña. Rechaza la solicitud y reporta: aprobar «para que deje de sonar» le da acceso al atacante." },
    "Tu teléfono vibra: llega una solicitud para aprobar un inicio de sesión en tu cuenta. Tú no estás iniciando sesión en nada.",
    "¿Qué haces?",
    ["Apruebo, para que deje de llegar.", "Ignoro el aviso y sigo trabajando.", "Rechazo la solicitud y reporto el intento al equipo de seguridad.", "Apruebo y después cambio mi contraseña."], 2,
  ),
  quick(
    { title: "Una lista de clientes en el canal equivocado", category: "Ingeniería social", difficultyLevel: "ADVANCED", orderIndex: 14,
      explanationGuide: "Lo primero es reducir la exposición (borrar el mensaje) y avisar de inmediato: el equipo de seguridad decide si hay que notificar a los clientes o contener el incidente. Esconder el error lo agrava." },
    "Por error publicas una hoja de cálculo con datos de clientes en un canal abierto a toda la empresa y a colaboradores externos.",
    "¿Cuál es la acción correcta?",
    ["Espero a ver si alguien lo nota antes de actuar.", "Borro el mensaje y notifico de inmediato al equipo de seguridad.", "Borro el mensaje y no digo nada, para no alarmar.", "Pido a quienes lo vieron que lo ignoren."], 1,
  ),
];
