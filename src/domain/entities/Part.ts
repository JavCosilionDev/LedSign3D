import type { Mesh3D } from "../ports/IGeometryEngine";

/** Tipos de pieza que genera el sistema por cada contorno. */
export type PartType = "base" | "tapa" | "panel-difusor";

export const PART_TYPES: readonly PartType[] = ["base", "tapa", "panel-difusor"];

/** Nombres de carpeta para exportación (estructura del ZIP). */
export const PART_FOLDER: Record<PartType, string> = {
  base: "base",
  tapa: "tapa",
  "panel-difusor": "panel-difusor",
};

/** Metadatos dimensionales de una pieza generada. */
export interface PartMetadata {
  /** Anchura del bounding box (mm). */
  readonly width: number;
  /** Profundidad del bounding box (mm). */
  readonly depth: number;
  /** Altura de la pieza (mm). */
  readonly height: number;
  /** Volumen del sólido (mm³). */
  readonly volume: number;
  /** Número de triángulos de la malla. */
  readonly triangles: number;
}

/**
 * Pieza 3D generada a partir de un contorno. `mesh` puede estar ausente
 * mientras la geometría se está calculando o si falló la generación.
 */
export interface Part {
  readonly type: PartType;
  /** Referencia al contorno original (Contour.id). */
  readonly contourId: string;
  readonly mesh?: Mesh3D;
  readonly metadata?: PartMetadata;
}
