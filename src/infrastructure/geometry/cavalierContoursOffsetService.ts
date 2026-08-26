import { Polyline, Shape, type Polyline as PolylineType } from "cavalier-contours-js";
import type {
  IOffsetService,
  OffsetShapeInput,
  OffsetShapeResult,
  OffsetDirection,
} from "../../domain/ports/IOffsetService";
import type { Polygon2D } from "../../domain/value-objects/Polygon2D";
import { ensureOrientation, signedArea } from "../../domain/value-objects/GeometryUtils";
import { sampleBulgeArc } from "./curveSampler";

/**
 * Implementación de IOffsetService con cavalier-contours-js (v0.1).
 *
 * Convención de la librería: un offset POSITIVO sobre un contorno CCW lo
 * desplaza hacia ADENTRO (inset); un offset NEGATIVO lo expande (outset).
 * Este servicio traduce la semántica de dominio ("inset"/"outset") a esa
 * convención, aislando la librería del resto de la aplicación.
 */
export class CavalierContoursOffsetService implements IOffsetService {
  /** Tolerancia de muestreo de arcos (bulge) → polilínea (esquinas suaves). */
  constructor(private readonly tolerance = 0.01) {}
  offsetShape(
    shape: OffsetShapeInput,
    distance: number,
    direction: OffsetDirection,
  ): OffsetShapeResult {
    if (distance < 0) {
      throw new Error("La distancia de offset debe ser mayor o igual a 0");
    }

    const plines: PolylineType[] = [
      toCavalierPolyline(shape.outer, false),
      ...shape.holes.map((h) => toCavalierPolyline(h, true)),
    ];

    const signed = direction === "inset" ? distance : -distance;
    const offset = Shape.fromPlines(plines).parallelOffset(signed);

    // Nota: el offset de cavalier puede invertir la orientación de los bucles
    // resultantes (ej. un outset de un contorno CCW devuelve un bucle CW).
    // Por eso recopilamos TODOS los bucles (ccw + cw) y los clasificamos por
    // área (el mayor = contorno exterior). La regla de relleno EvenOdd aguas
    // abajo es independiente de la orientación, así que el orden no altera la
    // geometría sólida.
    const loops = [
      ...offset.ccwPlines.map((p) => fromCavalierPolyline(p.polyline, this.tolerance)),
      ...offset.cwPlines.map((p) => fromCavalierPolyline(p.polyline, this.tolerance)),
    ].sort((a, b) => Math.abs(signedArea(b)) - Math.abs(signedArea(a)));

    return {
      outer: loops.length > 0 ? loops[0] : null,
      holes: loops.slice(1),
    };
  }
}

function toCavalierPolyline(polygon: Polygon2D, hole: boolean): Polyline {
  // Normalizar orientación: exterior CCW (área positiva), agujeros CW.
  const oriented = ensureOrientation(polygon, hole);
  const pl = new Polyline({ isClosed: oriented.isClosed });
  for (const p of oriented.points) {
    pl.add(p.x, p.y, 0);
  }
  return pl;
}

function fromCavalierPolyline(pl: Polyline, tolerance: number): Polygon2D {
  const points: { x: number; y: number }[] = [];
  const n = pl.vertexCount;
  if (n === 0) return { points, isClosed: pl.isClosed };
  for (let v = 0; v < n; v++) {
    const vert = pl.get(v);
    if (!vert) continue;
    points.push({ x: vert.x, y: vert.y });
    if (v < n - 1 || pl.isClosed) {
      const next = pl.get((v + 1) % n);
      // Si el segmento es un arco (bulge != 0), muestrearlo dentro de la
      // tolerancia en lugar de una cuerda recta. Se excluye el punto final
      // del arco (coincide con el siguiente vértice, que se añade aparte).
      if (next && Math.abs(vert.bulge) > 1e-12) {
        const arc = sampleBulgeArc(
          { x: vert.x, y: vert.y },
          { x: next.x, y: next.y },
          vert.bulge,
          tolerance,
        );
        for (let k = 1; k < arc.length - 1; k++) points.push(arc[k]);
      }
    }
  }
  return { points, isClosed: pl.isClosed };
}
