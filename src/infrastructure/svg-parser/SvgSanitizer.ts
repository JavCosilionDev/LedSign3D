import DOMPurify, { type Config } from "dompurify";
import type { ISvgSanitizer } from "../../domain/ports/ISvgSanitizer";

/**
 * Configuración de sanitización SVG (plan v0.1 §12, RNF-05).
 * - Perfil SVG únicamente (sin HTML/MathML).
 * - Prohíbe scripts, estilos, imágenes, usos externos y foreignObject.
 * - Elimina atributos de eventos (on*) y enlaces externos.
 */
const SANITIZE_CONFIG: Config = {
  USE_PROFILES: { svg: true, svgFilters: false, html: false, mathMl: false },
  FORBID_TAGS: ["foreignObject", "image", "use", "style", "script", "a"],
  FORBID_ATTR: ["href", "xlink:href", "externalResourcesRequired"],
};

/**
 * Sanitiza un documento SVG para eliminar riesgos de XSS (scripts, handlers,
 * referencias externas) antes de procesarlo. Se ejecuta en el hilo principal
 * (DOMPurify/DOMParser no están garantizados en Web Workers).
 */
export class SvgSanitizer implements ISvgSanitizer {
  sanitize(svgSource: string): string {
    const clean: string = DOMPurify.sanitize(svgSource, SANITIZE_CONFIG);
    if (clean.trim() === "") {
      throw new Error("El SVG no contiene contenido procesable tras la sanitización");
    }
    return clean;
  }
}
