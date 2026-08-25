import type { Point2D } from "./Point2D";
import type { Polygon2D } from "./Polygon2D";

/**
 * Funciones matemáticas puras sobre polígonos 2D. Sin dependencias externas;
 * usadas por la lógica de dominio y por los tests de regresión.
 */

/**
 * Área con signo (método del cordón / shoelace).
 * > 0 => sentido antihorario (CCW, área positiva / relleno).
 * < 0 => sentido horario (CW, área negativa / agujero).
 */
export function signedArea(polygon: Polygon2D): number {
  const pts = polygon.points;
  let area = 0;
  const n = polygon.isClosed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

/** Devuelve una copia del polígono con la orientación indicada (cw = true → horario). */
export function ensureOrientation(polygon: Polygon2D, cw: boolean): Polygon2D {
  const isCw = signedArea(polygon) < 0;
  if (isCw === cw) return polygon;
  return { ...polygon, points: [...polygon.points].reverse() };
}

/** Centroide (baricentro) de un polígono simple. */
export function centroid(polygon: Polygon2D): Point2D {
  const pts = polygon.points;
  let a = 0;
  let cx = 0;
  let cy = 0;
  const n = polygon.isClosed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    const cross = p.x * q.y - q.x * p.y;
    a += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-12) {
    const b = boundingBoxCentroid(pts);
    return b;
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

function boundingBoxCentroid(pts: readonly Point2D[]): Point2D {
  let sx = 0;
  let sy = 0;
  for (const p of pts) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / pts.length, y: sy / pts.length };
}

/** Distancia mínima desde un punto a la recta definida por los puntos a y b. */
export function pointLineDistance(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / Math.sqrt(lenSq);
}
