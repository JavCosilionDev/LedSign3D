import { describe, it, expect } from "vitest";
import { shapeToPath } from "./shapesToPath";
import { flattenPathData } from "./pathDataParser";
import { signedArea } from "../../domain/value-objects/GeometryUtils";

function areaOf(tag: string, attrs: Record<string, string>): number {
  const d = shapeToPath(tag, attrs);
  if (!d) return 0;
  return Math.abs(signedArea(flattenPathData(d, 0.1)[0]));
}

describe("shapeToPath", () => {
  it("convierte un path usando su atributo d", () => {
    expect(shapeToPath("path", { d: "M0 0 L5 0 Z" })).toBe("M0 0 L5 0 Z");
  });

  it("convierte un rect en un polígono cerrado", () => {
    const d = shapeToPath("rect", { x: "0", y: "0", width: "10", height: "5" });
    expect(d).toBeDefined();
    expect(areaOf("rect", { x: "0", y: "0", width: "10", height: "5" })).toBeCloseTo(50, 6);
  });

  it("convierte un rect con esquinas redondeadas", () => {
    const d = shapeToPath("rect", { x: "0", y: "0", width: "10", height: "10", rx: "2" });
    expect(d).toContain("A");
    // Área de un cuadrado de 10 menos las 4 esquinas redondeadas.
    const area = areaOf("rect", { x: "0", y: "0", width: "10", height: "10", rx: "2" });
    expect(area).toBeGreaterThan(80);
    expect(area).toBeLessThan(100);
  });

  it("convierte un circle en dos arcos", () => {
    const d = shapeToPath("circle", { cx: "0", cy: "0", r: "5" });
    expect(d).toContain("A");
    const area = areaOf("circle", { cx: "0", cy: "0", r: "5" });
    expect(area).toBeCloseTo(Math.PI * 25, 0);
  });

  it("convierte un ellipse", () => {
    const area = areaOf("ellipse", { cx: "0", cy: "0", rx: "10", ry: "4" });
    expect(area).toBeCloseTo(Math.PI * 40, 0);
  });

  it("convierte un polygon", () => {
    const area = areaOf("polygon", { points: "0,0 4,0 4,4 0,4" });
    expect(area).toBeCloseTo(16, 6);
  });

  it("incluye polyline solo si está cerrada", () => {
    const closed = shapeToPath("polyline", { points: "0,0 4,0 4,4 0,4 0,0" });
    const open = shapeToPath("polyline", { points: "0,0 4,0 4,4" });
    expect(closed).toBeDefined();
    expect(open).toBeNull();
  });

  it("ignora line y etiquetas desconocidas", () => {
    expect(shapeToPath("line", { x1: "0", y1: "0", x2: "5", y2: "5" })).toBeNull();
    expect(shapeToPath("text", {})).toBeNull();
  });
});
