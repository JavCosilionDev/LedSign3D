/** Archivo de un ZIP de exportación (ruta + contenido). */
export interface ZipFile {
  readonly path: string;
  readonly data: Blob;
}

/** Puente de dominio para generar un archivo ZIP a partir de archivos. */
export interface IZipExporter {
  createZip(files: readonly ZipFile[]): Promise<Blob>;
}
