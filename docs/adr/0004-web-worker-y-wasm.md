# ADR-0004: Web Worker para geometría y empaquetado WASM

## Estado
Aceptado (v0.1).

## Contexto
El procesamiento de un SVG (hasta 100 contornos) debe ejecutarse en < 2 s sin
bloquear la UI. Manifold requiere WASM; cavalier-contours-js es JS puro.

## Decisiones
1. **Geometría en un Web Worker** (`geometry.worker.ts`): parsing, offset,
   extrusión y booleanos se ejecutan en el worker; la comunicación usa
   `postMessage` con datos serializables (arrays de puntos / `Mesh3D` con
   `Float32Array`/`Uint32Array` transferibles).
2. **Inicialización WASM idempotente**: `ManifoldEngine.init()` carga el WASM
   una sola vez. Vite resuelve el `.wasm` de manifold-3d como URL estática.
   En el worker se usa un `new Worker(new URL(...), { type: 'module' })`.
3. **`cavalier-contours-js` es ESM puro**: se ejecuta dentro del worker sin
   necesidad de WASM, simplificando el empaquetado.

## Consecuencias
- La UI permanece fluida durante el cálculo; el visor muestra un estado de
  carga y actualiza al recibir el `Mesh3D`.
- El diseño de puertos (`IOffsetService`, `IGeometryEngine`) permite ejecutar
  la misma lógica en Node (tests) o en el worker (producción) sin cambios.
- El `Mesh3D` neutral evita copiar estructuras pesadas entre hilos (solo se
  transfieren los ArrayBuffers).
