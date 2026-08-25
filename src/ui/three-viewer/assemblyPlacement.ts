import type { Assembly } from "../../domain/entities/Assembly";
import { assemblyParts } from "../../domain/entities/Assembly";
import type { Part } from "../../domain/entities/Part";
import { meshZRange } from "../../infrastructure/geometry/MeshUtils";

export interface PartPlacement {
  readonly part: Part;
  /** Desplazamiento vertical (Z del modelo) para ensamblar esta pieza. */
  readonly zOffset: number;
}

/**
 * Posiciona las piezas de un ensamblaje apiladas en vertical (Z):
 * la base en el origen, la tapa sobre la base y el panel sobre la tapa.
 * Cada pieza se coloca de modo que su z mínimo (local) coincide con el
 * z máximo de la pieza anterior (montaje apretado).
 */
export function assemblyPlacements(assembly: Assembly): PartPlacement[] {
  const parts = assemblyParts(assembly);
  const placements: PartPlacement[] = [];
  let top = 0;
  for (const part of parts) {
    if (!part.mesh) continue;
    const { minZ } = meshZRange(part.mesh);
    const zOffset = top - minZ;
    placements.push({ part, zOffset });
    top = zOffset + meshZRange(part.mesh).maxZ;
  }
  return placements;
}
