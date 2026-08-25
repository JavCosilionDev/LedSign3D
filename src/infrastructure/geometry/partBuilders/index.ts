import type { PartType } from "../../../domain/entities/Part";
import type { GeometryPipeline } from "../GeometryPipeline";
import type { PartBuilder } from "./types";
import { PanelDifusorBuilder } from "./panelDifusorBuilder";
import { TapaBuilder } from "./tapaBuilder";
import { BaseBuilder } from "./baseBuilder";

export type { PartBuilder };

/** Crea el mapa de builders por tipo de pieza. */
export function createPartBuilders(pipeline: GeometryPipeline): Record<PartType, PartBuilder> {
  return {
    base: new BaseBuilder(pipeline),
    tapa: new TapaBuilder(pipeline),
    "panel-difusor": new PanelDifusorBuilder(pipeline),
  };
}
