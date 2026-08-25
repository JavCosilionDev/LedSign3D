import type { Assembly } from "../../domain/entities/Assembly";
import { assemblyParts } from "../../domain/entities/Assembly";
import type { Contour } from "../../domain/entities/Contour";
import { PART_FOLDER } from "../../domain/entities/Part";
import type { IStlExporter, StlFormat } from "../../domain/ports/IStlExporter";
import type { IZipExporter, ZipFile } from "../../domain/ports/IZipExporter";

export interface ExportStlZipDeps {
  readonly stl: IStlExporter;
  readonly zip: IZipExporter;
}

export interface ExportStlZipOptions {
  readonly format?: StlFormat;
}

/**
 * Exporta los ensamblajes a un ZIP con un STL por pieza, organizado en
 * subcarpetas por tipo: `base/{forma}.stl`, `tapa/{forma}.stl`,
 * `panel-difusor/{forma}.stl` (plan v0.1 §9).
 */
export class ExportStlZip {
  constructor(private readonly deps: ExportStlZipDeps) {}

  async execute(
    contours: readonly Contour[],
    assemblies: readonly Assembly[],
    options: ExportStlZipOptions = {},
  ): Promise<Blob> {
    const nameByContour = new Map(contours.map((c) => [c.id, c.name]));
    const files: ZipFile[] = [];

    for (const assembly of assemblies) {
      const baseName = nameByContour.get(assembly.contourId) ?? assembly.contourId;
      for (const part of assemblyParts(assembly)) {
        if (!part.mesh) continue;
        const stl = this.deps.stl.exportMesh(part.mesh, {
          format: options.format,
          name: `${baseName}_${part.type}`,
        });
        files.push({ path: `${PART_FOLDER[part.type]}/${baseName}.stl`, data: stl });
      }
    }

    if (files.length === 0) {
      throw new Error("No hay piezas para exportar");
    }

    return this.deps.zip.createZip(files);
  }
}
