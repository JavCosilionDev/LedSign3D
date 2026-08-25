# ADR-0004: Web Worker para geometría y empaquetado WASM

## Estado

Aceptado (v0.1).

## Contexto

El procesamiento de un SVG (hasta 100 contornos) debe ejecutarse en < 2 s sin
bloquear la UI. Manifold requiere WASM; cavalier-contours-js es JS puro.

`DOMParser` y DOMPurify no están garantizados en Web Workers, así que el
parseo/sanitización del SVG se ejecuta en el **hilo principal** y solo la
parte pesada (offset + extrusión + booleanos) corre en el worker.

## Decisiones

1. **Parseo en el hilo principal** (`SvgParser` + `SvgSanitizer` → `Contour[]`
   neutrales); el worker recibe los contornos ya parseados.
2. **Geometría en un Web Worker** (`geometry.worker.ts`): offset, extrusión y
   booleanos; la comunicación usa `postMessage` con datos serializables
   (`Contour[]`/`ProjectSettingsValues` de entrada; `Mesh3D` con
   `Float32Array`/`Uint32Array` transferibles de salida).
3. **Inicialización WASM idempotente**: `ManifoldEngine.init()` carga el WASM
   una sola vez. Vite resuelve el `.wasm` de manifold-3d como URL estática.
   En el worker se usa `new Worker(new URL(...), { type: 'module' })`.
4. **`cavalier-contours-js` es ESM puro**: se ejecuta dentro del worker sin
   necesidad de WASM, simplificando el empaquetado.
5. **Gateway inyectable** (`GeometryWorkerGateway` con factoría de worker):
   el transporte es testeable con un worker falso en los tests.

## Consecuencias

- La UI permanece fluida durante el cálculo; el visor muestra un estado de
  carga y actualiza al recibir los `Mesh3D`.
- El diseño de puertos (`IOffsetService`, `IGeometryEngine`, `IGeometryGateway`)
  permite ejecutar la misma lógica en Node (tests) o en el worker (producción)
  sin cambios.
- El `Mesh3D` neutral evita copiar estructuras pesadas entre hilos (solo se
  transfieren los ArrayBuffers).
