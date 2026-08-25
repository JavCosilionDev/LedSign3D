import { describe, it, expect } from "vitest";
import { flattenPathData } from "./pathDataParser";
import { signedArea } from "../../domain/value-objects/GeometryUtils";

describe("flattenPathData", () => {
  it("parsea un cuadrado con comandos M/L/Z", () => {
    const polys = flattenPathData("M 0 0 L 10 0 L 10 10 L 0 10 Z", 0.1);
    expect(polys).toHaveLength(1);
    expect(polys[0].isClosed).toBe(true);
    expect(polys[0].points.length).toBeGreaterThanOrEqual(4);
    expect(signedArea(polys[0])).toBeCloseTo(100, 6);
  });

  it("cierra un subcamino abierto sin Z", () => {
    const polys = flattenPathData("M 0 0 L 10 0 L 10 10 L 0 10", 0.1);
    expect(polys).toHaveLength(1);
    expect(polys[0].isClosed).toBe(true);
    expect(signedArea(polys[0])).toBeCloseTo(100, 6);
  });

  it("maneja repetición implícita de argumentos (L)", () => {
    const polys = flattenPathData("M 0 0 L 10 0 10 10 0 10 Z", 0.1);
    expect(polys).toHaveLength(1);
    expect(signedArea(polys[0])).toBeCloseTo(100, 6);
  });

  it("interpreta comandos relativos (m/l/z)", () => {
    const polys = flattenPathData("m 0 0 l 10 0 l 0 10 l -10 0 z", 0.1);
    expect(polys).toHaveLength(1);
    expect(signedArea(polys[0])).toBeCloseTo(100, 6);
  });

  it("convierte un círculo de dos arcos en una polilínea cerrada", () => {
    const r = 50;
    const d = `M ${r} 0 A ${r} ${r} 0 1 0 ${-r} 0 A ${r} ${r} 0 1 0 ${r} 0 Z`;
    const polys = flattenPathData(d, 0.1);
    expect(polys).toHaveLength(1);
    const pts = polys[0].points;
    expect(pts.length).toBeGreaterThan(30);
    for (const p of pts) {
      const dist = Math.hypot(p.x, p.y);
      expect(Math.abs(dist - r)).toBeLessThanOrEqual(0.11);
    }
    // Área esperada π·r².
    expect(Math.abs(signedArea(polys[0]))).toBeCloseTo(Math.PI * r * r, 0);
  });

  it("extrae múltiples subcaminos (M separados) como polígonos independientes", () => {
    const polys = flattenPathData(
      "M 0 0 L 5 0 L 5 5 L 0 5 Z M 10 10 L 15 10 L 15 15 L 10 15 Z",
      0.1,
    );
    expect(polys).toHaveLength(2);
    expect(Math.abs(signedArea(polys[0]))).toBeCloseTo(25, 6);
    expect(Math.abs(signedArea(polys[1]))).toBeCloseTo(25, 6);
  });

  it("lanza error con un comando no soportado", () => {
    expect(() => flattenPathData("M 0 0 X 5 5", 0.1)).toThrow();
  });

  it("lanza error si faltan argumentos", () => {
    expect(() => flattenPathData("M 0", 0.1)).toThrow();
  });
});
