import type { Contour } from "../../domain/entities/Contour";
import type { ISvgParser } from "../../domain/ports/ISvgParser";
import type { ISvgSanitizer } from "../../domain/ports/ISvgSanitizer";

export interface ParseSvgDeps {
  readonly sanitizer: ISvgSanitizer;
  readonly parser: ISvgParser;
}

/**
 * Sanitiza y parsea un SVG a contornos 2D. Se ejecuta en el hilo principal
 * (DOMParser/DOMPurify no están garantizados en Web Workers); los contornos
 * resultantes se envían al worker para generar la geometría.
 */
export class ParseSvg {
  constructor(private readonly deps: ParseSvgDeps) {}

  execute(svgSource: string): Contour[] {
    const cleanSvg = this.deps.sanitizer.sanitize(svgSource);
    const contours = this.deps.parser.parse(cleanSvg);
    if (contours.length === 0) {
      throw new Error("El SVG no contiene formas cerradas procesables");
    }
    return contours;
  }
}
