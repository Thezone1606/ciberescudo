import { phishing } from "./types";

const TO = "tu.nombre@dsintelligence.com";

export const phishingB = [
  phishing(
    { title: "Un documento compartido", category: "Enlaces ocultos", difficultyLevel: "INTERMEDIATE", orderIndex: 9,
      explanationGuide: "Los enlaces acortados ocultan el destino real. El remitente era legítimo, pero un colega que de verdad comparte un archivo suele usar la plataforma corporativa, no un acortador desconocido." },
    { fromName: "Mariana Ortega", from: "mariana.ortega@dsintelligence.com", to: TO, subject: "Te compartí el reporte", date: "lun 9 nov 2026 · 13:05",
      body: ["Hola, te comparto el reporte que me pediste. Ábrelo desde aquí:", { link: "Ver documento compartido", href: "https://acortar.example/x9Qk3" }, "Cualquier duda me avisas."] },
    { indicators: ["hidden_url"] },
  ),
  phishing(
    { title: "Directiva de pagos", category: "Adjuntos peligrosos", difficultyLevel: "INTERMEDIATE", orderIndex: 10,
      explanationGuide: "El dominio «dsintelligence.co» imita al real (termina en .co, no .com), y «.pdf.iso» es una imagen de disco que puede contener ejecutables: dos señales juntas." },
    { fromName: "Tesorería", from: "pagos@dsintelligence.co", to: TO, subject: "Nueva directiva de pagos", date: "mar 10 nov 2026 · 09:48",
      body: ["Revisa la nueva directiva de pagos antes del cierre de mes. El documento está adjunto."],
      attachments: [{ name: "Directiva_pagos.pdf.iso", size: "1.8 MB" }] },
    { indicators: ["sender_spoofing", "dangerous_attachment"] },
  ),
  phishing(
    { title: "Mantenimiento programado", category: "Ingeniería social", difficultyLevel: "INTERMEDIATE", orderIndex: 12,
      explanationGuide: "Este correo era legítimo: remitente y enlace del dominio real, sin adjuntos y sin presión indebida. Saber reconocer un mensaje legítimo evita reportes falsos y fatiga de alertas." },
    { fromName: "Sistemas", from: "sistemas@dsintelligence.com", to: TO, subject: "Mantenimiento programado el sábado", date: "mié 11 nov 2026 · 15:30",
      body: ["Equipo,", "El sábado de 22:00 a 23:00 haremos mantenimiento en el correo. Puede haber intermitencias.", { link: "Calendario de mantenimientos", href: "https://intranet.dsintelligence.com/sistemas/calendario" }, "Gracias por tu comprensión."] },
    { indicators: [], isLegitimate: true },
  ),
  phishing(
    { title: "Cuenta suspendida en 24 horas", category: "Typosquatting", difficultyLevel: "ADVANCED", orderIndex: 13,
      explanationGuide: "Tres señales: el dominio «dsintelligence-soporte.com» no es el corporativo, el enlace usa el dominio real solo como subdominio de otro («...com.verifica-acceso.example») y el mensaje amenaza con suspender la cuenta en 24 horas." },
    { fromName: "Seguridad de la Información", from: "seguridad@dsintelligence-soporte.com", to: TO, subject: "Actividad inusual: tu cuenta será suspendida", date: "jue 12 nov 2026 · 07:12",
      body: ["Detectamos un inicio de sesión inusual en tu cuenta. Si no confirmas tu identidad en las próximas 24 horas, será suspendida.", { link: "https://sso.dsintelligence.com/verificar", href: "https://sso.dsintelligence.com.verifica-acceso.example/login" }] },
    { indicators: ["sender_spoofing", "hidden_url", "urgency_pretext"] },
  ),
  phishing(
    { title: "Aviso de embargo", category: "Ingeniería social", difficultyLevel: "ADVANCED", orderIndex: 15,
      explanationGuide: "Reúne las cuatro señales: dominio parecido (d-sintelligence.com), presión legal con plazo de horas, un enlace que lleva a otro sitio y un adjunto .pdf.iso. Ante un aviso así, valida por otro canal antes de abrir nada." },
    { fromName: "Departamento Legal", from: "legal@d-sintelligence.com", to: TO, subject: "Aviso de embargo: responde en 3 horas", date: "vie 13 nov 2026 · 12:01",
      body: ["Se ha iniciado un procedimiento de embargo contra la empresa. Debes revisar el expediente y responder en un plazo máximo de 3 horas.", { link: "Descargar expediente", href: "http://expediente-legal.descargas.example/dsi/3482" }],
      attachments: [{ name: "Expediente_3482.pdf.iso", size: "2.4 MB" }] },
    { indicators: ["sender_spoofing", "urgency_pretext", "hidden_url", "dangerous_attachment"] },
  ),
];
