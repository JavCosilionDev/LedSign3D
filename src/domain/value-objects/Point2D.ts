/**
 * Punto 2D en el plano XY. Modelo de datos neutral (no depende de ninguna
 * librería), serializable para comunicación con Web Workers.
 */
export interface Point2D {
  readonly x: number;
  readonly y: number;
}
