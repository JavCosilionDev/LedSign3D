import { describe, it, expect } from "vitest";
import { assemblyPlacements, layoutAssemblies } from "./assemblyPlacement";
import type { Assembly } from "../../domain/entities/Assembly";
import type { Mesh3D } from "../../domain/ports/IGeometryEngine";

/** Malla caja simple con rango Z controlado (solo se usan los vértices). */
function boxMesh(zBase: number, height: number, width = 10): Mesh3D {
  const h = width / 2;
  const vertices = new Float32Array([
    -h,
    -h,
    zBase,
    h,
    -h,
    zBase,
    h,
    h,
    zBase,
    -h,
    h,
    zBase,
    -h,
    -h,
    zBase + height,
    h,
    -h,
    zBase + height,
    h,
    h,
    zBase + height,
    -h,
    h,
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

describe("layoutAssemblies", () => {
  it("coloca un único ensamblaje al inicio y calcula sus dimensiones", () => {
    const assembly: Assembly = {
      contourId: "c1",
      base: { type: "base", contourId: "c1", mesh: boxMesh(0, 10, 20) },
    };
    const layout = layoutAssemblies([assembly]);
    expect(layout.items).toHaveLength(1);
    expect(layout.items[0].xOffset).toBe(0);
    expect(layout.width).toBe(20);
    expect(layout.depth).toBe(20);
    expect(layout.height).toBe(10);
  });

  it("coloca ensamblajes en fila con separación y sin superponerse", () => {
    const a: Assembly = {
      contourId: "a",
      base: { type: "base", contourId: "a", mesh: boxMesh(0, 10, 20) },
    };
    const b: Assembly = {
      contourId: "b",
      base: { type: "base", contourId: "b", mesh: boxMesh(0, 10, 30) },
    };
    const layout = layoutAssemblies([a, b]);

    expect(layout.items).toHaveLength(2);
    expect(layout.items[0].xOffset).toBe(0);
    // Segundo ensamblaje: 20 (ancho del primero) + 10 (hueco).
    expect(layout.items[1].xOffset).toBe(30);
    // Anchura total = 20 + 10 + 30.
    expect(layout.width).toBe(60);
  });

  it("devuelve un layout vacío sin ensamblajes", () => {
    const layout = layoutAssemblies([]);
    expect(layout.items).toEqual([]);
    expect(layout.width).toBe(0);
  });
});
