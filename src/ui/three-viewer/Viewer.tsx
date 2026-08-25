import { useEffect, useRef } from "react";
import { useProjectStore } from "../state/projectStore";
import { ViewerScene } from "./ViewerScene";

/**
 * Visor 3D en tiempo real. Monta la escena Three.js (una sola vez) y la
 * mantiene sincronizada con los ensamblajes del store del proyecto.
 */
export function Viewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ViewerScene | null>(null);
  const assemblies = useProjectStore((s) => s.assemblies);
  const status = useProjectStore((s) => s.status);
  const error = useProjectStore((s) => s.error);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const scene = new ViewerScene();
    scene.init(container);
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setAssemblies(assemblies);
  }, [assemblies]);

  return (
    <main className="viewer">
      <div ref={containerRef} className="viewer-canvas" />
      {status === "empty" && (
        <div className="viewer-overlay">
          <div className="icon">🧱</div>
          <p>
            <strong>Carga un SVG para empezar</strong>
          </p>
          <p className="hint">
            La vista 3D muestra el ensamblaje completo (base, tapa y panel difusor).
          </p>
        </div>
      )}
      {status === "generating" && (
        <div className="viewer-overlay">
          <div className="spinner" aria-label="Generando modelo" />
          <p>
            <strong>Generando piezas…</strong>
          </p>
        </div>
      )}
      {status === "error" && error && (
        <div className="viewer-overlay">
          <div className="error-box">{error}</div>
        </div>
      )}
    </main>
  );
}
