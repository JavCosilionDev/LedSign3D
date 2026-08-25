import type { Assembly } from "../../domain/entities/Assembly";
import { assemblyParts } from "../../domain/entities/Assembly";
import type { Part } from "../../domain/entities/Part";
import { meshBounds, meshZRange } from "../../infrastructure/geometry/MeshUtils";

export interface PartPlacement {
  readonly part: Part;
  /** Desplazamiento vertical (Z del modelo) para ensamblar esta pieza. */
  readonly zOffset: number;
}

/** Separación horizontal entre ensamblajes en el visor (mm). */
const ASSEMBLY_GAP = 10;

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

export interface AssemblyLayoutItem {
  readonly assembly: Assembly;
  readonly placements: PartPlacement[];
  /** Desplazamiento horizontal (X del mundo) del ensamblaje en la fila. */
  readonly xOffset: number;
}

export interface AssemblyLayout {
  readonly items: readonly AssemblyLayoutItem[];
  /** Anchura total de la fila (mm). */
  readonly width: number;
  /** Profundidad máxima (mm). */
  readonly depth: number;
  /** Altura máxima (mm). */
  readonly height: number;
}

/**
 * Distribuye los ensamblajes en una fila horizontal (X), separados por un
 * hueco, y calcula las dimensiones totales del conjunto. Los ensamblajes no
 * se superponen (cada forma del SVG es un letrero independiente).
 */
export function layoutAssemblies(assemblies: readonly Assembly[]): AssemblyLayout {
  let cursor = 0;
  let depth = 0;
  let height = 0;
  const items: AssemblyLayoutItem[] = [];

  for (const assembly of assemblies) {
    const placements = assemblyPlacements(assembly);
    let width = 0;
    for (const { part } of placements) {
      if (!part.mesh) continue;
      const bounds = meshBounds(part.mesh);
      width = Math.max(width, bounds.width);
      depth = Math.max(depth, bounds.depth);
      height = Math.max(height, bounds.height);
    }
    items.push({ assembly, placements, xOffset: cursor });
    if (width > 0) cursor += width + ASSEMBLY_GAP;
  }

  const totalWidth = cursor > 0 ? cursor - ASSEMBLY_GAP : 0;
  return { items, width: totalWidth, depth, height };
}
