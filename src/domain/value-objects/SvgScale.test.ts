import { describe, it, expect } from "vitest";
import { computeSvgScale, applySvgScale } from "./SvgScale";
import type { Contour } from "../entities/Contour";

function contourWithBBox(minX: number, minY: number, maxX: number, maxY: number): Contour {
  return {
    id: "c",
    name: "forma",
    outer: {
      isClosed: true,
      points: [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
      ],
    },
    holes: [],
    boundingBox: { minX, minY, maxX, maxY },
  };
}

describe("computeSvgScale", () => {
  it("escala un SVG pequeño hasta la dimensión máxima configurada", () => {
    const info = computeSvgScale([contourWithBBox(0, 0, 20, 10)], 50);
    expect(info.scale).toBeCloseTo(2.5, 6);
    expect(info.maxDimension).toBeCloseTo(50, 6);
    expect(info.width).toBeCloseTo(50, 6);
    expect(info.height).toBeCloseTo(25, 6);
  });

  it("no encoge un SVG que ya supera el mínimo", () => {
    const info = computeSvgScale([contourWithBBox(0, 0, 100, 50)], 50);
    expect(info.scale).toBe(1);
    expect(info.maxDimension).toBe(100);
    expect(info.width).toBe(100);
    expect(info.height).toBe(50);
  });

  it("escala un SVG grande hacia arriba si el objetivo es mayor", () => {
    const info = computeSvgScale([contourWithBBox(0, 0, 100, 50)], 200);
    expect(info.scale).toBeCloseTo(2, 6);
    expect(info.maxDimension).toBeCloseTo(200, 6);
    expect(info.width).toBeCloseTo(200, 6);
  });

  it("usa el bounding box conjunto de todos los contornos", () => {
    const contours = [contourWithBBox(0, 0, 10, 10), contourWithBBox(100, 0, 110, 10)];
    const info = computeSvgScale(contours, 50);
    // La dimensión más larga conjunta es 110 → ya supera 50 → sin escala.
    expect(info.scale).toBe(1);
    expect(info.width).toBe(110);
  });

  it("devuelve escala 1 y dimensiones 0 sin contornos", () => {
    const info = computeSvgScale([], 50);
    expect(info.scale).toBe(1);
    expect(info.width).toBe(0);
    expect(info.height).toBe(0);
  });
});

describe("applySvgScale", () => {
  it("devuelve los mismos contornos cuando la escala es 1", () => {
    const contours = [contourWithBBox(0, 0, 100, 50)];
    const result = applySvgScale(contours, 50);
    expect(result.contours).toEqual(contours);
    expect(result.info.scale).toBe(1);
  });

  it("escala puntos, agujeros y bounding box", () => {
    const contour: Contour = {
      id: "c",
      name: "forma",
      outer: {
        isClosed: true,
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
        ],
      },
      holes: [
        {
          isClosed: true,
          points: [
            { x: 2, y: 2 },
            { x: 4, y: 2 },
            { x: 4, y: 4 },
          ],
        },
      ],
      boundingBox: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
    };

    const result = applySvgScale([contour], 50);
    expect(result.info.scale).toBe(5);
    const scaled = result.contours[0];
    expect(scaled.outer.points[1]).toEqual({ x: 50, y: 0 });
    expect(scaled.holes[0].points[0]).toEqual({ x: 10, y: 10 });
    expect(scaled.boundingBox).toEqual({ minX: 0, minY: 0, maxX: 50, maxY: 50 });
  });
});
