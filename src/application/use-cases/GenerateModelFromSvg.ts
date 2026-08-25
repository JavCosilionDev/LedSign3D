import type { ISvgParser } from "../../domain/ports/ISvgParser";
import type { ISvgSanitizer } from "../../domain/ports/ISvgSanitizer";
import type { ProjectSettings } from "../../domain/value-objects/ProjectSettings";
import type { Assembly } from "../../domain/entities/Assembly";
import type { Contour } from "../../domain/entities/Contour";
import { BuildAssembliesFromContours } from "./BuildAssembliesFromContours";
import type { BuildAssembliesFromContoursDeps } from "./BuildAssembliesFromContours";

export type GenerateModelFromSvgDeps = BuildAssembliesFromContoursDeps & {
  readonly sanitizer: ISvgSanitizer;
  readonly parser: ISvgParser;
};

/**
 * Caso de uso principal de v0.1: SVG (ya cargado) → ensamblajes 3D.
 *
 * Orquesta: sanitizar → parsear a contornos → generar las tres piezas
 * (base, tapa, panel difusor) por contorno → ensamblajes con mallas y
 * metadatos. Útil en tests/Node; en producción el paso pesado se delega
 * en el Web Worker (BuildAssembliesFromContours).
 */
export class GenerateModelFromSvg {
  private readonly buildAssemblies: BuildAssembliesFromContours;

  constructor(private readonly deps: GenerateModelFromSvgDeps) {
    this.buildAssemblies = new BuildAssembliesFromContours(deps);
  }

  async execute(svgSource: string, settings: ProjectSettings): Promise<Assembly[]> {
    const contours = this.parse(svgSource);
    return this.buildAssemblies.execute(contours, settings);
  }

  parse(svgSource: string): Contour[] {
    const cleanSvg = this.deps.sanitizer.sanitize(svgSource);
    const contours = this.deps.parser.parse(cleanSvg);
    if (contours.length === 0) {
      throw new Error("El SVG no contiene formas cerradas procesables");
    }
    return contours;
  }
}
