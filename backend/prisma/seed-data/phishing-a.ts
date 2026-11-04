import { phishing } from "./types";

const TO = "tu.nombre@dsintelligence.com";

export const phishingA = [
  phishing(
    { title: "Un acceso que vence hoy", category: "Typosquatting", difficultyLevel: "BASIC", orderIndex: 1,
      explanationGuide: "El remitente usa «dsintelIigence.com» con una I mayúscula en lugar de la l minúscula: es typosquatting. Además presiona con «vence hoy». El enlace sí apunta al dominio real, así que no era una señal." },
    { fromName: "Soporte TI", from: "soporte@dsintelIigence.com", to: TO, subject: "Tu acceso vence hoy", date: "lun 2 nov 2026 · 09:14",
      body: ["Hola,", "Tu contraseña de la red corporativa vence hoy a las 18:00. Si no la renuevas, tu cuenta se bloqueará.", { link: "Renovar contraseña", href: "https://intranet.dsintelligence.com/cuenta/contrasena" }, "Gracias,", "Equipo de Soporte"] },
    { indicators: ["sender_spoofing", "urgency_pretext"] },
  ),
  phishing(
    { title: "El enlace que no dice lo que es", category: "Enlaces ocultos", difficultyLevel: "BASIC", orderIndex: 3,
      explanationGuide: "El texto del enlace muestra la intranet, pero el destino real es otro dominio. El remitente sí es legítimo; el engaño está en el hipervínculo camuflado." },
    { fromName: "Nómina", from: "nomina@dsintelligence.com", to: TO, subject: "Consulta tu recibo de nómina", date: "mar 3 nov 2026 · 08:02",
      body: ["Buen día,", "Ya está disponible tu recibo de la quincena. Puedes consultarlo en el portal de nómina:", { link: "https://intranet.dsintelligence.com/nomina", href: "http://nomina-dsintelligence.verificar-cuenta.example/acceso" }, "Saludos."] },
    { indicators: ["hidden_url"] },
  ),
  phishing(
    { title: "Factura con doble extensión", category: "Adjuntos peligrosos", difficultyLevel: "BASIC", orderIndex: 4,
      explanationGuide: "«Factura_octubre.pdf.exe» parece un PDF, pero la extensión real es .exe: un ejecutable. Muchos sistemas ocultan la última extensión. El remitente y el texto eran normales." },
    { fromName: "Logística del Bajío", from: "facturacion@logistica-bajio.com", to: TO, subject: "Factura de octubre", date: "mié 4 nov 2026 · 11:40",
      body: ["Estimado cliente,", "Adjuntamos la factura correspondiente a octubre. Quedamos atentos a tus comentarios."],
      attachments: [{ name: "Factura_octubre.pdf.exe", size: "214 KB" }] },
    { indicators: ["dangerous_attachment"] },
  ),
  phishing(
    { title: "Transferencia urgente del director", category: "Ingeniería social", difficultyLevel: "BASIC", orderIndex: 6,
      explanationGuide: "El nombre dice «Dirección General», pero la dirección es de un servicio de correo gratuito. Pide una transferencia urgente y en secreto: urgencia financiera clásica del fraude del director." },
    { fromName: "Dirección General", from: "direccion.general.ds@correo-gratis.example", to: TO, subject: "Transferencia urgente, confidencial", date: "jue 5 nov 2026 · 16:55",
      body: ["Necesito que hagas una transferencia hoy mismo a un proveedor nuevo. Es confidencial, no lo comentes con nadie.", "Responde a este correo en cuanto estés disponible y te paso los datos bancarios."] },
    { indicators: ["sender_spoofing", "urgency_pretext"] },
  ),
  phishing(
    { title: "Encuesta de clima laboral", category: "Typosquatting", difficultyLevel: "INTERMEDIATE", orderIndex: 7,
      explanationGuide: "La dirección «dsintelligenc3.com» cambia la e final por un 3. El enlace y el adjunto eran normales: aquí solo había una señal, y marcar de más también es un error." },
    { fromName: "Recursos Humanos", from: "rrhh@dsintelligenc3.com", to: TO, subject: "Encuesta de clima laboral 2026", date: "vie 6 nov 2026 · 10:20",
      body: ["Hola,", "Queremos conocer tu opinión. La encuesta toma menos de cinco minutos:", { link: "Responder encuesta", href: "https://intranet.dsintelligence.com/rrhh/encuesta" }],
      attachments: [{ name: "Instrucciones_encuesta.pdf", size: "88 KB" }] },
    { indicators: ["sender_spoofing"] },
  ),
];
