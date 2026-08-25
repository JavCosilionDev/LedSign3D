import { useProjectStore, type ProjectStatus } from "../state/projectStore";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  empty: "Sin proyecto",
  parsing: "Procesando SVG…",
  generating: "Generando piezas…",
  ready: "Listo",
  error: "Error",
};

/** Área principal donde la Fase 3 montará el visor Three.js. */
export function ViewerPlaceholder() {
  const status = useProjectStore((s) => s.status);
  const error = useProjectStore((s) => s.error);

  return (
    <main className="viewer">
      <div className="viewer-empty">
        <div className="icon">🧱</div>
        <p>
          <strong>{STATUS_LABEL[status]}</strong>
        </p>
        {status === "empty" && (
          <p>
            Carga un SVG para empezar. La vista 3D en tiempo real llegará con el motor de
            renderizado.
          </p>
        )}
        {status === "error" && error && <div className="error-box">{error}</div>}
      </div>
    </main>
  );
}
