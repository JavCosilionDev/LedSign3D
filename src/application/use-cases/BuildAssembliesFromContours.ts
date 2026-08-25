import type { Assembly } from "../../domain/entities/Assembly";
import { assemblyKeyFor } from "../../domain/entities/Assembly";
import type { Part } from "../../domain/entities/Part";
import { PART_TYPES } from "../../domain/entities/Part";
import type { Contour } from "../../domain/entities/Contour";
import type { IGeometryBuilderService } from "../../domain/ports/IGeometryBuilderService";
import type { ProjectSettings } from "../../domain/value-objects/ProjectSettings";
import { meshBounds } from "../../infrastructure/geometry/MeshUtils";

export interface BuildAssembliesFromContoursDeps {
  readonly builder: IGeometryBuilderService;
}

/**
 * Caso de uso que genera los ensamblajes (base + tapa + panel difusor) a
 * partir de contornos ya extraídos y una configuración de parámetros.
 *
 * Se ejecuta dentro del Web Worker de geometría (Fase 3): la parte pesada
 * (offset + extrusión + booleanos) no bloquea la UI.
 */
export class BuildAssembliesFromContours {
  constructor(private readonly deps: BuildAssembliesFromContoursDeps) {}

  async execute(contours: readonly Contour[], settings: ProjectSettings): Promise<Assembly[]> {
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
