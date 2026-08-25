import type { Contour } from "../../../domain/entities/Contour";
import type { Mesh3D } from "../../../domain/ports/IGeometryEngine";
import type { ProjectSettings } from "../../../domain/value-objects/ProjectSettings";
import type { GeometryPipeline } from "../GeometryPipeline";
import { translateMeshZ } from "../MeshUtils";
import type { PartBuilder } from "./types";

/**
 * Tapa: canal con paredes que siguen el contorno del letrero (exterior y
 * agujeros), rebaje superior que asienta el panel difusor y labio inferior
 * que encastra en la ranura de la base.
 */
export class TapaBuilder implements PartBuilder {
  constructor(private readonly pipeline: GeometryPipeline) {}

  async build(contour: Contour, settings: ProjectSettings): Promise<Mesh3D> {
    const wallThickness = settings.get("espesorParedTapa");
    const wallHeight = settings.get("alturaParedTapa");
    const lipThickness = settings.get("espesorLabioTapa");
    const lipDepth = settings.get("profundidadLabioTapa");
    const holgura = settings.get("holgura");
    const panelThickness = settings.get("espesorPanelDifusor");
    const panelTolerance = settings.get("toleranciaPanelDifusor");

    // Pared principal: 0..wallHeight.
    let tapa = await this.pipeline.extrudeLoops(
      this.pipeline.wallLoops(contour, wallThickness, 0),
      wallHeight,
    );

    // Rebaje superior: carve del asiento del panel desde la cara superior.
    if (panelTolerance < wallThickness) {
      const pocket = await this.pipeline.extrudeLoops(
        this.pipeline.panelLoops(contour, panelTolerance),
        panelThickness,
      );
      tapa = await this.pipeline.difference(
        tapa,
        translateMeshZ(pocket, wallHeight - panelThickness),
      );
    }

    // Labio inferior: sobresale por debajo de la pared (-lipDepth..0).
    const labio = await this.pipeline.extrudeLoops(
      this.pipeline.wallLoops(contour, lipThickness, holgura),
      lipDepth,
    );
    tapa = await this.pipeline.union(tapa, translateMeshZ(labio, -lipDepth));

    return tapa;
  }
}
