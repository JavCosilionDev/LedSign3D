import type { IZipExporter, ZipFile } from "../../domain/ports/IZipExporter";

/**
 * Genera un ZIP (DEFLATE) a partir de archivos con rutas. Compatible con
 * navegador y Node (genera Uint8Array y lo envuelve en Blob).
 *
 * JSZip se importa dinámicamente: solo se carga cuando el usuario exporta
 * (el bundle inicial no lo incluye, plan v0.1 §7).
 */
export class JsZipZipExporter implements IZipExporter {
  async createZip(files: readonly ZipFile[]): Promise<Blob> {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    for (const file of files) {
      // JSZip no reconoce el Blob de Node como dato válido; se pasa el ArrayBuffer.
      zip.file(file.path, await file.data.arrayBuffer());
    }
    const output = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
    });
    // Copia en un Uint8Array respaldado por ArrayBuffer (compatible con Blob).
    return new Blob([new Uint8Array(output)], { type: "application/zip" });
  }
}
