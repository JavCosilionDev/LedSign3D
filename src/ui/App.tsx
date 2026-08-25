import { useEffect, useMemo } from "react";
import { FileDrop } from "./components/FileDrop";
import { SvgPreview2D } from "./components/SvgPreview2D";
import { ParameterPanel } from "./components/ParameterPanel";
import { ExportPanel } from "./components/ExportPanel";
import { Viewer } from "./three-viewer/Viewer";
import { GeometryWorkerGateway } from "../infrastructure/workers/GeometryWorkerGateway";
import { StlExporter } from "../infrastructure/exporters/StlExporter";
import { JsZipZipExporter } from "../infrastructure/exporters/JsZipZipExporter";
import { ExportStlZip } from "../application/use-cases/ExportStlZip";
import { useProjectStore, type ProjectStatus } from "./state/projectStore";
import { useModelPipeline } from "./state/useModelPipeline";
import "./styles.css";

const STATUS_CLASS: Record<ProjectStatus, string> = {
  empty: "",
  parsing: "parsing",
  generating: "generating",
  ready: "ready",
  error: "error",
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  empty: "Sin proyecto",
  parsing: "Procesando",
  generating: "Generando",
  ready: "Listo",
  error: "Error",
};

/**
 * Layout principal de la aplicación: barra superior, panel lateral
 * (carga + vista previa + parámetros) y visor 3D.
 */
export function App() {
  const status = useProjectStore((s) => s.status);

  const gateway = useMemo(() => new GeometryWorkerGateway(), []);
  useEffect(() => () => gateway.dispose(), [gateway]);
  useModelPipeline(gateway);

  const exporter = useMemo(
    () => new ExportStlZip({ stl: new StlExporter(), zip: new JsZipZipExporter() }),
    [],
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>LEDSign3D</h1>
        <span className="subtitle">SVG → letrero LED 3D</span>
        <span style={{ flex: 1 }} />
        <span className={`status-badge ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
      </header>
      <div className="app-body">
        <aside className="sidebar">
          <FileDrop />
          <SvgPreview2D />
          <ParameterPanel />
          <ExportPanel exporter={exporter} />
        </aside>
        <Viewer />
      </div>
    </div>
  );
}
