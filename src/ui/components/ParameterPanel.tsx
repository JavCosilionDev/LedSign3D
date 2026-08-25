import { PARAM_GROUPS, PARAM_DEFINITIONS } from "../../domain/value-objects/ProjectSettings";
import { useSettingsStore } from "../state/settingsStore";
import { ParamControl } from "./ParamControl";

/** Panel de parámetros: "Configurar modelo" con los 4 grupos y 12 parámetros.
 *  El grupo "Configurar SVG" se renderiza en SvgSettingsPanel. */
const MODEL_GROUPS = PARAM_GROUPS.filter((g) => g.id !== "svg");

export function ParameterPanel() {
  const settings = useSettingsStore((s) => s.settings);
  const setParam = useSettingsStore((s) => s.setParam);
  const reset = useSettingsStore((s) => s.reset);

  return (
    <section className="sidebar-section">
      <h2>Configurar modelo</h2>
      {MODEL_GROUPS.map((group) => {
        const params = PARAM_DEFINITIONS.filter((d) => d.group === group.id);
        return (
          <div className="param-group" key={group.id}>
            <p className="group-label">{group.label}</p>
            <p className="group-desc">{group.description}</p>
            {params.map((def) => (
              <ParamControl
                key={def.id}
                id={def.id}
                value={settings.get(def.id)}
                onChange={(value) => setParam(def.id, value)}
              />
            ))}
          </div>
        );
      })}
      <button type="button" className="reset-btn" onClick={reset}>
        Restablecer valores por defecto
      </button>
      {settings.assemblyWarnings().length > 0 && (
        <div className="warning-box" role="alert">
          {settings.assemblyWarnings().map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}
    </section>
  );
}
