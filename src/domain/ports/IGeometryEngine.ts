import type { OffsetShapeInput } from "./IOffsetService";

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
   * Extruye una sección 2D (contorno + agujeros) a lo largo del eje Z.
   * La base de la pieza queda en z=0 y crece hacia +Z.
   *
   * @param shape Sección transversal 2D (exterior + agujeros).
   * @param height Altura de extrusión (mm).
   * @param fillRule Regla de relleno para interpretar contornos anidados.
   */
  extrude(shape: OffsetShapeInput, height: number, fillRule?: FillRule): Promise<Mesh3D>;
}
