import { useState } from "react";
import type { StlFormat } from "../../domain/ports/IStlExporter";
import type { ExportStlZip } from "../../application/use-cases/ExportStlZip";
import { useProjectStore } from "../state/projectStore";
import { downloadBlob, slugify, toErrorMessage } from "../utils/download";

/**
 * Panel de exportación: selección de formato STL (binario/ASCII) y
 * descarga del ZIP organizado por tipo de pieza.
 */
export function ExportPanel({ exporter }: { exporter: Pick<ExportStlZip, "execute"> }) {
  const status = useProjectStore((s) => s.status);
  const fileName = useProjectStore((s) => s.fileName);
  const contours = useProjectStore((s) => s.contours);
  const assemblies = useProjectStore((s) => s.assemblies);

  const [format, setFormat] = useState<StlFormat>("binary");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canExport = status === "ready" && assemblies.length > 0 && !exporting;

  const onExport = async () => {
    if (!canExport) return;
    setExporting(true);
    setError(null);
    try {
      const blob = await exporter.execute(contours, assemblies, { format });
      downloadBlob(blob, `${slugify(fileName ?? "ledsign3d")}.zip`);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="sidebar-section">
      <h2>Exportar</h2>
      <div className="export-row">
        <label className="export-label" htmlFor="stl-format">
          Formato STL
        </label>
        <select
          id="stl-format"
          className="export-select"
          value={format}
          onChange={(e) => setFormat(e.target.value as StlFormat)}
          disabled={!canExport}
        >
          <option value="binary">Binario</option>
          <option value="ascii">ASCII</option>
        </select>
      </div>
      <button
        type="button"
        className="export-btn"
        onClick={() => void onExport()}
        disabled={!canExport}
      >
        {exporting ? "Generando ZIP…" : "Exportar ZIP"}
      </button>
      <div className="export-hint">
        Descarga un STL por pieza en las carpetas base/, tapa/ y panel-difusor/.
      </div>
      {error && <div className="error-box">{error}</div>}
    </section>
  );
}
