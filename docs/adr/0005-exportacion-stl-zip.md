# ADR-0005: Exportación v0.1 — solo STL + ZIP por tipo de pieza

## Estado

Aceptado (v0.1).

## Contexto

El objetivo original contemplaba STL y DXF (corte láser). El usuario confirmó
que v0.1 es **solo impresión 3D**, por lo que la exportación se limita a STL
(binario por defecto, ASCII opcional) de todas las piezas. DXF/corte láser
queda pospuesto a un desarrollo futuro.

## Decisiones

1. **Un STL por pieza** vía `StlExporter` (`IStlExporter`), con normales de
   cara calculadas y normalizadas.
2. **ZIP organizado por tipo** (`ExportStlZip` + `JsZipZipExporter`):
   `base/{forma}.stl`, `tapa/{forma}.stl`, `panel-difusor/{forma}.stl`
   (plan v0.1 §9). El nombre del archivo deriva del contorno (`forma-1`, …).
3. **JSZip con carga dinámica**: se importa solo al exportar (bundle inicial
   más pequeño).
4. La pieza "panel difusor" también se exporta como STL plano (3 mm) en v0.1,
   aunque su material real (acrílico difusor) normalmente se corta por láser.

## Consecuencias

- El flujo de exportación es testeable en Node (cabecera STL, facetas, rutas
  del ZIP y estructura de carpetas verificadas por tests).
- Añadir DXF en el futuro no modifica la arquitectura: se agrega un exportador
  nuevo detrás de su propio puerto (`IDxfExporter`) y se amplía `ExportStlZip`.
