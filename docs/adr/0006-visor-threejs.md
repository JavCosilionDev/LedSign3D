# ADR-0006: Visor 3D con Three.js y ensamblaje apilado

## Estado

Aceptado (v0.1).

## Contexto

La aplicación necesita una vista 3D en tiempo real del ensamblaje completo
(base + tapa + panel difusor) con rotación/zoom. Las mallas se generan con
Manifold y se devuelven como `Mesh3D` neutral.

## Decisiones

1. **Three.js + OrbitControls** (WebGL2; la geometría ya está en el worker).
   El visor se implementa en `ViewerScene` (escena, iluminación hemisférica +
   2 direccionales, grid, encuadre automático con `Box3`).
2. **Mapeo de ejes**: el modelo usa Z como altura (extrusión); en Three.js se
   rota `-90°` en X para que la altura quede en Y (arriba).
3. **Ensamblaje apilado** (`assemblyPlacement`): cada pieza se coloca de modo
   que su Z mínimo coincide con el Z máximo de la pieza anterior (montaje
   apretado; maneja el labio de la tapa que sobresale bajo su origen local).
4. **Colores por tipo** coherentes con la leyenda del plan: tapa=verde,
   panel difusor=cian (semi-transparente), base=gris.
5. **Code-splitting**: three.js se agrupa en un chunk aparte (`manualChunks`).
6. **Conversión testeable** `Mesh3D → BufferGeometry` (`threeMeshConversion`),
   separada del renderizado.

## Consecuencias

- El visor se actualiza sincronizando el store de ensamblajes (React) con la
  escena; la lógica pura (posicionamiento, conversión) queda cubierta por
  tests unitarios.
- El rendimiento (> 30 FPS en el hardware objetivo) se valida de forma manual
  y con los tests e2e de Playwright.
- Sustituir el renderizador (p. ej. WebGPU) no afecta a la geometría: el visor
  solo consume `Mesh3D`.
