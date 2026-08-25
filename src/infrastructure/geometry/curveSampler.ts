import type { Point2D } from "../../domain/value-objects/Point2D";
import { pointLineDistance } from "../../domain/value-objects/GeometryUtils";

/**
 * Muestreo de curvas 2D (Bézier y arcos SVG) a polilíneas discretizadas
 * mediante subdivisión adaptativa con tolerancia dimensional (default ±0.1 mm).
 * La entrada y salida usan el modelo neutral Point2D/Polygon2D.
 */

const DEFAULT_TOLERANCE = 0.1;
const MAX_DEPTH = 32;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function pointLerp(a: Point2D, b: Point2D, t: number): Point2D {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

/**
 * Muestrea una curva de Bézier cúbica (p0 → p3, con controles p1, p2)
 * en una polilínea abierta de puntos dentro de `tolerance` de la curva exacta.
 */
export function sampleCubicBezier(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  tolerance: number = DEFAULT_TOLERANCE,
): Point2D[] {
  const out: Point2D[] = [p0];
  recurseCubic(p0, p1, p2, p3, tolerance, 0, out);
  out.push(p3);
  return out;
}

function recurseCubic(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  tolerance: number,
  depth: number,
  out: Point2D[],
): void {
  if (depth >= MAX_DEPTH) return;
  const flatEnough =
    pointLineDistance(p1, p0, p3) <= tolerance && pointLineDistance(p2, p0, p3) <= tolerance;
  if (flatEnough) return;
  const m01 = pointLerp(p0, p1, 0.5);
  const m12 = pointLerp(p1, p2, 0.5);
  const m23 = pointLerp(p2, p3, 0.5);
  const m012 = pointLerp(m01, m12, 0.5);
  const m123 = pointLerp(m12, m23, 0.5);
  const m0123 = pointLerp(m012, m123, 0.5);
  recurseCubic(p0, m01, m012, m0123, tolerance, depth + 1, out);
  out.push(m0123);
  recurseCubic(m0123, m123, m23, p3, tolerance, depth + 1, out);
}

/** Muestrea una Bézier cuadrática convirtiéndola a cúbica exacta. */
export function sampleQuadraticBezier(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  tolerance: number = DEFAULT_TOLERANCE,
): Point2D[] {
  const c1 = pointLerp(p0, p1, 2 / 3);
  const c2 = pointLerp(p2, p1, 2 / 3);
  return sampleCubicBezier(p0, c1, c2, p2, tolerance);
}

/**
 * Convierte un arco en representación "bulge" (usada por cavalier-contours y
 * polilíneas CAD) a una polilínea muestreada.
 *
 * bulge = tan(sweepAngle / 4); bulge > 0 = arco antihorario (CCW).
 * Reutiliza la parametrización de arco SVG.
 */
export function sampleBulgeArc(
  start: Point2D,
  end: Point2D,
  bulge: number,
  tolerance: number = DEFAULT_TOLERANCE,
): Point2D[] {
  const chord = Math.hypot(end.x - start.x, end.y - start.y);
  if (chord < 1e-12) return [end];
  const theta = 4 * Math.atan(bulge);
  const absTheta = Math.abs(theta);
  const denom = Math.sin(absTheta / 2);
  const r = denom > 1e-9 ? chord / (2 * denom) : chord / 2;
  return sampleArc(start, end, r, r, 0, absTheta > Math.PI, bulge > 0, tolerance);
}

/**
 * Convierte un arco SVG (comando A) a una polilínea muestreada, usando la
 * parametrización por centro del estándar SVG (sección F.6.5).
 */
export function sampleArc(
  start: Point2D,
  end: Point2D,
  rx: number,
  ry: number,
  xAxisRotationDeg: number,
  largeArcFlag: boolean,
  sweepFlag: boolean,
  tolerance: number = DEFAULT_TOLERANCE,
): Point2D[] {
  const out: Point2D[] = [start];

  // 1) Tomar valores absolutos (F.6.6.1)
  rx = Math.abs(rx);
  ry = Math.abs(ry);

  // 2) Ecuación 5.1: calcular (x1', y1')
  const phi = (xAxisRotationDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const dx = (start.x - end.x) / 2;
  const dy = (start.y - end.y) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;

  // 3) Corrección de radios (F.6.6.3)
  const scale = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (scale > 1) {
    const s = Math.sqrt(scale);
    rx *= s;
    ry *= s;
  }

  // 4) Ecuación 5.2: centro (cx', cy')
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coef = Math.sqrt(Math.max(0, num / den));
  const sign = largeArcFlag !== sweepFlag ? 1 : -1;
  const cxp = sign * coef * ((rx * y1p) / ry);
  const cyp = sign * coef * (-(ry * x1p) / rx);

  // 5) Ecuaciones 5.3: centro real (cx, cy)
  const cx = cosPhi * cxp - sinPhi * cyp + (start.x + end.x) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (start.y + end.y) / 2;

  // 6) Ecuaciones 5.4 y 5.5: ángulos inicial y barrido
  const theta1 = angleBetween(
    { x: 1, y: 0 },
    {
      x: (x1p - cxp) / rx,
      y: (y1p - cyp) / ry,
    },
  );
  const u = { x: (x1p - cxp) / rx, y: (y1p - cyp) / ry };
  const v = { x: (-x1p - cxp) / rx, y: (-y1p - cyp) / ry };
  let deltaTheta = angleBetween(u, v);
  if (!sweepFlag && deltaTheta > 0) deltaTheta -= 2 * Math.PI;
  if (sweepFlag && deltaTheta < 0) deltaTheta += 2 * Math.PI;

  // 7) Muestrear el arco en el espacio del centro
  //    Número de segmentos según la longitud del arco y la tolerancia.
  const arcAngle = Math.abs(deltaTheta);
  const r = Math.max(rx, ry);
  const approxLen = r * arcAngle;
  const segments = Math.max(1, Math.ceil(approxLen / Math.sqrt(2 * tolerance)));

  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const angle = theta1 + deltaTheta * t;
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    const px = rx * cosAngle;
    const py = ry * sinAngle;
    const x = cosPhi * px - sinPhi * py + cx;
    const y = sinPhi * px + cosPhi * py + cy;
    out.push({ x, y });
  }
  // Garantizar que el arco termina exactamente en `end` (evita deriva flotante).
  out[out.length - 1] = { x: end.x, y: end.y };
  return out;
}

/** Ángulo entre dos vectores (radianes), en (-π, π]. Conforme a SVG F.6.5. */
function angleBetween(u: Point2D, v: Point2D): number {
  return Math.atan2(u.x * v.y - u.y * v.x, u.x * v.x + u.y * v.y);
}
