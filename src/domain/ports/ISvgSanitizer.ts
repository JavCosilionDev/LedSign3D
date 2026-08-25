/**
 * Puente de dominio para la sanitización de SVG (RNF-05: evitar XSS).
 */
export interface ISvgSanitizer {
  sanitize(svgSource: string): string;
}
