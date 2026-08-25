import type { Assembly } from "../../domain/entities/Assembly";
import type { Contour } from "../../domain/entities/Contour";
import type { ProjectSettings } from "../../domain/value-objects/ProjectSettings";

/**
 * Puente de dominio para la generación de ensamblajes en segundo plano.
 * En v0.1 la implementación es un Web Worker; los tests usan una
 * implementación local equivalente.
 */
export interface IGeometryGateway {
  /** Genera los ensamblajes (base + tapa + panel difusor) por contorno. */
  generateAssemblies(contours: readonly Contour[], settings: ProjectSettings): Promise<Assembly[]>;
}
