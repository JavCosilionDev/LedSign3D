import type { OffsetShapeInput } from "./IOffsetService";
import type { Polygon2D } from "../value-objects/Polygon2D";

/**
 * Malla 3D neutral (posiciones interleaved XYZ + índices de triángulos).
 * Independiente de Three.js y de Manifold: cualquier renderizador/exporter
 * puede consumirla.
 */
export interface Mesh3D {
  /** Posiciones XYZ interleaved (3 floats por vértice). */
  readonly vertices: Float32Array;
  /** Índices de vértices por triángulo (3 índices por triángulo). */
  readonly triangles: Uint32Array;
  /** Volumen (en unidades cúbicas del modelo). > 0 si la malla es sólida. */
  readonly volume: number;
  /** Número de triángulos. */
  readonly triangleCount: number;
}

export type FillRule = "EvenOdd" | "NonZero";

/**
 * Puente de dominio para el motor de geometría 3D (extrusión y booleanos).
 * Implementación concreta: manifold-3d (WASM).
 */
export interface IGeometryEngine {
  /**
   * Extruye una lista arbitraria de bucles 2D a lo largo del eje Z,
   * interpretados con la regla de relleno indicada (EvenOdd por defecto).
   * Permite representar regiones con contornos anidados (agujeros, islas).
   * La base de la pieza queda en z=0 y crece hacia +Z.
   */
  extrudeLoops(loops: readonly Polygon2D[], height: number, fillRule?: FillRule): Promise<Mesh3D>;

  /**
   * Extruye una sección 2D (contorno exterior + agujeros) a lo largo del eje Z.
   * Equivale a `extrudeLoops([outer, ...holes], ...)`.
   */
  extrude(shape: OffsetShapeInput, height: number, fillRule?: FillRule): Promise<Mesh3D>;

  /** Unión booleana de dos mallas sólidas. */
  union(a: Mesh3D, b: Mesh3D): Promise<Mesh3D>;

  /** Diferencia booleana: elimina `b` de `a`. */
  difference(a: Mesh3D, b: Mesh3D): Promise<Mesh3D>;
}
