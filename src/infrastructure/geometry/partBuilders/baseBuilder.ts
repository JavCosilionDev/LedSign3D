import type { Contour } from "../../../domain/entities/Contour";
import type { Mesh3D } from "../../../domain/ports/IGeometryEngine";
import type { ProjectSettings } from "../../../domain/value-objects/ProjectSettings";
import type { GeometryPipeline } from "../GeometryPipeline";
import { translateMeshZ } from "../MeshUtils";
import type { PartBuilder } from "./types";

/**
 * Base: bandeja inferior que aloja la tira LED.
 *  - Suelo (placa que se extiende bajo la pared exterior).
 *  - Pared exterior (reborde corto en el perímetro).
 *  - Pared interior (alta) que forma la cavidad LED; la ranura entre ambas
 *    recibe el labio de la tapa.
 */
export class BaseBuilder implements PartBuilder {
  constructor(private readonly pipeline: GeometryPipeline) {}

  async build(contour: Contour, settings: ProjectSettings): Promise<Mesh3D> {
    const floorThickness = settings.get("espesorSueloBase");
    const outerWallThickness = settings.get("espesorParedExteriorBase");
    const outerWallHeight = settings.get("alturaParedExteriorBase");
    const innerWallThickness = settings.get("espesorParedInteriorBase");
    const innerWallHeight = settings.get("alturaParedInteriorBase");
    const lipThickness = settings.get("espesorLabioTapa");
    const holgura = settings.get("holgura");

    const outerFace = this.pipeline.curveOffset(contour.outer, outerWallThickness);

    // Suelo (0..floorThickness), extendido hasta la cara exterior.
    let base = await this.pipeline.extrudeLoops([outerFace, ...contour.holes], floorThickness);

    // Pared exterior (anillo en el perímetro exterior).
    const outerWall = await this.pipeline.extrudeLoops([outerFace, contour.outer], outerWallHeight);
    base = await this.pipeline.union(base, translateMeshZ(outerWall, floorThickness));

    // Pared interior (sigue exterior + agujeros), con ranura para el labio.
    const innerWall = await this.pipeline.extrudeLoops(
      this.pipeline.wallLoops(contour, innerWallThickness, lipThickness + holgura),
      innerWallHeight,
    );
    base = await this.pipeline.union(base, translateMeshZ(innerWall, floorThickness));

    return base;
  }
}
