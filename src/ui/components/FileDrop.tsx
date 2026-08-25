import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useProjectStore } from "../state/projectStore";

const MAX_SVG_BYTES = 10 * 1024 * 1024; // 10 MB (plan v0.1 §12)

/** Zona de carga del SVG por arrastrar-soltar o selección de archivo. */
export function FileDrop() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragover, setDragover] = useState(false);
  const setSvgSource = useProjectStore((s) => s.setSvgSource);
  const fileName = useProjectStore((s) => s.fileName);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_SVG_BYTES) {
        console.error(`El archivo supera el límite de ${MAX_SVG_BYTES / 1024 / 1024} MB`);
        return;
      }
      const text = await file.text();
      setSvgSource(text, file.name);
    },
    [setSvgSource],
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragover(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  return (
    <section className="sidebar-section">
      <h2>SVG</h2>
      <div
        className={`filedrop${dragover ? " dragover" : ""}${fileName ? " has-file" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragover(true);
        }}
        onDragLeave={() => setDragover(false)}
        onDrop={onDrop}
        aria-label="Cargar archivo SVG"
      >
        <div>{fileName ? `✓ ${fileName}` : "Arrastra tu SVG aquí"}</div>
        <div className="hint">o haz clic para seleccionar (máx. 10 MB)</div>
        <input ref={inputRef} type="file" accept=".svg,image/svg+xml" onChange={onChange} />
      </div>
    </section>
  );
}
