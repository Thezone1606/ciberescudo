---
version: 1
slug: "frontend-app-app-page-tsx"
primary_target: "frontend/app/(app)/page.tsx"
related_targets: []
---

# Hub de módulos (Operate)

Scope: pantalla principal de la plataforma tras iniciar sesión, más login y clasificación por departamento. Modo Operate: el colaborador entra a hacer un reto de 3 a 5 minutos y debe saber en segundos cuál es el siguiente y cómo va su escudo, racha y XP.

Audiencia y tarea: personal de DS Intelligence (60 % no técnico, 40 % técnico). Tarea: elegir ruta, abrir el reto disponible, ver estado de gamificación. Frecuencia: diaria. Restricciones: WCAG 2.1 AA, 360 a 1920 px, español de México, datos sintéticos.

Mundo visual fijado por el usuario (no hubo sorteo de direcciones): especificación de Semana 1-4. Fondo #0B0F19, superficies #1E293B, cian #06B6D4, azul #3B82F6, verde #10B981 (mitigado), rojo #EF4444 (vulnerabilidad), ámbar #F59E0B (alerta). Inter para interfaz, JetBrains Mono solo para datos y consola. Tono profesional con motivación sutil.

## Direction contract

THESIS: el hub es un tablero de trabajo, no una pantalla de juego: un camino vertical de retos donde el siguiente reto es lo único que pide acción. Rechaza la rejilla de tarjetas iguales con ícono y la plantilla de métrica gigante.

OWN-WORLD: tinta casi negra azulada con superficies de pizarra, cian como único color de acción, verde solo para lo completado, rojo y ámbar solo cuando un estado lo exige. Íconos de trazo único (lucide), números tabulares, esquinas de 8 px, bordes de 1 px translúcidos, sin degradados ni vidrio.

STORY: el colaborador entiende en un vistazo su estado (escudo de 5 capas, días de racha, XP y rango), ve qué reto sigue y cuánto dura, cree que cada acierto suma, y pulsa Iniciar.

FIRST VIEWPORT: barra superior fija con marca, navegación (Retos, Clasificación), escudo de 5 capas, racha, XP con rango y menú de usuario. Debajo, a la izquierda, selector de ruta segmentado y el camino de nodos con el reto actual resaltado y su botón cian primario; a la derecha, progreso hacia el siguiente rango y la posición de su departamento. En móvil: una columna, estado compacto arriba y navegación inferior.

FORM: control estándar de la web (pestañas segmentadas, lista ordenada, tabla); la firma es la capa de escudo que se rompe con una animación breve cuando baja el escudo y el pulso del nodo actual. Posición en la lista: dirección fijada por el usuario. seed:89c828751647b9ce (tirada hecha solo para registrar la referencia; la dirección la fijó el usuario y prevalece sobre la asignada)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
