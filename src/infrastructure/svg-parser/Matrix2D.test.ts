import { describe, it, expect } from "vitest";
import { Matrix2D, parseTransform } from "./Matrix2D";

describe("Matrix2D", () => {
  it("identidad no cambia el punto", () => {
    const p = Matrix2D.identity().apply({ x: 3, y: -2 });
    expect(p).toEqual({ x: 3, y: -2 });
  });

  it("translate desplaza el punto", () => {
    const p = Matrix2D.translate(10, -5).apply({ x: 1, y: 1 });
    expect(p).toEqual({ x: 11, y: -4 });
  });

  it("scale escala el punto", () => {
    const p = Matrix2D.scale(2, 3).apply({ x: 4, y: 5 });
    expect(p).toEqual({ x: 8, y: 15 });
  });

  it("scale con un solo argumento escala uniformemente", () => {
    const p = Matrix2D.scale(2, 2).apply({ x: 4, y: 5 });
    expect(p).toEqual({ x: 8, y: 10 });
  });

  it("rotate(90) mapea (1,0) a (0,1) en la convención SVG", () => {
    const p = Matrix2D.rotate(90).apply({ x: 1, y: 0 });
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.y).toBeCloseTo(1, 6);
  });

  it("multiply aplica primero el operando derecho", () => {
    const m = Matrix2D.translate(10, 0).multiply(Matrix2D.scale(2, 2));
    // p' = translate(scale(p)): (1,1) -> scale -> (2,2) -> translate -> (12,2)
    const p = m.apply({ x: 1, y: 1 });
    expect(p).toEqual({ x: 12, y: 2 });
  });

  it("rotar alrededor de un centro dado", () => {
    // El punto (5,0) está por encima del centro (5,5); al rotar 90° (sentido
    // horario visual en SVG) queda a la derecha del centro.
    const rot = parseTransform("rotate(90 5 5)");
    const p = rot.apply({ x: 5, y: 0 });
    expect(p.x).toBeCloseTo(10, 6);
    expect(p.y).toBeCloseTo(5, 6);
  });
});

describe("parseTransform", () => {
  it("devuelve identidad para valores vacíos", () => {
    expect(parseTransform(null).a).toBe(1);
    expect(parseTransform("").d).toBe(1);
  });

  it("parsea una lista combinada en orden", () => {
    const m = parseTransform("translate(10, 0) scale(2)");
    const p = m.apply({ x: 1, y: 1 });
    expect(p.x).toBeCloseTo(12, 6);
    expect(p.y).toBeCloseTo(2, 6);
  });

  it("parsea matrix(a b c d e f)", () => {
    const m = parseTransform("matrix(1 0 0 1 7 8)");
    expect(m.apply({ x: 1, y: 1 })).toEqual({ x: 8, y: 9 });
  });

  it("parsea skewX y skewY", () => {
    const m = parseTransform("skewX(45)");
    const p = m.apply({ x: 0, y: 1 });
    expect(p.x).toBeCloseTo(1, 6);
    expect(p.y).toBeCloseTo(1, 6);
  });

  it("ignora funciones desconocidas", () => {
    const m = parseTransform("bogus(1) translate(3, 4)");
    expect(m.apply({ x: 0, y: 0 })).toEqual({ x: 3, y: 4 });
  });
});
