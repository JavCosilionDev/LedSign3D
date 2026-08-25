import type { Contour } from "../../../domain/entities/Contour";
import type { Mesh3D } from "../../../domain/ports/IGeometryEngine";
import type { ProjectSettings } from "../../../domain/value-objects/ProjectSettings";
import type { GeometryPipeline } from "../GeometryPipeline";
import type { PartBuilder } from "./types";

/**
 * Panel difusor: lámina plana con el contorno del letrero (incluidos los
 * agujeros), inseted por la tolerancia para encastrar en el rebaje de la tapa.
 */
export class PanelDifusorBuilder implements PartBuilder {
  constructor(private readonly pipeline: GeometryPipeline) {}

  async build(contour: Contour, settings: ProjectSettings): Promise<Mesh3D> {
    const thickness = settings.get("espesorPanelDifusor");
    const tolerance = settings.get("toleranciaPanelDifusor");
    const loops = this.pipeline.panelLoops(contour, tolerance);
    return this.pipeline.extrudeLoops(loops, thickness);
  }
}
