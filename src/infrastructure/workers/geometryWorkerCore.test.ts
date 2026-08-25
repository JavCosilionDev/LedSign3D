import { describe, it, expect, beforeAll } from "vitest";
import { handleWorkerMessage, type WorkerRequest } from "./geometryWorkerCore";
import { ManifoldEngine } from "../geometry/manifoldEngine";
import { ProjectSettings } from "../../domain/value-objects/ProjectSettings";
import type { Contour } from "../../domain/entities/Contour";
import type { Polygon2D } from "../../domain/value-objects/Polygon2D";

function circleContour(r: number): Contour {
  const circle = (radius: number, n = 48): Polygon2D => {
    const points = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      points.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius });
    }
    return { points, isClosed: true };
  };
  return {
    id: "c1",
    name: "forma-1",
    outer: circle(r),
    holes: [],
    boundingBox: { minX: -r, minY: -r, maxX: r, maxY: r },
  };
}

describe("geometryWorkerCore", () => {
  beforeAll(async () => {
    await ManifoldEngine.init();
  });

  it("genera ensamblajes con las tres piezas watertight", async () => {
    const msg: WorkerRequest = {
      id: 1,
      type: "generate",
      contours: [circleContour(40)],
      settings: ProjectSettings.create().toJSON(),
    };
    const response = await handleWorkerMessage(msg);

    expect(response.type).toBe("result");
    if (response.type !== "result") return;

    expect(response.id).toBe(1);
    expect(response.assemblies).toHaveLength(1);
    const assembly = response.assemblies[0];
    for (const part of [assembly.base, assembly.tapa, assembly.panelDifusor]) {
      expect(part?.mesh).toBeDefined();
      expect(part?.mesh!.volume).toBeGreaterThan(0);
      expect(part?.metadata?.triangles).toBe(part?.mesh!.triangleCount);
    }
  });

  it("devuelve error serializado ante una entrada inválida (contorno colapsado)", async () => {
    // Cuadrado diminuto: el inset de las paredes lo colapsa → error controlado.
    const tiny: Contour = {
      id: "c-bad",
      name: "forma-bad",
      outer: {
        isClosed: true,
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 0, y: 1 },
        ],
      },
      holes: [],
      boundingBox: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
    };
    const msg: WorkerRequest = {
      id: 2,
      type: "generate",
      contours: [tiny],
      settings: ProjectSettings.create().toJSON(),
    };
    const response = await handleWorkerMessage(msg);
    expect(response.type).toBe("error");
  });
});
