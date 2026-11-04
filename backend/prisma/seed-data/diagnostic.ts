import { phishing, type SeedChallenge } from "./types";

// Diagnóstico del piloto: los mismos 8 correos se aplican al inicio (BASELINE) y al final (POSTTEST) para
// medir el cambio en la detección de phishing. Son distintos de los 10 de la práctica, así que el
// diagnóstico inicial no se contamina con lo aprendido jugando. 6 maliciosos y 2 legítimos (falsos positivos).
const TO = "tu.nombre@dsintelligence.com";
const meta = (n: number, category: string, why: string) => ({
  title: `Diagnóstico: correo ${n}`,
  category,
  difficultyLevel: "INTERMEDIATE" as const,
  orderIndex: n,
  explanationGuide: why,
});

const items = [
  phishing(
    meta(1, "Typosquatting", "El dominio «dsintellgence.com» omite una «i»: remitente suplantado. El enlace sí apunta al dominio real."),
    { fromName: "Recursos Humanos", from: "rrhh@dsintellgence.com", to: TO, subject: "Actualiza tus datos de contacto", date: "lun 9 nov 2026 · 10:05",
      body: ["Hola,", "Estamos actualizando el directorio interno. Revisa tus datos de contacto:", { link: "Abrir directorio", href: "https://intranet.dsintelligence.com/directorio" }] },
    { indicators: ["sender_spoofing"] },
  ),
  phishing(
    meta(2, "Enlaces ocultos", "El texto del enlace muestra la intranet, pero el destino real es otro dominio. El remitente era legítimo."),
    { fromName: "Capacitación", from: "capacitacion@dsintelligence.com", to: TO, subject: "Nuevo curso disponible", date: "mar 10 nov 2026 · 09:30",
      body: ["Ya está abierto el curso de seguridad de este trimestre:", { link: "https://intranet.dsintelligence.com/cursos", href: "http://cursos-dsintelligence.acceso-seguro.example/login" }, "Tienes hasta fin de mes."] },
    { indicators: ["hidden_url"] },
  ),
  phishing(
    meta(3, "Adjuntos peligrosos", "«Orden_compra_4471.xlsx.exe» parece una hoja de cálculo, pero es un ejecutable. El remitente y el texto eran normales."),
    { fromName: "Logística del Bajío", from: "ventas@logistica-bajio.com", to: TO, subject: "Orden de compra 4471", date: "mié 11 nov 2026 · 12:15",
      body: ["Adjuntamos la orden de compra que acordamos por teléfono. Quedamos atentos."],
      attachments: [{ name: "Orden_compra_4471.xlsx.exe", size: "318 KB" }] },
    { indicators: ["dangerous_attachment"] },
  ),
  phishing(
    meta(4, "Ingeniería social", "Dirección de un dominio genérico que se hace pasar por la gerencia, con un pago urgente y plazo de horas."),
    { fromName: "Gerencia Financiera", from: "finanzas.gerencia@mail-corporativo.example", to: TO, subject: "Pago urgente antes de las 15:00", date: "jue 12 nov 2026 · 13:40",
      body: ["Necesito que autorices un pago a un proveedor nuevo antes de las 15:00 de hoy.", "No hay tiempo de pasar por el proceso normal; responde con tu confirmación."] },
    { indicators: ["sender_spoofing", "urgency_pretext"] },
  ),
  phishing(
    meta(5, "Enlaces ocultos", "Presión de tiempo («2 horas») y un enlace cuyo destino real no es el corporativo. El remitente imita bien al de soporte."),
    { fromName: "Soporte TI", from: "soporte@dsintelligence.com", to: TO, subject: "Tu buzón está lleno", date: "vie 13 nov 2026 · 08:20",
      body: ["Tu buzón alcanzó el límite. Si no liberas espacio en las próximas 2 horas, dejará de recibir correos.", { link: "https://correo.dsintelligence.com/liberar", href: "http://liberar-espacio.buzon-seguro.example/dsi" }] },
    { indicators: ["hidden_url", "urgency_pretext"] },
  ),
  phishing(
    meta(6, "Adjuntos peligrosos", "El dominio «dsintelligence.net» no es el corporativo y «.pdf.scr» es un ejecutable de pantalla disfrazado de PDF."),
    { fromName: "Tesorería", from: "pagos@dsintelligence.net", to: TO, subject: "Comprobante de pago", date: "lun 16 nov 2026 · 11:00",
      body: ["Te enviamos el comprobante del pago de este mes."],
      attachments: [{ name: "Comprobante_pago.pdf.scr", size: "540 KB" }] },
    { indicators: ["sender_spoofing", "dangerous_attachment"] },
  ),
  phishing(
    meta(7, "Manipulación de credenciales", "Correo legítimo: remitente y enlace del dominio real, sin adjuntos ni presión indebida."),
    { fromName: "Sistemas", from: "sistemas@dsintelligence.com", to: TO, subject: "Recordatorio: renueva tu contraseña esta semana", date: "mar 17 nov 2026 · 09:00",
      body: ["Como cada trimestre, te recordamos renovar tu contraseña desde el portal:", { link: "Portal de cuentas", href: "https://intranet.dsintelligence.com/cuenta/contrasena" }, "No necesitas responder este correo."] },
    { indicators: [], isLegitimate: true },
  ),
  phishing(
    meta(8, "Ingeniería social", "Correo legítimo: un colega comparte una minuta en PDF real, sin enlaces ni presión."),
    { fromName: "Mariana Ortega", from: "mariana.ortega@dsintelligence.com", to: TO, subject: "Minuta de la reunión del lunes", date: "mié 18 nov 2026 · 16:10",
      body: ["Te comparto la minuta de la reunión del lunes. Cualquier corrección me avisas."],
      attachments: [{ name: "Minuta_2026-11-16.pdf", size: "92 KB" }] },
    { indicators: [], isLegitimate: true },
  ),
];

export const diagnosticChallenges: SeedChallenge[] = items.map((c) => ({ ...c, isDiagnostic: true }));
