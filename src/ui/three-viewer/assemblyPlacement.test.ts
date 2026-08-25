import { describe, it, expect } from "vitest";
import { assemblyPlacements } from "./assemblyPlacement";
import type { Assembly } from "../../domain/entities/Assembly";
import type { Mesh3D } from "../../domain/ports/IGeometryEngine";

/** Malla caja simple con rango Z controlado (solo se usan los vértices). */
function boxMesh(zBase: number, height: number): Mesh3D {
  const vertices = new Float32Array([
    0,
    0,
    zBase,
    10,
    0,
    zBase,
    10,
    10,
    zBase,
    0,
    10,
    zBase,
    0,
    0,
    zBase + height,
    10,
    0,
    zBase + height,
    10,
    10,
    zBase + height,
    0,
    10,
    zBase + height,
  ]);
  const triangles = new Uint32Array([0, 1, 2, 0, 2, 3]);
  return { vertices, triangles, volume: 100 * height, triangleCount: 2 };
}

describe("assemblyPlacements", () => {
  it("apila base, tapa y panel en vertical sin huecos", () => {
    const assembly: Assembly = {
      contourId: "c1",
      base: { type: "base", contourId: "c1", mesh: boxMesh(0, 10) },
      // Tapa con labio por debajo del origen local (minZ < 0).
      tapa: { type: "tapa", contourId: "c1", mesh: boxMesh(-2, 10) },
      panelDifusor: { type: "panel-difusor", contourId: "c1", mesh: boxMesh(0, 3) },
    };

    const placements = assemblyPlacements(assembly);
    expect(placements).toHaveLength(3);

    // Base: arranca en 0.
    expect(placements[0].zOffset).toBeCloseTo(0);
    // Tapa: su minZ (-2) debe coincidir con el tope de la base (10).
    expect(placements[1].zOffset).toBeCloseTo(12);
    // Panel: su minZ (0) debe coincidir con el tope de la tapa (12 + 8 = 20).
    expect(placements[2].zOffset).toBeCloseTo(20);
  });

  it("ignora piezas sin malla", () => {
    const assembly: Assembly = { contourId: "c1", base: { type: "base", contourId: "c1" } };
    expect(assemblyPlacements(assembly)).toEqual([]);
  });
});
