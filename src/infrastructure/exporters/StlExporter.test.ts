import { describe, it, expect } from "vitest";
import { StlExporter } from "./StlExporter";
import type { Mesh3D } from "../../domain/ports/IGeometryEngine";

const TETRA: Mesh3D = {
  vertices: new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10]),
  triangles: new Uint32Array([0, 2, 1, 0, 1, 3, 1, 2, 3, 2, 0, 3]),
  volume: 100,
  triangleCount: 4,
};

describe("StlExporter", () => {
  const exporter = new StlExporter();

  it("genera STL binario con cabecera y cuenta de triángulos correctas", async () => {
    const blob = exporter.exportMesh(TETRA, { name: "pieza" });
    expect(blob.type).toBe("model/stl");
    const bytes = new Uint8Array(await blob.arrayBuffer());

    expect(bytes.length).toBe(84 + 4 * 50);
    // Cabecera de 80 bytes con el nombre.
    const header = new TextDecoder().decode(bytes.slice(0, 80));
    expect(header.startsWith("pieza")).toBe(true);
    // Cuenta de triángulos (uint32 LE).
    const view = new DataView(bytes.buffer);
    expect(view.getUint32(80, true)).toBe(4);
  });

  it("genera STL ASCII con solid/endsolid y las 4 facetas", async () => {
    const blob = exporter.exportMesh(TETRA, { format: "ascii", name: "pieza" });
    const text = await blob.text();

    expect(text).toContain("solid pieza");
    expect(text).toContain("endsolid pieza");
    expect(text).toContain("facet normal");
    expect(text.match(/facet normal/g)).toHaveLength(4);
    expect(text.match(/vertex /g)).toHaveLength(12);
  });

  it("la normal de la primera faceta está normalizada", async () => {
    const blob = exporter.exportMesh(TETRA, { format: "ascii" });
    const text = await blob.text();
    const first = text.match(/facet normal ([^\n]+)/)?.[1];
    const [x, y, z] = first!.split(" ").map(Number);
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 3);
  });
});
