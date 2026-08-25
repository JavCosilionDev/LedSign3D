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

const SAMPLING_TOLERANCE = 0.1;

/**
 * Parser de SVG a contornos 2D cerrados.
 *
 * - Requiere un SVG ya SANITIZADO (ver SvgSanitizer).
 * - Se ejecuta en el hilo principal (DOMParser no está garantizado en
 *   Web Workers); los contornos resultantes son datos neutrales que se
 *   envían al worker para la generación de geometría.
 * - Aplica transformaciones de grupos y elementos (translate/scale/rotate/...).
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

    const polygons: Polygon2D[] = [];
    this.walk(root, parseTransform(root.getAttribute("transform")), polygons);
    return buildContours(polygons);
  }

  private walk(el: Element, matrixToRoot: Matrix2D, out: Polygon2D[]): void {
    for (const child of Array.from(el.children)) {
      const tag = child.tagName.toLowerCase();
      if (SKIP_TAGS.has(tag)) continue;
      if (isHidden(child)) continue;

      // Matriz que mapea las coordenadas locales del hijo a la raíz,
      // combinando la del padre con el transform propio del hijo.
      const childMatrix = matrixToRoot.multiply(parseTransform(child.getAttribute("transform")));

      const d = shapeToPath(tag, readAttrs(child));
      if (d) {
        for (const poly of flattenPathData(d, SAMPLING_TOLERANCE)) {
          out.push({
            points: poly.points.map((p) => childMatrix.apply(p)),
            isClosed: poly.isClosed,
          });
        }
        continue;
      }

      if (CONTAINER_TAGS.has(tag)) {
        this.walk(child, childMatrix, out);
      }
    }
  }
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
