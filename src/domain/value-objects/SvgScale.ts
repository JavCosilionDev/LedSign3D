import type { Contour } from "../entities/Contour";
import type { Polygon2D } from "./Polygon2D";

/**
 * Resultado del cálculo de escala de un SVG a un tamaño máximo deseado.
 */
export interface SvgScaleInfo {
  /** Factor de escala aplicado a los contornos (>= 1; nunca encoge el original). */
  readonly scale: number;
  /** Dimensión más larga efectiva (mm) tras la escala. */
  readonly maxDimension: number;
  /** Anchura del bounding box escalado (mm). */
  readonly width: number;
  /** Altura del bounding box escalado (mm). */
  readonly height: number;
}

export interface ScaledContours {
  readonly contours: Contour[];
  readonly info: SvgScaleInfo;
}

/**
 * Calcula el factor de escala para que la dimensión más larga del bounding box
 * de TODOS los contornos sea como mínimo `svgMaxDimension`.
 *
 * Regla: nunca se encoge el original. Si el SVG ya supera `svgMaxDimension`,
 * se mantiene su tamaño (escala 1). Si es menor, se escala para alcanzarlo
 * (mínimo viable para impresión, plan v0.1).
 */
export function computeSvgScale(
  contours: readonly Contour[],
  svgMaxDimension: number,
): SvgScaleInfo {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const contour of contours) {
    const bb = contour.boundingBox;
    if (bb.minX < minX) minX = bb.minX;
    if (bb.minY < minY) minY = bb.minY;
    if (bb.maxX > maxX) maxX = bb.maxX;
    if (bb.maxY > maxY) maxY = bb.maxY;
  }

  const originalWidth = maxX > minX ? maxX - minX : 0;
  const originalHeight = maxY > minY ? maxY - minY : 0;
  const originalMax = Math.max(originalWidth, originalHeight, 1e-9);
  const target = Math.max(svgMaxDimension, originalMax);
  const scale = target / originalMax;

  // Sin contornos (o sin extensión), no hay nada que escalar.
  if (contours.length === 0) {
    return { scale: 1, maxDimension: 0, width: 0, height: 0 };
  }

  return {
    scale,
    maxDimension: target,
    width: originalWidth * scale,
    height: originalHeight * scale,
  };
}

/**
 * Devuelve los contornos escalados para alcanzar el tamaño máximo deseado
 * (regla de `computeSvgScale`). Con escala 1 devuelve los mismos contornos.
 */
export function applySvgScale(
  contours: readonly Contour[],
  svgMaxDimension: number,
): ScaledContours {
  const info = computeSvgScale(contours, svgMaxDimension);
  if (Math.abs(info.scale - 1) < 1e-9) {
    return { contours: [...contours], info };
  }
  return {
    contours: contours.map((contour) => scaleContour(contour, info.scale)),
    info,
  };
}

function scaleContour(contour: Contour, scale: number): Contour {
  return {
    ...contour,
    outer: scalePolygon(contour.outer, scale),
    holes: contour.holes.map((hole) => scalePolygon(hole, scale)),
    boundingBox: {
      minX: contour.boundingBox.minX * scale,
      minY: contour.boundingBox.minY * scale,
      maxX: contour.boundingBox.maxX * scale,
      maxY: contour.boundingBox.maxY * scale,
    },
  };
}

function scalePolygon(polygon: Polygon2D, scale: number): Polygon2D {
  return {
    ...polygon,
    points: polygon.points.map((p) => ({ x: p.x * scale, y: p.y * scale })),
  };
}
