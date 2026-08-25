import { describe, it, expect } from "vitest";
import { sampleCubicBezier, sampleQuadraticBezier, sampleArc } from "./curveSampler";
import type { Point2D } from "../../domain/value-objects/Point2D";

function dist(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

describe("curveSampler", () => {
  it("muestrea una Bézier cúbica colineal como dos puntos", () => {
    const pts = sampleCubicBezier(
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 15, y: 0 },
      { x: 20, y: 0 },
      0.1,
    );
    expect(pts).toHaveLength(2);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[1]).toEqual({ x: 20, y: 0 });
  });

  it("muestrea una Bézier cúbica manteniendo la tolerancia", () => {
    // Cuarto de círculo de radio 50 aproximado por una cúbica.
    const r = 50;
    const k = 0.5522847498;
    const p0: Point2D = { x: r, y: 0 };
    const p1: Point2D = { x: r, y: r * k };
    const p2: Point2D = { x: r * k, y: r };
    const p3: Point2D = { x: 0, y: r };
    const pts = sampleCubicBezier(p0, p1, p2, p3, 0.1);

    expect(pts.length).toBeGreaterThan(2);
    expect(pts[0]).toEqual(p0);
    expect(pts[pts.length - 1]).toEqual(p3);

    // Todos los puntos deben estar a distancia ~r del origen.
    for (const p of pts) {
      const d = Math.hypot(p.x, p.y);
      expect(Math.abs(d - r)).toBeLessThanOrEqual(0.11);
    }
  });

  it("muestrea una Bézier cuadrática incluyendo extremos", () => {
    const pts = sampleQuadraticBezier({ x: 0, y: 0 }, { x: 50, y: 100 }, { x: 100, y: 0 }, 0.1);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 100, y: 0 });
    // La muestra debe subir hacia el control (máx y ≈ 50 en t=0.5).
    const maxY = Math.max(...pts.map((p) => p.y));
    expect(maxY).toBeGreaterThan(45);
    expect(maxY).toBeLessThan(55);
  });

  it("muestrea un arco SVG de 90 grados en el radio correcto", () => {
    const r = 50;
    const pts = sampleArc({ x: r, y: 0 }, { x: 0, y: r }, r, r, 0, false, true, 0.1);
    expect(pts[0]).toEqual({ x: r, y: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 0, y: r });
    for (const p of pts) {
      const d = Math.hypot(p.x, p.y);
      expect(Math.abs(d - r)).toBeLessThanOrEqual(0.11);
    }
  });

  it("muestrea un semicírculo con large-arc-flag", () => {
    const r = 30;
    const pts = sampleArc({ x: -r, y: 0 }, { x: r, y: 0 }, r, r, 0, true, false, 0.1);
    expect(pts[pts.length - 1]).toEqual({ x: r, y: 0 });
    for (const p of pts) {
      const d = Math.hypot(p.x, p.y);
      expect(Math.abs(d - r)).toBeLessThanOrEqual(0.11);
    }
    // El arco pasa por la parte superior (y > 0) con large-arc + sweep false.
    const maxY = Math.max(...pts.map((p) => p.y));
    expect(maxY).toBeCloseTo(r, 0);
  });

  it("los segmentos no exceden la longitud esperada por tolerancia", () => {
    const r = 50;
    const pts = sampleArc({ x: r, y: 0 }, { x: 0, y: r }, r, r, 0, false, true, 0.1);
    for (let i = 1; i < pts.length; i++) {
      // Para un arco de radio r con tolerancia t, la longitud de cuerda es ~sqrt(8*r*t).
      expect(dist(pts[i - 1], pts[i])).toBeLessThanOrEqual(10);
    }
  });
});
