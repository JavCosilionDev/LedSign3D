import type { Point2D } from "./Point2D";

/**
 * Polilínea cerrada (o abierta) 2D como lista de puntos. Modelo neutral
 * basado en polilíneas (ADR offset 2D): la lógica de negocio NO usa
 * estructuras propias de librerías de geometría.
 */
export interface Polygon2D {
  readonly points: readonly Point2D[];
  readonly isClosed: boolean;
}
