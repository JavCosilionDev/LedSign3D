import type { Polygon2D } from "../value-objects/Polygon2D";

/** Una forma 2D compuesta por un contorno exterior y cero o más agujeros. */
export interface OffsetShapeInput {
  readonly outer: Polygon2D;
  readonly holes: readonly Polygon2D[];
}

/** Resultado de offset de una forma, con contorno exterior y agujeros resultantes. */
export interface OffsetShapeResult {
  readonly outer: Polygon2D | null;
  readonly holes: readonly Polygon2D[];
}

export type OffsetDirection = "inset" | "outset";

/**
 * Puente de dominio para operaciones de offset 2D sobre polilíneas.
 *
 * Las implementaciones concretas (cavalierContours v0.1, Clipper2-WASM en el
 * futuro) se inyectan sin modificar el resto de la aplicación (ADR offset 2D).
 */
export interface IOffsetService {
  /**
   * Aplica offset a una forma (contorno + agujeros) manteniendo las
   * relaciones de anidamiento.
   *
   * @param shape Forma de entrada (exterior + agujeros).
   * @param distance Distancia de offset en las unidades del modelo (mm).
   * @param direction "inset" reduce el área rellena; "outset" la expande.
   * @returns Forma resultante; `outer` puede ser null si el inset elimina el área.
   */
  offsetShape(
    shape: OffsetShapeInput,
    distance: number,
    direction: OffsetDirection,
  ): OffsetShapeResult;
}
