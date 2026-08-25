import { describe, it, expect, beforeAll } from "vitest";
import { ManifoldEngine } from "./manifoldEngine";
import { signedArea } from "../../domain/value-objects/GeometryUtils";
import type { OffsetShapeInput } from "../../domain/ports/IOffsetService";

function squareShape(size: number): OffsetShapeInput {
  const h = size / 2;
  return {
    outer: {
      isClosed: true,
      points: [
        { x: -h, y: -h },
        { x: h, y: -h },
        { x: h, y: h },
        { x: -h, y: h },
      ],
    },
    holes: [],
  };
}

function squareWithHole(size: number, hole: number): OffsetShapeInput {
  const h = size / 2;
  const hh = hole / 2;
  return {
    outer: {
      isClosed: true,
      points: [
        { x: -h, y: -h },
        { x: h, y: -h },
        { x: h, y: h },
        { x: -h, y: h },
      ],
    },
    holes: [
      {
        isClosed: true,
        points: [
          { x: -hh, y: -hh },
          { x: -hh, y: hh },
          { x: hh, y: hh },
          { x: hh, y: -hh },
        ],
      },
    ],
  };
}

describe("ManifoldEngine", () => {
  beforeAll(async () => {
    await ManifoldEngine.init();
  });

  const engine = new ManifoldEngine();

  it("extruye un cuadrado y produce un sólido watertight", async () => {
    const mesh = await engine.extrude(squareShape(20), 10);
    expect(mesh.triangleCount).toBeGreaterThan(0);
    // Volumen = área (400) × altura (10).
    expect(mesh.volume).toBeCloseTo(4000, 3);
    // Cada triángulo referencia 3 vértices válidos.
    expect(mesh.triangles.length).toBe(mesh.triangleCount * 3);
    const maxIndex = Math.max(...mesh.triangles);
    expect(maxIndex).toBeLessThan(mesh.vertices.length / 3);
  });

  it("extruye un cuadrado con agujero (resta de volumen)", async () => {
    const mesh = await engine.extrude(squareWithHole(20, 10), 10);
    // Volumen = (400 − 100) × 10.
    expect(mesh.volume).toBeCloseTo(3000, 3);
    expect(mesh.triangleCount).toBeGreaterThan(0);
  });

  it("extruye un círculo muestreado sin errores", async () => {
    const points = [];
    const r = 50;
    const segments = 128;
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
    const polygon = { isClosed: true, points };
    const mesh = await engine.extrude({ outer: polygon, holes: [] }, 3);
    // Volumen = área del polígono (inscrito) × altura.
    expect(mesh.volume).toBeCloseTo(Math.abs(signedArea(polygon)) * 3, 0);
  });

  it("lanza error con altura <= 0", async () => {
    await expect(engine.extrude(squareShape(10), 0)).rejects.toThrow();
  });
});
