import type { Polygon2D } from "../value-objects/Polygon2D";
import type { BoundingBox } from "../value-objects/BoundingBox";

/**
 * Contorno cerrado 2D extraído del SVG: un exterior (sentido antihorario por
 * convención) y cero o más agujeros (sentido horario). Corresponde a una
 * forma rellenable del documento SVG.
 */
export interface Contour {
  /** Identificador único (índice del contorno en el documento). */
  readonly id: string;
  /** Nombre descriptivo para exportación (derivado del id). */
  readonly name: string;
  /** Polígono exterior del contorno (CCW). */
  readonly outer: Polygon2D;
  /** Agujeros interiores (CW). Vacío si no tiene agujeros. */
  readonly holes: readonly Polygon2D[];
  /** Rectángulo envolvente del contorno. */
  readonly boundingBox: BoundingBox;
}
