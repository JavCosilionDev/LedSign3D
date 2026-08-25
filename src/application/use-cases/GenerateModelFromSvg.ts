import type { Assembly } from "../../domain/entities/Assembly";
import { assemblyKeyFor } from "../../domain/entities/Assembly";
import type { Part } from "../../domain/entities/Part";
import { PART_TYPES } from "../../domain/entities/Part";
import type { IGeometryBuilderService } from "../../domain/ports/IGeometryBuilderService";
import type { ISvgParser } from "../../domain/ports/ISvgParser";
import type { ISvgSanitizer } from "../../domain/ports/ISvgSanitizer";
import type { ProjectSettings } from "../../domain/value-objects/ProjectSettings";
import { meshBounds } from "../../infrastructure/geometry/MeshUtils";

export interface GenerateModelFromSvgDeps {
  readonly sanitizer: ISvgSanitizer;
  readonly parser: ISvgParser;
  readonly builder: IGeometryBuilderService;
}

/**
 * Caso de uso principal de v0.1: SVG (ya cargado) → ensamblajes 3D.
 *
 * Orquesta: sanitizar → parsear a contornos → generar las tres piezas
 * (base, tapa, panel difusor) por contorno → ensamblajes con mallas y
 * metadatos. No depende de Three.js ni del DOM.
 */
export class GenerateModelFromSvg {
  constructor(private readonly deps: GenerateModelFromSvgDeps) {}

  async execute(svgSource: string, settings: ProjectSettings): Promise<Assembly[]> {
    const cleanSvg = this.deps.sanitizer.sanitize(svgSource);
    const contours = this.deps.parser.parse(cleanSvg);
    if (contours.length === 0) {
      throw new Error("El SVG no contiene formas cerradas procesables");
    }

    const assemblies: Assembly[] = [];
    for (const contour of contours) {
      const assembly = { contourId: contour.id } as Assembly;
      const mutable = assembly as { base?: Part; tapa?: Part; panelDifusor?: Part };
      for (const type of PART_TYPES) {
        const mesh = await this.deps.builder.buildPart(contour, type, settings);
        const bounds = meshBounds(mesh);
        const part: Part = {
          type,
          contourId: contour.id,
          mesh,
          metadata: {
            width: bounds.width,
            depth: bounds.depth,
            height: bounds.height,
            volume: mesh.volume,
            triangles: mesh.triangleCount,
          },
        };
        mutable[assemblyKeyFor(type)] = part;
      }
      assemblies.push(assembly);
    }
    return assemblies;
  }
}
