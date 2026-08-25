import type { Contour } from "../../domain/entities/Contour";
import type { Polygon2D } from "../../domain/value-objects/Polygon2D";
import {
  signedArea,
  ensureOrientation,
  pointInPolygon,
} from "../../domain/value-objects/GeometryUtils";
import { boundingBoxOfPoints } from "../../domain/value-objects/BoundingBox";

/**
 * Agrupa los polígonos planos extraídos del SVG en contornos (exterior +
 * agujeros) aplicando la regla de relleno even-odd.
 *
 * Un polígono en profundidad par es una región rellena (exterior); en
 * profundidad impar es un agujero. Las islas dentro de un agujero
 * (profundidad par > 0) se tratan como contornos independientes.
 */
export function buildContours(polygons: readonly Polygon2D[]): Contour[] {
  const valid: Polygon2D[] = polygons.filter(
    (p) => p.points.length >= 3 && Math.abs(signedArea(p)) > 1e-9,
  );
  if (valid.length === 0) return [];

  const sorted = valid
    .map((polygon, idx) => ({ polygon, idx, area: Math.abs(signedArea(polygon)) }))
    .sort((a, b) => b.area - a.area);

  // parent[i] = índice (en `sorted`) del polígono de menor área que lo contiene.
  const parent = new Array<number>(sorted.length).fill(-1);
  for (let i = 0; i < sorted.length; i++) {
    let best = -1;
    let bestArea = Number.POSITIVE_INFINITY;
    for (let j = 0; j < sorted.length; j++) {
      if (i === j || sorted[j].area <= sorted[i].area) continue;
      if (pointInPolygon(sorted[i].polygon.points[0], sorted[j].polygon)) {
        if (sorted[j].area < bestArea) {
          best = j;
          bestArea = sorted[j].area;
        }
      }
    }
    parent[i] = best;
  }

  // Profundidad de anidamiento (0 = exterior raíz, 1 = agujero, 2 = isla, ...).
  const depth = new Array<number>(sorted.length).fill(0);
  for (let i = 0; i < sorted.length; i++) {
    let d = 0;
    let cur = i;
    const seen = new Set<number>();
    while (parent[cur] !== -1 && !seen.has(cur)) {
      seen.add(cur);
      cur = parent[cur];
      d++;
    }
    depth[i] = d;
  }

  const childrenOf = (k: number): number[] => {
    const out: number[] = [];
    for (let i = 0; i < parent.length; i++) {
      if (parent[i] === k) out.push(i);
    }
    return out;
  };

  const contours: Contour[] = [];
  for (let k = 0; k < sorted.length; k++) {
    if (depth[k] % 2 !== 0) continue; // solo profundidades pares (exteriores)
    const outer = ensureOrientation(sorted[k].polygon, false);
    const holes = childrenOf(k)
      .filter((idx) => depth[idx] === depth[k] + 1)
      .map((idx) => ensureOrientation(sorted[idx].polygon, true));

    contours.push({
      id: `contour-${sorted[k].idx + 1}`,
      name: `forma-${sorted[k].idx + 1}`,
      outer,
      holes,
      boundingBox: boundingBoxOfPoints(outer.points),
    });
  }
  return contours;
}
