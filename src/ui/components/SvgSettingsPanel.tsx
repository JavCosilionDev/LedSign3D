import { useMemo } from "react";
import { computeSvgScale } from "../../domain/value-objects/SvgScale";
import { useProjectStore } from "../state/projectStore";
import { useSettingsStore } from "../state/settingsStore";
import { ParamControl } from "./ParamControl";

const SVG_MAX_DIMENSION = "svgMaxDimension" as const;

/**
 * Grupo "Configurar SVG": ajusta el tamaño máximo del letrero (dimensión más
 * larga del bounding box escalado, mínimo 50 mm) y muestra las dimensiones
 * resultantes en tiempo real.
 */
export function SvgSettingsPanel() {
  const settings = useSettingsStore((s) => s.settings);
  const setParam = useSettingsStore((s) => s.setParam);
  const contours = useProjectStore((s) => s.contours);

  const info = useMemo(
    () => computeSvgScale(contours, settings.get(SVG_MAX_DIMENSION)),
    [contours, settings],
  );

  const hasContours = contours.length > 0;
  const scaledUp = hasContours && info.scale > 1.0001;

  return (
    <section className="sidebar-section">
      <h2>Configurar SVG</h2>
      <ParamControl
        id={SVG_MAX_DIMENSION}
        value={settings.get(SVG_MAX_DIMENSION)}
        onChange={(value) => setParam(SVG_MAX_DIMENSION, value)}
      />
      <div className="svg-size-info" role="status">
        {hasContours ? (
          <>
            <span>
              Ancho: {Math.round(info.width)} mm · Alto: {Math.round(info.height)} mm
            </span>
            {scaledUp && <span className="svg-size-scale">×{info.scale.toFixed(2)}</span>}
          </>
        ) : (
          <span>Carga un SVG para ver el tamaño resultante.</span>
        )}
      </div>
    </section>
  );
}
