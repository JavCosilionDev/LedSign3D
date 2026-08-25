import type { Contour } from "../../../domain/entities/Contour";
import type { Mesh3D } from "../../../domain/ports/IGeometryEngine";
import type { ProjectSettings } from "../../../domain/value-objects/ProjectSettings";

/** Construye la malla 3D de una pieza a partir del contorno y parámetros. */
export interface PartBuilder {
  build(contour: Contour, settings: ProjectSettings): Promise<Mesh3D>;
}
