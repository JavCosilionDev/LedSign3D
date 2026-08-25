import type { Assembly } from "../../domain/entities/Assembly";
import type { Contour } from "../../domain/entities/Contour";
import type { ProjectSettingsValues } from "../../domain/value-objects/ProjectSettings";
import { ProjectSettings } from "../../domain/value-objects/ProjectSettings";
import { BuildAssembliesFromContours } from "../../application/use-cases/BuildAssembliesFromContours";
import { GeometryBuilderService } from "../geometry/GeometryBuilderService";
import { GeometryPipeline } from "../geometry/GeometryPipeline";
import { ManifoldEngine } from "../geometry/manifoldEngine";
import { CavalierContoursOffsetService } from "../geometry/cavalierContoursOffsetService";

/** Solicitud que recibe el worker de geometría. */
export interface WorkerGenerateRequest {
  readonly id: number;
  readonly type: "generate";
  readonly contours: readonly Contour[];
  readonly settings: ProjectSettingsValues;
}

export type WorkerRequest = WorkerGenerateRequest;

export type WorkerResponse =
  | { readonly id: number; readonly type: "result"; readonly assemblies: Assembly[] }
  | { readonly id: number; readonly type: "error"; readonly error: string };

const buildAssemblies = new BuildAssembliesFromContours({
  builder: new GeometryBuilderService(
    new GeometryPipeline(new CavalierContoursOffsetService(), new ManifoldEngine()),
  ),
});

/**
 * Maneja una solicitud de generación (lógica pura, testeable en Node).
 * Reconstruye la configuración, genera los ensamblajes y devuelve el
 * resultado o el error serializado.
 */
export async function handleWorkerMessage(msg: WorkerRequest): Promise<WorkerResponse> {
  try {
    const settings = ProjectSettings.fromJSON(msg.settings);
    const assemblies = await buildAssemblies.execute(msg.contours, settings);
    return { id: msg.id, type: "result", assemblies };
  } catch (err) {
    return {
      id: msg.id,
      type: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
