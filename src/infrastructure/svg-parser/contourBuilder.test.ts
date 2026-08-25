import { describe, it, expect } from "vitest";
import { buildContours } from "./contourBuilder";
import { signedArea } from "../../domain/value-objects/GeometryUtils";
import type { Polygon2D } from "../../domain/value-objects/Polygon2D";

function rect(x0: number, y0: number, x1: number, y1: number, cw = false): Polygon2D {
  const pts = cw
    ? [
        { x: x0, y: y0 },
        { x: x0, y: y1 },
        { x: x1, y: y1 },
        { x: x1, y: y0 },
      ]
    : [
        { x: x0, y: y0 },
        { x: x1, y: y0 },
        { x: x1, y: y1 },
        { x: x0, y: y1 },
      ];
  return { points: pts, isClosed: true };
}

describe("buildContours", () => {
  it("crea un contorno a partir de un único polígono", () => {
    const contours = buildContours([rect(0, 0, 10, 10)]);
    expect(contours).toHaveLength(1);
    expect(contours[0].holes).toHaveLength(0);
    expect(contours[0].boundingBox.maxX).toBe(10);
  });

  it("agrupa exterior + agujero en un único contorno", () => {
    const contours = buildContours([rect(0, 0, 100, 100), rect(30, 30, 70, 70)]);
    expect(contours).toHaveLength(1);
    expect(contours[0].holes).toHaveLength(1);
  });

  it("normaliza la orientación (exterior CCW, agujeros CW)", () => {
    const contours = buildContours([rect(0, 0, 100, 100, true), rect(30, 30, 70, 70)]);
    expect(contours).toHaveLength(1);
    expect(signedArea(contours[0].outer)).toBeGreaterThan(0);
    expect(signedArea(contours[0].holes[0])).toBeLessThan(0);
  });

  it("crea un contorno por cada forma separada", () => {
    const contours = buildContours([rect(0, 0, 10, 10), rect(50, 50, 60, 60)]);
    expect(contours).toHaveLength(2);
  });

  it("trata una isla dentro de un agujero como contorno independiente", () => {
    const contours = buildContours([
      rect(0, 0, 100, 100), // exterior
      rect(30, 30, 70, 70), // agujero
      rect(40, 40, 60, 60), // isla (rellena) dentro del agujero
    ]);
    expect(contours).toHaveLength(2);
    const withHole = contours.find((c) => c.holes.length === 1);
    const island = contours.find((c) => c.holes.length === 0);
    expect(withHole).toBeDefined();
    expect(island).toBeDefined();
  });

  it("descarta polígonos degenerados", () => {
    const degenerate: Polygon2D = {
      points: [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 0, y: 0 },
      ],
      isClosed: true,
    };
    expect(buildContours([degenerate])).toHaveLength(0);
  });
});
