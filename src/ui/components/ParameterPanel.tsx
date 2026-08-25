import { PARAM_GROUPS, PARAM_DEFINITIONS } from "../../domain/value-objects/ProjectSettings";
import { useSettingsStore } from "../state/settingsStore";
import { ParamControl } from "./ParamControl";

/** Panel de parámetros: "Configurar modelo" con los 4 grupos y 12 parámetros. */
export function ParameterPanel() {
  const settings = useSettingsStore((s) => s.settings);
  const setParam = useSettingsStore((s) => s.setParam);
  const reset = useSettingsStore((s) => s.reset);

  return (
    <section className="sidebar-section">
      <h2>Configurar modelo</h2>
      {PARAM_GROUPS.map((group) => {
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
    </section>
  );
}
