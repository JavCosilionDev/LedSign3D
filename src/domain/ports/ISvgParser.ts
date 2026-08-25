import type { Contour } from "../entities/Contour";

/**
 * Puente de dominio para el parser de SVG: convierte el contenido SVG
 * (ya sanitizado) en contornos 2D cerrados (exterior + agujeros).
 */
export interface ISvgParser {
  parse(svgSource: string): Contour[];
}
