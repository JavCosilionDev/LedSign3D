# LEDSign3D — Plan v0.1

Versión 0.1 · App web cliente-side · Open Source (MIT)
Aplicación que convierte un SVG monocromático en modelos 3D (STL) listos para
impresión 3D, para construir letreros LED tipo "letra canal" (base + tapa +
panel difusor) con encastres tipo click.

---

## 1. Propósito y problema que resuelve

Crear, a partir de un archivo SVG (de un solo color), una serie de modelos 3D
listos para imprimir por cada pieza del SVG. Las piezas se ensamblan entre sí
con encastres tipo "click" y permiten colocar una tira LED dentro de la base.
El frente iluminado es un panel difusor (transparente).

## 2. Alcance v0.1

- Importación de SVG (solo contornos/shapes de un color; SIN editor de texto).
- Generación de 3 piezas por cada contorno cerrado del SVG: base, tapa y panel
  difusor.
- Ajuste de parámetros (12 parámetros con valores por defecto).
- Vista 3D en tiempo real (rotación/zoom) con aceleración por hardware.
- Vista previa 2D del SVG importado en el menú lateral.
- Exportación SOLO de STL (binario/ASCII) de todas las piezas, organizadas en
  subcarpetas dentro de un ZIP.
- 100% cliente-side: sin servidor, sin persistencia, sin envío de datos.
- Sin DXF / corte láser en v0.1 (pospuesto a desarrollo futuro).

### Fuera de alcance v0.1

- Editor de texto tipográfico (fuentes, tamaños).
- Exportación DXF / corte láser.
- Persistencia en servidor o bases de datos.
- Impresión de prueba física (validación manual posterior).

## 3. Terminología unificada

- **Panel difusor**: única pieza superior transparente (antes llamada
  "frente"/"acrílico"). Se usa este único nombre en toda la app, código, UI,
  exportación y documentación.
- `Part.type = 'base' | 'tapa' | 'panel-difusor'`.

## 4. Parámetros del modelo (menú lateral)

Grupo "Configurar modelo". **Los 12 parámetros son EDITABLES por el usuario**
en el menú lateral (sliders/inputs numéricos); la siguiente tabla muestra los
valores por DEFECTO con los que arranca la app (mm):

| Grupo              | Parámetro                               | Default |
| ------------------ | --------------------------------------- | ------- |
| Panel difusor      | Espesor de panel difusor                | 3 mm    |
| Panel difusor      | Tolerancia de panel difusor             | 0.2 mm  |
| Tapa               | Espesor de la pared de la tapa          | 1.5 mm  |
| Tapa               | Altura de la pared de la tapa           | 40 mm   |
| Tapa               | Profundidad del labio de la tapa        | 4 mm    |
| Tapa               | Espesor del labio de la tapa            | 2 mm    |
| Base               | Espesor del suelo base                  | 1.5 mm  |
| Base               | Espesor de la pared exterior de la base | 1.5 mm  |
| Base               | Altura de la pared exterior de la base  | 3 mm    |
| Base               | Espesor de la pared interior de la base | 1.5 mm  |
| Base               | Altura de la pared interior de la base  | 30 mm   |
| Tolerancia General | Holgura                                 | 0.5 mm  |

`ProjectSettings` usa unidades en mm, tipado estricto, validación de rangos
(rangos mín./máx. por parámetro) y un valor `default` para reset/restablecer.
Cada cambio dispara la regeneración del modelo (debounced, ver §7).

## 5. Modelo geométrico del ensamblaje (letra canal)

Por cada contorno cerrado del SVG se genera un ensamblaje independiente
(base + tapa + panel difusor). Corte transversal vertical, visto desde un
costado (se muestra una pared; la otra se refleja simétricamente):

```
  DIFUSOR (cian) ┌────────────────────────────────┐  <- placa superior (3 mm),
                 │◉                                │     apoyada en el rebaje
        Tapa->│  └─┬──────────────────────────────┬┘
   (retén)   │    │  (rebaje/labio superior)      │
  ┌──────────┴────┤                              │
  │    TAPA       │                              │  <- pared lateral alta (40 mm)
  │  (verde)      │                              │     de la tapa
  │               │  ┌────────┐                  │
  │               │  │<-Base  │  (muro interior) │
  │               │  │ (gris) │  30 mm           │
  │   encastre/    │  │        │                  │
  │   click 2     │  │        │   [LED cavity]   │
  │               │  └────────┘                  │
  └──────┬────────┘        Base floor (gris)     │
         └───────────────────────────────────────┘
        Base-> (◉)                              <-Base (◉)
```

> **Modo de organización del diagrama:** leyenda de colores — **Tapa** = verde
> oscuro · **Difusor** = cian brillante · **Base** = gris. Marcadores: ● naranja
> (Tapa), ● cian (Difusor), ● azul (Base). Etiquetas orientadas con la flecha
> hacia la pieza que señalan (difusor arriba del todo, tapa como pared lateral,
> base como muro interior + suelo, cavidad LED a la derecha del muro gris).

### Relaciones de offset (C = contorno SVG, con agujeros por evenodd)

- **Panel difusor:** extrusión plana de C (incluyendo agujeros), espesor =
  espesor del panel difusor, contorno ajustado por tolerancia de panel difusor
  para entrar al rebaje (labio superior) de la tapa con click.
- **Tapa:** cáscara entre C (exterior) y C inset por espesor de pared, altura =
  altura de pared; rebaje superior con profundidad = espesor del panel difusor
  (labio superior que retiene el difusor).
- **Base:** suelo (espesor del suelo) + **muro interior** (pared interior de la
  base, gris) de altura configurable; la pared exterior de la base (corta)
  queda fuera del corte mostrado. El muro interior forma la cavidad interior
  para LEDs, con suelo cerrado por debajo.

### Dos encastres tipo "click" (auto-cálculo paramétrico)

1. **Panel difusor → tapa:** el difusor se apoya y encastra en el rebaje/labio
   superior de la tapa, regido por `tolerancia de panel difusor` (0.2 mm).
2. **Tapa → base:** la pared verde de la tapa se desliza junto al muro gris de
   la base (pared interior), con la **ranura/holgura** entre ambos (click 2),
   regido por `holgura` (0.5 mm). El suelo gris cierra por abajo. Extraíble para
   mantenimiento.

> Los valores exactos de interferencia requieren validación empírica con
> impresión 3D real (riesgo principal). Se añadirá un parámetro de interferencia
> pequeño configurable derivado de las tolerancias.

## 6. Agujeros internos (soporte completo)

- Fill-rule evenodd: contornos exterior + interior.
- Un agujero (ej. letra "O") genera cavidad interior en base/tapa y agujero en
  el panel difusor.

## 7. Precisión y rendimiento

- Tolerancia dimensional máxima: ±0.1 mm (segmentación adaptativa de curvas).
- Procesamiento de hasta 100 contornos en < 2 s en hardware objetivo
  (RTX 4060, i5 8400, 20 GB RAM).
- UI responde a cambios de parámetros en < 500 ms.
- Geometría pesada en Web Worker (no bloquea la UI); debounce de sliders
  (≈250 ms); caché de geometría por pieza; preview en baja resolución y
  exportación en resolución completa; dynamic imports / lazy loading.

## 8. Múltiples contornos

- Cada contorno cerrado genera su PROPIO ensamblaje independiente
  (base + tapa + panel difusor). No se fusionan entre sí.

## 9. Exportación

- STL binario (por defecto) y ASCII (opcional), una pieza por archivo.
- ZIP con subcarpetas por tipo de pieza:
  - `base/{nombre_contorno}.stl`
  - `tapa/{nombre_contorno}.stl`
  - `panel-difusor/{nombre_contorno}.stl`
- Verificación de mallas cerradas (watertight) antes de exportar.

## 10. Stack tecnológico

| Componente                      | Elección                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------- |
| Lenguaje / Build                | TypeScript (estricto) + Vite                                                  |
| UI                              | React 18 + Zustand (estado global)                                            |
| 3D                              | Three.js + OrbitControls (WebGL2; WebGPU si estable)                          |
| Geometría (extrusión/booleanos) | manifold-3d (WASM)                                                            |
| Offset 2D                       | cavalierContours (v0.1); migrable a Clipper2-WASM en v1.0+ vía IOffsetService |
| SVG                             | DOMParser + DOMPurify (sanitización) + muestreo propio de Bézier              |
| Exportación                     | three STLExporter + JSZip                                                     |
| Testing                         | Vitest + @testing-library/react + Playwright (e2e)                            |
| Calidad                         | ESLint + Prettier + Husky/lint-staged                                         |
| Licencia                        | MIT                                                                           |

## 11. Arquitectura de software

Monolito modular en capas, 100% cliente-side. El dominio y la aplicación NO
importan Three.js ni DOM → motor de geometría testeable en Node.

```
src/
├── domain/                # Entidades, value-objects, puertos (interfaces)
│   ├── entities/          # Project, Contour, Part, Assembly
│   ├── value-objects/     # ProjectSettings, BoundingBox, Point2D
│   └── ports/             # IGeometryEngine, IOffsetService, IMeshExporter, ISvgParser
├── application/use-cases/ # GenerateModelFromSvg, ExportStlZip
├── infrastructure/
│   ├── svg-parser/        # SvgParser (DOM), sanitización, flatten de paths
│   ├── geometry/          # ManifoldEngine, offset service, builders de piezas
│   ├── exporters/         # StlExporter, ZipExporter
│   └── workers/           # geometry.worker.ts (postMessage + transferables)
├── ui/
│   ├── components/        # Sidebar, ParameterPanel, SvgPreview2D, FileDrop
│   ├── state/             # Stores Zustand (proyecto, settings, ui)
│   └── three-viewer/      # Viewer, escena, OrbitControls, sync de mallas
└── main.tsx
```

### Modelo de datos

`SVGDocument → Contour[] → Assembly[] → Part[]`

- `Contour`: camino cerrado 2D con orientación, agujeros y bounding box.
- `Assembly`: base + tapa + panel difusor de un contorno.
- `Part`: `{ type, mesh (BufferGeometry), contourId, metadata }`.

## 12. Seguridad

- Sanitización del SVG con DOMPurify: eliminar `<script>`, atributos `on*`,
  `foreignObject`, `image`, y referencias externas.
- Sin carga de recursos externos (imágenes, fuentes).
- Límite de tamaño de archivo: 10 MB + validación de SVG válido.
- Sin secretos, sin autenticación; no aplica GDPR/CCPA.

## 13. Estrategia de testing

- **Unit (Vitest):** parsing SVG, offset sin autointersecciones, dimensiones por
  parámetro, tolerancias/holguras, exportadores STL.
- **Integration:** flujo SVG → contornos → piezas → mallas → ZIP; mallas
  watertight (verificación por volumen).
- **E2E (Playwright):** cargar SVG, mover sliders, rotar vista 3D, exportar ZIP
  y verificar contenido/estructura.
- TDD para lógica de geometría. Cobertura: ≥80% en dominio/aplicación; ≥60%
  global.

## 14. Fases de desarrollo

| Fase | Objetivo                                                                                                                                  | Entregable                       |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 0    | Prototipar Manifold (extrusión con agujeros) y Clipper (offset en curvas difíciles); ADR de librerías; definir empaquetado WASM en worker | Repositorio con prototipo + ADRs |
| 1    | Scaffold Vite + React + TS, ESLint/Prettier/Vitest, capas, Zustand, componentes base                                                      | Proyecto base corriendo          |
| 2    | Motor de geometría: parser SVG, offset, builders de base/tapa/panel difusor + tests                                                       | Módulo geometry-engine testeable |
| 3    | Visor 3D: escena Three.js, OrbitControls, worker, sync de mallas                                                                          | Visor 3D funcional (>30 FPS)     |
| 4    | UI + exportación: panel de parámetros, STL + ZIP, feedback                                                                                | App usable de punta a punta      |
| 5    | Hardening: e2e Playwright, rendimiento, corrección geométrica                                                                             | Candidato a release              |
| 6    | Docs + lanzamiento: README, ADRs, LICENSE MIT, release v0.1                                                                               | Repositorio público v0.1         |

## 15. Criterios de éxito

- Un SVG de prueba (corazón o letra) se convierte en un ensamblaje 3D correcto
  sin errores geométricos ni autointersecciones.
- Las piezas exportadas encajan físicamente con las tolerancias especificadas.
- La interfaz responde a cambios de parámetros en < 500 ms.
- Pasan los tests unitarios, de integración y e2e.
- Usable en Chrome / Firefox / Edge modernos (WebGL2).

## 16. Riesgos y mitigaciones

| Riesgo                                                | Prob. | Impacto | Mitigación                                                               |
| ----------------------------------------------------- | ----- | ------- | ------------------------------------------------------------------------ |
| Bugs en librerías de geometría con curvas complejas   | Media | Alto    | Prototipar temprano (Fase 0); plan B (Clipper2-WASM, JSCAD, OpenCascade) |
| Rendimiento insuficiente en el navegador              | Media | Alto    | Workers, preview baja resolución, caché, debounce, WebGPU si posible     |
| Dificultad en encastres tipo click                    | Alta  | Alto    | Interferencia configurable; iterar con impresiones 3D reales; documentar |
| Complejidad de parsing SVG (curvas, transformaciones) | Media | Medio   | Librerías robustas + sanitización; limitar a features comunes            |
| Empaquetado WASM de Manifold en worker con Vite       | Media | Alto    | ADR en Fase 0; evaluar carga dinámica y bundles                          |

## 17. Puntos abiertos / decisiones pendientes de confirmación

1. **Interpretación del corte transversal y ubicación del labio/ranura** →
   RESUELTO con la imagen de referencia (registro en texto + diagrama en §5):
   el difusor se asienta en el rebaje/labio superior de la tapa; la pared verde
   de la tapa se desliza junto al muro gris (pared interior) de la base con una
   ranura/holgura de encastre; la cavidad LED queda a la derecha del muro gris.
   Leyenda de colores: Tapa=verde · Difusor=cian · Base=gris.
2. **Escala SVG → mm** → CONFIRMADO: **1 unidad SVG = 1 mm**, con slider de
   escala opcional.
3. **Cavidad LED** → CONFIRMADO: base hueca por dentro, suelo cerrado, sin
   agujeros para cable/tira en v0.1.
4. **Offset 2D** → RESUELTO: **cavalierContours** para v0.1 (simplicidad,
   ligereza, API amigable). Migración prevista a **Clipper2-WASM** en v1.0+ si
   se requiere más robustez o rendimiento.

### Decisión de offset 2D (ADR)

**Objetivo:** diseñar desde el inicio una arquitectura que permita sustituir la
librería de offset sin modificar el resto de la aplicación. Se logra mediante
una abstracción clara, un modelo de datos neutral y pruebas de regresión.

**Principios de diseño:**

1. **Dependencia de abstracciones, no de implementaciones concretas.** La capa
   de dominio define una interfaz `IOffsetService`. La aplicación (casos de
   uso, workers, UI) solo conoce esta interfaz. Las implementaciones concretas
   (cavalierContours o Clipper2-WASM) se inyectan según la versión.
2. **Modelo de datos común basado en polilíneas.** Toda la geometría 2D se
   representa como una lista de puntos `{x: number, y: number}` (coordenadas
   flotantes en unidades del SVG, normalmente milímetros). No se utilizan
   estructuras propias de ninguna librería en la lógica de negocio.
3. **Separación de responsabilidades.**
   - El parser SVG convierte curvas Bézier a polilíneas discretizadas
     (independiente de la librería de offset).
   - El servicio de offset recibe una o varias polilíneas y una distancia, y
     devuelve nuevas polilíneas.
   - El generador de geometría 3D consume las polilíneas resultantes, sin saber
     qué librería las produjo.
4. **Aislamiento en Web Workers.** El procesamiento de offset se ejecuta dentro
   de un Web Worker para no bloquear la UI. La comunicación se realiza mediante
   mensajes con datos serializables (arrays de puntos). La elección de librería
   no afecta este esquema.
5. **Pruebas automatizadas como red de seguridad.** Se escriben tests unitarios
   que verifican el comportamiento del offset (dimensiones, ausencia de
   autointersecciones, manejo de curvas cerradas). Estos tests se ejecutan
   contra ambas implementaciones para garantizar equivalencia o mejora.
