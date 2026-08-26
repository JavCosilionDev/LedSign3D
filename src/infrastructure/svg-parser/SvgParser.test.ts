import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SvgParser } from "./SvgParser";
import { signedArea } from "../../domain/value-objects/GeometryUtils";

/** SVG de prueba real: cabeza con ojos, curvas cúbicas (viewBox 16×16). */
const ALIEN_SVG = readFileSync(resolve("src/test/svg/alien.svg"), "utf-8");

function wrap(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

describe("SvgParser", () => {
  const parser = new SvgParser();

  it("extrae un rect como contorno único", () => {
    const contours = parser.parse(wrap('<rect x="0" y="0" width="10" height="20"/>'));
    expect(contours).toHaveLength(1);
    expect(Math.abs(signedArea(contours[0].outer))).toBeCloseTo(200, 6);
    expect(contours[0].holes).toHaveLength(0);
  });

  it("extrae un círculo como contorno con el área esperada", () => {
    const contours = parser.parse(wrap('<circle cx="0" cy="0" r="10"/>'));
    expect(contours).toHaveLength(1);
    expect(Math.abs(signedArea(contours[0].outer))).toBeCloseTo(Math.PI * 100, 0);
  });

  it("extrae un path con curvas", () => {
    const contours = parser.parse(wrap('<path d="M 0 0 C 10 20 20 20 30 0 L 0 0 Z"/>'));
    expect(contours).toHaveLength(1);
    expect(contours[0].outer.points.length).toBeGreaterThan(3);
  });

  it("genera un contorno con agujero para la letra O", () => {
    const svg = wrap(
      '<path d="M 40 0 A 40 40 0 1 1 -40 0 A 40 40 0 1 1 40 0 Z"/>' +
        '<path d="M 20 0 A 20 20 0 1 1 -20 0 A 20 20 0 1 1 20 0 Z"/>',
    );
    const contours = parser.parse(svg);
    expect(contours).toHaveLength(1);
    expect(contours[0].holes).toHaveLength(1);
  });

  it("genera un contorno por cada forma separada", () => {
    const svg = wrap(
      '<rect x="0" y="0" width="5" height="5"/> <rect x="20" y="0" width="5" height="5"/>',
    );
    const contours = parser.parse(svg);
    expect(contours).toHaveLength(2);
  });

  it("aplica translate del grupo a sus hijos (con Y invertida a coordenadas estándar)", () => {
    const svg = wrap(
      '<g transform="translate(50, 10)"><rect x="0" y="0" width="5" height="5"/></g>',
    );
    const contours = parser.parse(svg);
    const bb = contours[0].boundingBox;
    expect(bb.minX).toBeCloseTo(50, 6);
    // SVG usa Y hacia abajo: tras invertir, el rect queda en [-15, -10].
    expect(bb.minY).toBeCloseTo(-15, 6);
    expect(bb.maxY).toBeCloseTo(-10, 6);
  });

  it("aplica scale al elemento (con Y invertida)", () => {
    const svg = wrap('<rect x="0" y="0" width="10" height="10" transform="scale(2)"/>');
    const contours = parser.parse(svg);
    expect(contours[0].boundingBox.maxX).toBeCloseTo(20, 6);
    // Rect 10×10 escalado ×2 en y=0..20 → invertido queda en -20..0.
    expect(contours[0].boundingBox.minY).toBeCloseTo(-20, 6);
    expect(contours[0].boundingBox.maxY).toBeCloseTo(0, 6);
  });

  it("muestrea las curvas de un SVG pequeño con resolución uniforme (suavizado)", () => {
    const contours = parser.parse(ALIEN_SVG);
    expect(contours.length).toBeGreaterThan(0);
    // El contorno exterior (cabeza) debe tener muchos vértices para verse suave.
    const head = contours.reduce((a, b) => (b.outer.points.length > a.outer.points.length ? b : a));
    expect(head.outer.points.length).toBeGreaterThan(80);
  });

  it("ignora texto, imágenes y líneas abiertas", () => {
    const svg = wrap(
      '<text x="5" y="5">Hola</text>' +
        '<image x="0" y="0" width="5" height="5"/>' +
        '<line x1="0" y1="0" x2="5" y2="5"/>',
    );
    expect(parser.parse(svg)).toHaveLength(0);
  });

  it("ignora elementos ocultos (display:none)", () => {
    const svg = wrap('<rect x="0" y="0" width="5" height="5" style="display:none"/>');
    expect(parser.parse(svg)).toHaveLength(0);
  });

  it("lanza error con SVG inválido", () => {
    expect(() => parser.parse("<svg><unclosed></svg>")).toThrow();
  });

  it("lanza error si la raíz no es <svg>", () => {
    expect(() => parser.parse("<html><body></body></html>")).toThrow();
  });
});
