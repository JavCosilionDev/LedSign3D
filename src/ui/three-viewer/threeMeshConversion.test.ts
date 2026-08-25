import { describe, it, expect } from "vitest";
import { toBufferGeometry } from "./threeMeshConversion";
import type { Mesh3D } from "../../domain/ports/IGeometryEngine";

const TETRA: Mesh3D = {
  vertices: new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10]),
  triangles: new Uint32Array([0, 2, 1, 0, 1, 3, 1, 2, 3, 2, 0, 3]),
  volume: 100,
  triangleCount: 4,
};

describe("toBufferGeometry", () => {
  it("crea una BufferGeometry con posiciones e índices correctos", () => {
    const geometry = toBufferGeometry(TETRA);
    const position = geometry.getAttribute("position");
    expect(position).toBeDefined();
    expect(position.count).toBe(4);
    expect(position.itemSize).toBe(3);
    expect(geometry.index?.count).toBe(12);
    // computeVertexNormals debe completar el atributo de normales.
    expect(geometry.getAttribute("normal")).toBeDefined();
    expect(geometry.getAttribute("normal").count).toBe(4);
  });
});
