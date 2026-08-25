/**
 * Conversión de elementos shape de SVG a su comando `d` equivalente,
 * para reutilizar el parser de paths (flattenPathData).
 *
 * v0.1: solo formas que representan una región rellenable cerrada
 * (path, rect, circle, ellipse, polygon). `polyline` se incluye solo si
 * está visualmente cerrada; `line` (abierta, sin área) se ignora.
 */

export function shapeToPath(tag: string, attrs: Record<string, string>): string | null {
  switch (tag) {
    case "path":
      return attrs.d ?? null;
    case "rect":
      return rectToPath(attrs);
    case "circle":
      return circleToPath(attrs);
    case "ellipse":
      return ellipseToPath(attrs);
    case "polygon":
      return polygonToPath(attrs);
    case "polyline": {
      const d = polylineToPath(attrs);
      return d && isClosedPolyline(d) ? d : null;
    }
    default:
      return null;
  }
}

function num(attrs: Record<string, string>, name: string): number {
  const raw = attrs[name];
  const value = raw === undefined ? Number.NaN : Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function rectToPath(attrs: Record<string, string>): string {
  const x = num(attrs, "x");
  const y = num(attrs, "y");
  const w = num(attrs, "width");
  const h = num(attrs, "height");
  let rx = num(attrs, "rx");
  let ry = num(attrs, "ry");
  if (rx === 0 && ry !== 0) rx = ry;
  if (ry === 0 && rx !== 0) ry = rx;
  rx = Math.min(Math.max(rx, 0), w / 2);
  ry = Math.min(Math.max(ry, 0), h / 2);

  if (rx === 0 || ry === 0) {
    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
  }
  const fx = x + w - rx;
  const fy = y + h - ry;
  return [
    `M ${x + rx} ${y}`,
    `L ${fx} ${y}`,
    `A ${rx} ${ry} 0 0 1 ${x + w} ${y + ry}`,
    `L ${x + w} ${fy}`,
    `A ${rx} ${ry} 0 0 1 ${fx} ${y + h}`,
    `L ${x + rx} ${y + h}`,
    `A ${rx} ${ry} 0 0 1 ${x} ${fy}`,
    `L ${x} ${y + ry}`,
    `A ${rx} ${ry} 0 0 1 ${x + rx} ${y}`,
    "Z",
  ].join(" ");
}

function circleToPath(attrs: Record<string, string>): string {
  const cx = num(attrs, "cx");
  const cy = num(attrs, "cy");
  const r = num(attrs, "r");
  return `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} Z`;
}

function ellipseToPath(attrs: Record<string, string>): string {
  const cx = num(attrs, "cx");
  const cy = num(attrs, "cy");
  const rx = num(attrs, "rx");
  const ry = num(attrs, "ry");
  return `M ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} Z`;
}

function polygonToPath(attrs: Record<string, string>): string | null {
  const d = polylineToPath(attrs);
  return d ? `${d} Z` : null;
}

function polylineToPath(attrs: Record<string, string>): string | null {
  const points = parsePoints(attrs.points);
  if (points.length < 2) return null;
  const [first, ...rest] = points;
  const segments = rest.map(([x, y]) => `L ${x} ${y}`).join(" ");
  return `M ${first[0]} ${first[1]} ${segments}`.trim();
}

function parsePoints(raw: string | undefined): [number, number][] {
  if (!raw) return [];
  const tokens = raw
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);
  const pairs: [number, number][] = [];
  for (let i = 0; i + 1 < tokens.length; i += 2) {
    if (Number.isFinite(tokens[i]) && Number.isFinite(tokens[i + 1])) {
      pairs.push([tokens[i], tokens[i + 1]]);
    }
  }
  return pairs;
}

function isClosedPolyline(d: string): boolean {
  // Extraer el primer y último par de coordenadas y comparar con tolerancia.
  const tokens = d.match(/[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g) ?? [];
  const nums = tokens.map(Number);
  if (nums.length < 4) return false;
  const x1 = nums[0];
  const y1 = nums[1];
  const x2 = nums[nums.length - 2];
  const y2 = nums[nums.length - 1];
  return Math.hypot(x1 - x2, y1 - y2) < 1e-6;
}
