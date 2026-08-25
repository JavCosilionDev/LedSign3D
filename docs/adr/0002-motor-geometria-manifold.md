# ADR-0002: Motor de geometría 3D — manifold-3d (WASM)

## Estado

Aceptado (v0.1).

## Contexto

La generación de piezas (base, tapa, panel difusor) requiere extrusión de
secciones 2D (con agujeros, fill-rule evenodd) y operaciones booleanas
(unión/diferencia de mallas). Se evaluaron JSCAD, OpenCascade.js y Manifold.

## Decisión

Usar **manifold-3d** (v3.5.1, Apache-2.0) detrás del puerto de dominio
`IGeometryEngine`. El WASM se inicializa una vez (`await init()`) y produce
mallas neutrales `Mesh3D` (Float32Array de posiciones + Uint32Array de
triángulos + volumen), consumibles por Three.js y por los exportadores.

## Consecuencias

- Garantía de salida manifold (sin huecos ni caras invertidas) y volumen
  calculable para validar "watertight" en los tests.
- La sección 2D se construye con `CrossSection.ofPolygons(contornos, 'EvenOdd')`,
  resolviendo de forma nativa contornos anidados (agujeros) sin booleanos extra.
- El WASM debe empaquetarse correctamente en el Web Worker (ADR-0004).

## Alternativas consideradas

- JSCAD (cómodo pero pesado para el navegador).
- OpenCascade.js (~50 MB, curva de aprendizaje alta; plan B).
