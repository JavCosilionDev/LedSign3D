# LEDSign3D

Convierte un **SVG monocromático** en modelos 3D (STL) listos para **impresión 3D**,
para construir letreros LED tipo "letra canal". Por cada forma del SVG se generan
tres piezas con encastres tipo "click":

- **Base** — bandeja inferior que aloja la tira LED (hueca por dentro, suelo cerrado).
- **Tapa** — canal con rebaje superior y labio inferior que encastra en la base.
- **Panel difusor** — lámina plana (transparente en uso) que encastra en la tapa.

![Arquitectura](https://img.shields.io/badge/architecture-clean--layers-4f8cff)
![License](https://img.shields.io/badge/license-MIT-green)
![Tests](https://img.shields.io/badge/tests-138%20unit%20%2B%206%20e2e-blue)

## Características (v0.1)

- Carga de SVG por arrastrar-soltar (límite 10 MB, sanitizado contra XSS).
- Parseo de shapes y paths con curvas (Bézier/arcos), transformaciones y agujeros
  (fill-rule even-odd).
- **12 parámetros editables** (espesores, alturas, tolerancias y holgura) con
  valores por defecto y advertencias de consistencia geométrica.
- **Vista 3D en tiempo real** (Three.js + OrbitControls) del ensamblaje completo.
- Generación de geometría en un **Web Worker** (no bloquea la UI), con Manifold
  (WASM) para extrusión/booleanos y cavalier-contours para offset 2D.
- Exportación **STL** (binario o ASCII) por pieza, organizada en un ZIP con
  subcarpetas `base/`, `tapa/` y `panel-difusor/`.
- 100% cliente-side: sin servidor, sin envío de datos.

> v0.1 solo exporta **STL** (impresión 3D). El corte láser / DXF queda pospuesto
> (ver [ADR-0005](docs/adr/0005-exportacion-stl-zip.md)).

## Requisitos

- Node.js **20+** y npm.
- Navegador moderno con WebGL2 (Chrome 110+, Firefox 115+, Edge 110+).

## Instalación y uso

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`, arrastra un SVG monocromático y ajusta los
parámetros. La vista 3D se actualiza en tiempo real; pulsa **Exportar ZIP** para
descargar los STL organizados.

## Desarrollo

```bash
npm run dev          # servidor de desarrollo (HMR)
npm test             # tests unitarios e integración (Vitest)
npm run test:watch   # modo watch
npm run test:coverage # cobertura (umbrales: >=80 % stmts/lines, >=75 % branches)
npm run test:e2e     # tests end-to-end (Playwright; construye y sirve la app)
npm run typecheck    # TypeScript estricto
npm run lint         # ESLint (flat config) + Prettier
npm run build        # build de producción
npm run preview      # sirve el build local
```

> Los tests e2e requieren Chromium de Playwright:
> `npx playwright install chromium`.

### Pre-commit

Husky + lint-staged formatean y lintan los archivos modificados antes de cada
commit.

## Arquitectura

Monolito modular en capas (Clean Architecture), 100% cliente-side. El dominio y
la aplicación **no** dependen de Three.js ni del DOM, lo que permite testear la
geometría en Node.

```
src/
├── domain/                # Entidades, value-objects y puertos (interfaces)
│   ├── entities/          # Contour, Part, Assembly
│   ├── value-objects/     # ProjectSettings (12 parámetros), Polygon2D, GeometryUtils
│   └── ports/             # IOffsetService, IGeometryEngine, ISvgParser, IGeometryGateway…
├── application/           # Casos de uso
│   ├── use-cases/         # ParseSvg, BuildAssembliesFromContours, ExportStlZip
│   └── ports/             # IGeometryGateway
├── infrastructure/        # Implementaciones concretas
│   ├── svg-parser/        # SvgSanitizer (DOMPurify), SvgParser, contourBuilder, Matrix2D
│   ├── geometry/          # ManifoldEngine, cavalierContoursOffsetService, GeometryPipeline, partBuilders
│   ├── exporters/         # StlExporter, JsZipZipExporter
│   └── workers/           # geometry.worker.ts, GeometryWorkerGateway
└── ui/                    # React + Zustand + Three.js
    ├── components/        # FileDrop, ParameterPanel, ExportPanel, SvgPreview2D
    ├── state/             # settingsStore, projectStore, useModelPipeline
    ├── three-viewer/      # ViewerScene, Viewer, assemblyPlacement
    └── utils/             # download
```

### Flujo de datos

```
SVG → sanitizar/parsear (hilo principal) → Contour[]
   → Worker (offset + extrusión + booleanos) → Assembly[] (Mesh3D)
   → Store Zustand → Visor 3D y Exportación ZIP
```

### Decisiones de arquitectura

Los ADRs documentan las decisiones importantes:

| ADR                                                      | Decisión                                                 |
| -------------------------------------------------------- | -------------------------------------------------------- |
| [0001](docs/adr/0001-libreria-offset-2d-cavalier.md)     | Offset 2D con cavalier-contours-js (migrable a Clipper2) |
| [0002](docs/adr/0002-motor-geometria-manifold.md)        | Motor 3D con manifold-3d (WASM)                          |
| [0003](docs/adr/0003-modelo-datos-neutral-y-muestreo.md) | Modelo de datos neutral (polilíneas) y muestreo de arcos |
| [0004](docs/adr/0004-web-worker-y-wasm.md)               | Parseo en hilo principal + geometría en worker           |
| [0005](docs/adr/0005-exportacion-stl-zip.md)             | Exportación v0.1 solo STL + ZIP                          |
| [0006](docs/adr/0006-visor-threejs.md)                   | Visor Three.js y ensamblaje apilado                      |

## Stack

- **Lenguaje / Build:** TypeScript (estricto) + Vite
- **UI / Estado:** React 18 + Zustand
- **3D:** Three.js + OrbitControls (WebGL2)
- **Geometría:** manifold-3d (WASM) + cavalier-contours-js (offset)
- **SVG:** DOMPurify (sanitización) + DOMParser
- **Exportación:** STL propio + JSZip (carga bajo demanda)
- **Testing:** Vitest + @testing-library/react + Playwright
- **Calidad:** ESLint + Prettier + Husky + lint-staged

## Roadmap

- **v0.2+:** exportación DXF/corte láser, editor de texto tipográfico,
  calibración empírica de encastres, más materiales y tipos de pieza.

## Licencia

MIT — ver [LICENSE](LICENSE).

## Contribuir

Ver [CONTRIBUTING.md](CONTRIBUTING.md).
