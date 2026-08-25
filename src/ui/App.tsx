import { FileDrop } from "./components/FileDrop";
import { SvgPreview2D } from "./components/SvgPreview2D";
import { ParameterPanel } from "./components/ParameterPanel";
import { ViewerPlaceholder } from "./components/ViewerPlaceholder";
import { useProjectStore, type ProjectStatus } from "./state/projectStore";
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
 * (carga + vista previa + parámetros) y área de visor 3D.
 */
export function App() {
  const status = useProjectStore((s) => s.status);

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
        </aside>
        <ViewerPlaceholder />
      </div>
    </div>
  );
}
