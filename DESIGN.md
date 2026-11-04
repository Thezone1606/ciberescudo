---
name: CiberEscudo
description: Tablero oscuro de microaprendizaje en ciberseguridad; tinta azulada, pizarra y un solo cian de acción.
colors:
  ink: "#0b0f19"
  surface: "#1e293b"
  surface-hi: "#263349"
  line: "rgb(148 163 184 / 0.18)"
  text: "#e2e8f0"
  muted: "#94a3b8"
  cyan: "#06b6d4"
  blue: "#3b82f6"
  ok: "#10b981"
  danger: "#ef4444"
  warn: "#f59e0b"
typography:
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.43
  data:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.cyan}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.cyan}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-hi}"
  tab-selected:
    backgroundColor: "{colors.cyan}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  tab-idle:
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
    height: "40px"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "48px"
  card-current-node:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "16px"
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.xl}"
    padding: "24px"
  badge-multiplier:
    textColor: "{colors.warn}"
    rounded: "{rounded.sm}"
    typography: "{typography.data}"
---

# Design System: CiberEscudo

## Overview

**Creative North Star: "El Tablero de Guardia"**

Una consola de trabajo, no una pantalla de juego. La tinta casi negra azulada es el suelo, la pizarra sube un escalón para agrupar, y un único cian marca lo que pide acción. El tono es profesional con motivación sutil: el estado del colaborador (escudo, racha, XP, rango) se lee de un vistazo en la barra superior, y el camino de retos deja al siguiente como lo único resaltado. El mundo lo fijó el usuario en la especificación de Semana 1-4; la build lo sigue con fidelidad.

La densidad es media y calmada: una columna de lectura con un panel lateral de 20rem en escritorio, una sola columna con navegación inferior en móvil. La profundidad se logra con capas tonales y anillos de 1 px, no con sombras. Los números van en tabulares y los datos en JetBrains Mono.

El "nombre CiberEscudo" y los umbrales de rango son provisionales; no son parte del sistema visual.

**Key Characteristics:**
- Un solo color de acción (cian); verde solo para lo completado; rojo y ámbar solo cuando un estado lo exige.
- Superficies planas de pizarra con anillo translúcido de 1 px; sin degradados ni vidrio.
- Esquinas de 8 px como norma; círculos para nodos.
- Íconos de trazo único (lucide) y un escudo de 5 capas concéntricas como firma.
- Movimiento solo en transform y opacity, con reducción de movimiento respetada.

## Colors

Paleta fría y contenida: tinta azul-negra, pizarra, y acentos semánticos que casi nunca aparecen juntos.

### Primary
- **Cian de Acción** (#06b6d4): botones primarios, pestaña seleccionada, nodo actual, barras de progreso, foco, cursor de texto, enlaces, marca. Es el único color que significa "pulsa aquí".

### Secondary
- **Azul de Energía** (#3b82f6): reservado al ícono de XP en la barra de estado.

### Tertiary (estados)
- **Verde Mitigado** (#10b981): reto completado (marcador, conector, aviso de ruta terminada).
- **Rojo Vulnerabilidad** (#ef4444): escudo en 1 capa o menos, errores, capa que se rompe, escudo agotado.
- **Ámbar Alerta** (#f59e0b): escudo en 2 capas, cuenta regresiva, y racha activa (llama y multiplicador).

### Neutral
- **Tinta Nocturna** (#0b0f19): fondo de página, barra superior, texto sobre cian.
- **Pizarra** (#1e293b): superficies: tarjeta del reto actual, campos, selector de ruta, diálogo.
- **Pizarra Alta** (#263349): hover de botones secundarios.
- **Texto Hielo** (#e2e8f0): texto principal.
- **Gris Pizarra** (#94a3b8): texto secundario, metadatos, íconos inactivos.
- **Línea Translúcida** (rgb(148 163 184 / 0.18)): bordes de 1 px, divisores, conector de nodos pendientes.

### Named Rules
**The One Action Rule.** El cian es la única señal de acción. Si dos elementos de una pantalla compiten con cian de relleno, uno sobra.

**The State-Only Color Rule.** Verde, rojo y ámbar aparecen solo cuando un estado los exige; nunca como decoración ni como segundo acento.

## Typography

**Display Font:** Inter (con system-ui, sans-serif)
**Body Font:** Inter
**Label/Mono Font:** JetBrains Mono (con ui-monospace), solo para datos: XP, días, posiciones, relojes, código.

**Character:** Inter neutra y legible para la interfaz; la mono marca "esto es un dato". Números tabulares en todo el cuerpo.

### Hierarchy
- **Headline** (600, 1.5rem, ~1.33): título de pantalla ("Tus retos"). Login usa la misma talla.
- **Title** (600, 1rem): paneles laterales ("Departamentos", rango actual); títulos de nodo usan 500. El diálogo sube a 1.25rem/600.
- **Body** (400, 1rem, 1.5): descripciones bajo el título, en gris pizarra.
- **Label** (500, 0.875rem): pestañas, encabezados de tabla, etiquetas de campo, texto de botones (600).
- **Data** (400, 0.875rem, mono): XP, racha, `{done}` de `{total}`, posiciones.

### Named Rules
**The Mono-Means-Data Rule.** JetBrains Mono solo para cifras, relojes y código. Nunca para títulos ni párrafos.

## Layout

Contenedor centrado de máximo 6xl (72rem) con 16 px de margen lateral. El hub es una rejilla de dos columnas en lg: contenido fluido y panel de progreso fijo de 20rem, con 40 px entre ellas. Bajo lg es una columna y la navegación pasa a una barra inferior fija de dos pestañas (mín. 56 px de alto, respeta el área segura); la barra superior se mantiene fija con marca, estado y menú. Ritmo vertical en escala de 4 px: 8/16/24/32; secciones separadas por 32 px, nodos por 24 px (16 px en completados). Clasificación es una tabla de ancho máximo 3xl con desplazamiento horizontal bajo 34rem. El login es una sola columna de 24rem centrada. Objetivos táctiles de al menos 40-48 px.

## Elevation & Depth

Sistema plano y tonal. La jerarquía se construye con el escalón fondo, pizarra y pizarra alta, y con anillos de 1 px (línea translúcida; cian al 40 % para el nodo actual; verde o rojo al 40-60 % para estado). La única sombra es la del diálogo modal (`shadow-2xl` en negro al 60 %), sobre un telón de tinta al 80 %. El pulso del nodo actual (anillo cian que escala a 1.7 y se desvanece en 2.2 s) es la única animación continua.

### Named Rules
**The Flat-By-Default Rule.** Las superficies en reposo no llevan sombra. Solo lo que flota sobre la página (el diálogo) la usa.

## Shapes

Esquinas de 8 px para botones, campos, tarjetas y paneles; 6 px para pestañas internas y el anillo de foco; 12 px para el diálogo; 4 px para insignias; círculo completo para nodos y barras de progreso. Bordes siempre de 1 px translúcido (anillo), salvo el conector del camino (2 px). Marca: cuadrado cian de 36 px con escudo en tinta.

## Components

### Buttons
- **Shape:** esquinas de 8 px (rounded-lg), alto mínimo 44 px (48 px en login).
- **Primary:** relleno cian (#06b6d4), texto tinta, 600, 20 px de padding horizontal; "Iniciar reto" lleva flecha.
- **Hover / Focus / Active:** el primario baja a cian al 90 %; presionado escala 0.97 en 150 ms; foco con contorno cian de 2 px y desfase de 2 px; deshabilitado al 40-60 % de opacidad.
- **Secondary:** pizarra con anillo de línea, texto normal; hover a pizarra alta.

### Tabs (selector de ruta)
- Contenedor pizarra con anillo, 4 px de relleno interno, radio 8 px. Pestaña seleccionada en cian con texto tinta; inactiva en gris pizarra con hover a texto. Mín. 40 px, flechas izquierda/derecha navegan.

### Cards / Containers
- Solo el reto actual es tarjeta: pizarra, 8 px, 16 px de padding, anillo cian al 40 %. Lo demás es contenido sin caja sobre el fondo. No anidar tarjetas.

### Inputs / Fields
- Pizarra, 8 px, 48 px de alto, anillo de línea; en foco el anillo pasa a cian de 2 px. Etiqueta visible encima (14 px, 500). Error en rojo bajo el campo con `role="alert"`.

### Navigation
- Superior: marca a la izquierda, enlaces de 14 px en gris, el activo sobre pizarra con texto normal (solo lg+). Inferior en móvil: ícono y etiqueta de 12 px, activo en cian.

### Camino de retos (firma)
- Lista ordenada vertical con conector de 2 px. Nodo de 40 px: completado (verde al 15 % con anillo verde y palomita; título subrayado como enlace a repasar), actual (relleno cian, ícono de play, anillo pulsante) y bloqueado (pizarra, candado, título en gris).

### Escudo (firma)
- Cinco copias concéntricas del escudo de lucide (escalas 1, .78, .58, .39, .21), trazo de 1.25 px, de 36 px (40 px en sm+) y marcador numérico `n/5` en mono. Capas encendidas en cian (ámbar a 2, rojo a 1 o menos); apagadas en gris con trazo tenue. La capa que se pierde se rompe: escala 1.25, giro de -6°, rojo, 0.7 s.

### Barra de estado
- Escudo, llama de racha (ámbar con relleno al 28 %, insignia ×N en mono), rayo de XP (azul) con rango en gris. Íconos de 18 px.

### Diálogo de espera
- `dialog` nativo, pizarra, 12 px, 24 px de padding, ícono de alerta roja de 28 px, reloj en mono ámbar.

## Do's and Don'ts

### Do:
- **Do** usar cian (#06b6d4) solo para la acción primaria, la selección y el progreso.
- **Do** usar esquinas de 8 px y anillos de 1 px translúcidos para toda superficie.
- **Do** poner cifras en JetBrains Mono con números tabulares.
- **Do** mantener íconos de trazo único de lucide, de 16-20 px, con `aria-hidden` cuando acompañan texto.
- **Do** animar solo transform y opacity, con la curva ease-out (0.23, 1, 0.32, 1), y respetar `prefers-reduced-motion`.
- **Do** dar a todo control interactivo al menos 40 px de alto y foco visible cian.

### Don't:
- **Don't** usar degradados, vidrio o desenfoque de fondo.
- **Don't** convertir el hub en una rejilla de tarjetas iguales con ícono, ni en una métrica gigante.
- **Don't** usar verde, rojo o ámbar como decoración o segundo acento.
- **Don't** poner sombra a superficies en reposo.
- **Don't** usar JetBrains Mono para títulos o párrafos.
