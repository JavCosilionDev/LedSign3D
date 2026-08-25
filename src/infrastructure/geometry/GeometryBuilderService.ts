import type { Contour } from "../../domain/entities/Contour";
import type { PartType } from "../../domain/entities/Part";
import type { IGeometryBuilderService } from "../../domain/ports/IGeometryBuilderService";
import type { Mesh3D } from "../../domain/ports/IGeometryEngine";
import type { ProjectSettings } from "../../domain/value-objects/ProjectSettings";
import type { GeometryPipeline } from "./GeometryPipeline";
import { createPartBuilders, type PartBuilder } from "./partBuilders";

/**
 * Implementación de IGeometryBuilderService: delega en el builder de cada
 * tipo de pieza usando el pipeline de offset/extrusión.
 */
export class GeometryBuilderService implements IGeometryBuilderService {
  private readonly builders: Record<PartType, PartBuilder>;

  constructor(pipeline: GeometryPipeline) {
    this.builders = createPartBuilders(pipeline);
  }

  buildPart(contour: Contour, type: PartType, settings: ProjectSettings): Promise<Mesh3D> {
    return this.builders[type].build(contour, settings);
  }
}
