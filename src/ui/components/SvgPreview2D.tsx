import { useMemo } from "react";
import { useProjectStore } from "../state/projectStore";

/**
 * Vista previa 2D del SVG importado.
 *
 * Se renderiza mediante un <img> con data URL: los scripts embebidos en el
 * SVG NO se ejecutan en ese contexto, manteniendo la seguridad (RNF-05) hasta
 * que la Fase 2 implemente la sanitización completa y el renderizado por
 * contornos.
 */
export function SvgPreview2D() {
  const svgSource = useProjectStore((s) => s.svgSource);

  const dataUrl = useMemo(() => {
    if (!svgSource) return null;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgSource)}`;
  }, [svgSource]);

  return (
    <section className="sidebar-section">
      <h2>Vista previa</h2>
      <div className="svg-preview">
        {dataUrl ? (
          <img src={dataUrl} className="svg-preview-img" alt="Vista previa del SVG cargado" />
        ) : (
          <span>Sin SVG cargado</span>
        )}
      </div>
    </section>
  );
}
