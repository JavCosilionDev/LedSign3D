# ADR-0001: Librería de offset 2D — cavalier-contours-js

## Estado
Aceptado (v0.1). Migración prevista a Clipper2-WASM en v1.0+ si se requiere
mayor robustez o rendimiento en casos extremos.

## Contexto
La aplicación necesita operaciones de offset 2D sobre contornos extraídos de
SVG (paredes, labios, rebajes de la tapa y base). En Fase 0 se investigó:
- **cavalier_contours** (Rust) → port oficial TS puro **cavalier-contours-js**
  (MIT/Apache-2.0), sin WASM, ESM, compatible con navegador/worker/Node.
- **Clipper2-WASM**: potente pero requiere empaquetado WASM y API más pesada.

## Decisión
Usar **cavalier-contours-js** (0.1.1) para v0.1, detrás del puerto de dominio
`IOffsetService`. Toda la geometría se representa con polilíneas neutrales
`{x, y}` (ADR-0003), por lo que sustituir la librería no modifica el resto de
la aplicación.

## Consecuencias
- El offset aislado es testeable contra ambas implementaciones (regresión).
- cavalier produce **arcos (bulge)** al expandir contornos; se resuelve
  muestreándolos a polilínea con tolerancia (ADR-0003).
- Convención de signos: offset positivo contrae contornos CCW; el servicio
  traduce la semántica de dominio `inset`/`outset`.

## Alternativas consideradas
- Clipper2-WASM (más robusto para casos extremos, pero WASM en worker).
- Implementación propia de offset (descartada por complejidad/robustez).
