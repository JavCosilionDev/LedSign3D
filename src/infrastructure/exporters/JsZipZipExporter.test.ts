import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { JsZipZipExporter } from "./JsZipZipExporter";
import type { ZipFile } from "../../domain/ports/IZipExporter";

describe("JsZipZipExporter", () => {
  it("genera un ZIP con las rutas indicadas", async () => {
    const files: ZipFile[] = [
      { path: "base/forma-1.stl", data: new Blob(["abc"], { type: "model/stl" }) },
      { path: "tapa/forma-1.stl", data: new Blob(["def"], { type: "model/stl" }) },
    ];
    const exporter = new JsZipZipExporter();
    const blob = await exporter.createZip(files);
    expect(blob.type).toBe("application/zip");

    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(Object.keys(zip.files)).toEqual(
      expect.arrayContaining(["base/forma-1.stl", "tapa/forma-1.stl"]),
    );
    expect(await zip.file("base/forma-1.stl")!.async("text")).toBe("abc");
    expect(await zip.file("tapa/forma-1.stl")!.async("text")).toBe("def");
  });
});
