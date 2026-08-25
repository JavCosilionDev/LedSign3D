import type { Mesh3D } from "./IGeometryEngine";

export type StlFormat = "binary" | "ascii";

/**
 * Puente de dominio para la exportación de mallas a STL
 * (binario por defecto, ASCII opcional). v0.1 solo exporta STL
 * (sin DXF/corte láser, pospuesto).
 */
export interface IStlExporter {
  exportMesh(mesh: Mesh3D, options?: { format?: StlFormat; name?: string }): Blob;
}
