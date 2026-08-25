import { useId } from "react";
import type { ParamId } from "../../domain/value-objects/ProjectSettings";
import { paramDefinition } from "../../domain/value-objects/ProjectSettings";

interface ParamControlProps {
  readonly id: ParamId;
  readonly value: number;
  readonly onChange: (value: number) => void;
}

/** Control de un parámetro: slider + entrada numérica + rango visible. */
export function ParamControl({ id, value, onChange }: ParamControlProps) {
  const def = paramDefinition(id);
  const rangeId = useId();
  const numberId = useId();

  const handleNumberChange = (raw: string) => {
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) onChange(parsed);
  };

  return (
    <div className="param">
      <div className="param-header">
        <label className="param-label" htmlFor={rangeId}>
          {def.label}
        </label>
      </div>
      <div className="param-input">
        <input
          id={rangeId}
          type="range"
          min={def.min}
          max={def.max}
          step={def.step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={def.label}
        />
        <input
          id={numberId}
          className="number"
          type="number"
          min={def.min}
          max={def.max}
          step={def.step}
          value={value}
          onChange={(e) => handleNumberChange(e.target.value)}
          aria-label={`${def.label} (valor)`}
        />
        <span className="unit">{def.unit}</span>
      </div>
      <div className="param-range">
        <span>{def.min}</span>
        <span>{def.max}</span>
      </div>
    </div>
  );
}
