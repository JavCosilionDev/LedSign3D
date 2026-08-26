import type { Contour } from "../../domain/entities/Contour";
import type { Polygon2D } from "../../domain/value-objects/Polygon2D";
import type { ISvgParser } from "../../domain/ports/ISvgParser";
import { Matrix2D, parseTransform } from "./Matrix2D";
import { shapeToPath } from "./shapesToPath";
import { flattenPathData } from "./pathDataParser";
import { buildContours } from "./contourBuilder";

/** Etiquetas que agrupan y propagan el sistema de coordenadas. */
const CONTAINER_TAGS = new Set(["svg", "g", "a"]);

/** Etiquetas que no generan geometría y no deben recorrer sus hijos. */
const SKIP_TAGS = new Set([
  "defs",
  "clipPath",
  "mask",
  "pattern",
  "symbol",
  "title",
  "desc",
  "metadata",
  "style",
  "script",
  "text",
  "image",
  "use",
  "foreignObject",
  "line",
  "switch",
]);

/** Segmentos objetivo por vuelta completa de círculo (suavizado uniforme). */
const CIRCLE_SEGMENTS = 256;
/** Tolerancia gruesa para estimar el tamaño del documento (fallback sin viewBox). */
const COARSE_TOLERANCE = 1;
/** Tamaño de documento por defecto si no se puede estimar. */
const DEFAULT_DOC_SIZE = 100;

/**
 * Parser de SVG a contornos 2D cerrados.
 *
 * - Requiere un SVG ya SANITIZADO (ver SvgSanitizer).
 * - Se ejecuta en el hilo principal (DOMParser no está garantizado en
 *   Web Workers); los contornos resultantes son datos neutrales que se
 *   envían al worker para la generación de geometría.
 * - Aplica transformaciones de grupos y elementos (translate/scale/rotate/...).
 * - Convierte del sistema de coordenadas de SVG (Y hacia abajo) al estándar
 *   (Y hacia arriba) para que la geometría 3D y el STL no queden espejados.
 * - Muestrea las curvas con tolerancia adaptativa al tamaño del documento,
 *   dando un suavizado uniforme (~256 segmentos por círculo) en todos los SVGs.
 * - v0.1: ignora texto, imágenes y referencias externas.
 */
export class SvgParser implements ISvgParser {
  parse(svgSource: string): Contour[] {
    const doc = new DOMParser().parseFromString(svgSource, "image/svg+xml");
    if (doc.querySelector("parsererror")) {
      throw new Error("El archivo no es un SVG (XML) válido");
    }
    const root = doc.documentElement;
    if (!root || root.tagName.toLowerCase() !== "svg") {
      throw new Error("El archivo no contiene un elemento <svg> raíz");
    }

    const tolerance = this.computeTolerance(root);
    const polygons: Polygon2D[] = [];
    this.walk(root, parseTransform(root.getAttribute("transform")), polygons, tolerance);
    return buildContours(polygons);
  }

  /** Tolerancia de muestreo para ~CIRCLE_SEGMENTS segmentos por vuelta de círculo. */
  private computeTolerance(root: Element): number {
    const docSize = this.documentSize(root);
    return (docSize * Math.PI ** 2) / (4 * CIRCLE_SEGMENTS ** 2);
  }

  /** Dimensión representativa del documento (viewBox o estimación por barrido). */
  private documentSize(root: Element): number {
    const viewBox = parseViewBox(root.getAttribute("viewBox"));
    if (viewBox) return viewBox;
    const coarse: Polygon2D[] = [];
    this.walk(root, parseTransform(root.getAttribute("transform")), coarse, COARSE_TOLERANCE);
    const size = boundingBoxMaxDimension(coarse);
    return size > 0 ? size : DEFAULT_DOC_SIZE;
  }

  private walk(el: Element, matrixToRoot: Matrix2D, out: Polygon2D[], tolerance: number): void {
    for (const child of Array.from(el.children)) {
      const tag = child.tagName.toLowerCase();
      if (SKIP_TAGS.has(tag)) continue;
      if (isHidden(child)) continue;

      // Matriz que mapea las coordenadas locales del hijo a la raíz,
      // combinando la del padre con el transform propio del hijo.
      const childMatrix = matrixToRoot.multiply(parseTransform(child.getAttribute("transform")));

      const d = shapeToPath(tag, readAttrs(child));
      if (d) {
        for (const poly of flattenPathData(d, tolerance)) {
          out.push({
            points: poly.points.map((p) => {
              const t = childMatrix.apply(p);
              // SVG usa Y hacia abajo; se invierte para coordenadas estándar.
              return { x: t.x, y: -t.y };
            }),
            isClosed: poly.isClosed,
          });
        }
        continue;
      }

      if (CONTAINER_TAGS.has(tag)) {
        this.walk(child, childMatrix, out, tolerance);
      }
    }
  }
}

/** Lee el viewBox "minX minY width height" y devuelve la dimensión más larga. */
function parseViewBox(value: string | null): number | null {
  if (!value) return null;
  const parts = value
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length < 4 || parts.some((n) => Number.isNaN(n))) return null;
  return Math.max(parts[2], parts[3], 1);
}

function boundingBoxMaxDimension(polygons: readonly Polygon2D[]): number {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const poly of polygons) {
    for (const p of poly.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (!Number.isFinite(minX)) return 0;
  return Math.max(maxX - minX, maxY - minY);
}

function readAttrs(el: Element): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    attrs[attr.name] = attr.value;
  }
  return attrs;
}

function isHidden(el: Element): boolean {
  const style = el.getAttribute("style") ?? "";
  return (
    el.getAttribute("display") === "none" ||
    el.getAttribute("visibility") === "hidden" ||
    /display\s*:\s*none/i.test(style)
  );
}
