# ADR-0003: Modelo de datos neutral (polilíneas) y muestreo de arcos

## Estado
Aceptado (v0.1).

## Contexto
Para permitir sustituir librerías de geometría sin tocar la lógica de negocio
(ADR-0001) y porque la UI/renderizador no debe conocer estructuras internas de
cada librería, toda la geometría 2D se representa con polilíneas de puntos
`{x, y}` en unidades del SVG (mm). Manifold y Three.js consumen polígonos.

## Decisiones
1. **Modelo de datos común**: `Polygon2D` (puntos + `isClosed`), `Point2D`,
   `Contour` (exterior + agujeros). Los puertos `IOffsetService` y
   `IGeometryEngine` solo usan estos tipos.
2. **Muestreo adaptativo de curvas**: Bézier (cúbicas/cuadráticas) y arcos SVG
   se discretizan con subdivisión adaptativa dentro de **±0.1 mm** (tolerancia
   dimensional del proyecto).
3. **Muestreo de arcos "bulge"**: cavalier devuelve esquinas redondeadas como
   arcos (bulge) al EXPANDIR contornos. Una conversión simple a cuerdas
   desvía ~0.44 mm en radios de 1.5 mm (fuera de ±0.1 mm). Por tanto, todo
   arco (SVG o bulge) se muestrea a polilínea con la tolerancia del proyecto.

## Consecuencias
- La lógica de dominio no importa librerías; los tests de regresión pueden
  ejecutarse contra ambas implementaciones de offset.
- La fidelidad geométrica de los arcos queda garantizada por tests de área
  (área poligonal ≈ área exacta con arcos).
