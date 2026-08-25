import type { Part } from "./Part";

/**
 * Ensamblaje de las tres piezas que se generan por cada contorno del SVG:
 * base + tapa + panel difusor.
 */
export interface Assembly {
  /** Referencia al contorno original (Contour.id). */
  readonly contourId: string;
  readonly base?: Part;
  readonly tapa?: Part;
  readonly panelDifusor?: Part;
}

/** Devuelve las piezas presentes de un ensamblaje. */
export function assemblyParts(assembly: Assembly): Part[] {
  const parts: Part[] = [];
  if (assembly.base) parts.push(assembly.base);
  if (assembly.tapa) parts.push(assembly.tapa);
  if (assembly.panelDifusor) parts.push(assembly.panelDifusor);
  return parts;
}
