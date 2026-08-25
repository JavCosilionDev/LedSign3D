import type { Contour } from "../entities/Contour";
import type { PartType } from "../entities/Part";
import type { Mesh3D } from "./IGeometryEngine";
import type { ProjectSettings } from "../value-objects/ProjectSettings";

/**
 * Puente de dominio para la generación de una pieza 3D a partir de un
 * contorno y la configuración de parámetros.
 */
export interface IGeometryBuilderService {
  buildPart(contour: Contour, type: PartType, settings: ProjectSettings): Promise<Mesh3D>;
}
