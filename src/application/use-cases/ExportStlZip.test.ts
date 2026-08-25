import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { ExportStlZip } from "./ExportStlZip";
import { StlExporter } from "../../infrastructure/exporters/StlExporter";
import { JsZipZipExporter } from "../../infrastructure/exporters/JsZipZipExporter";
import type { Assembly } from "../../domain/entities/Assembly";
import type { Contour } from "../../domain/entities/Contour";
import type { Mesh3D } from "../../domain/ports/IGeometryEngine";

function mesh(): Mesh3D {
  return {
    vertices: new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0]),
    triangles: new Uint32Array([0, 1, 2]),
    volume: 1,
    triangleCount: 1,
  };
}

const contours: Contour[] = [
  {
    id: "contour-1",
    name: "forma-1",
    outer: { isClosed: true, points: [{ x: 0, y: 0 }] },
    holes: [],
    boundingBox: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
  },
];

const assemblies: Assembly[] = [
  {
    contourId: "contour-1",
    base: { type: "base", contourId: "contour-1", mesh: mesh() },
    tapa: { type: "tapa", contourId: "contour-1", mesh: mesh() },
    panelDifusor: { type: "panel-difusor", contourId: "contour-1", mesh: mesh() },
  },
];

describe("ExportStlZip", () => {
  const exporter = new ExportStlZip({
    stl: new StlExporter(),
    zip: new JsZipZipExporter(),
  });

  it("genera un ZIP con las tres subcarpetas por tipo", async () => {
    const blob = await exporter.execute(contours, assemblies);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const paths = Object.keys(zip.files).filter((p) => !zip.files[p].dir);

    expect(paths).toEqual(
      expect.arrayContaining(["base/forma-1.stl", "tapa/forma-1.stl", "panel-difusor/forma-1.stl"]),
    );
    // Contenido STL binario: tamaño mínimo 84 + 50 por triángulo.
    const stl = await zip.file("base/forma-1.stl")!.async("arraybuffer");
    expect(stl.byteLength).toBe(84 + 50);
  });

  it("exporta en ASCII si se solicita", async () => {
    const blob = await exporter.execute(contours, assemblies, { format: "ascii" });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const text = await zip.file("tapa/forma-1.stl")!.async("text");
    expect(text).toContain("solid forma-1_tapa");
  });

  it("lanza error si no hay piezas con malla", async () => {
    await expect(exporter.execute(contours, [{ contourId: "contour-1" }])).rejects.toThrow(
      /No hay piezas/,
    );
  });
});
