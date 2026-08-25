import { ValidationError } from "./ValidationError";

/**
 * Grupos de parámetros del menú lateral, en orden de presentación.
 */
export type ParamGroupId = "svg" | "panelDifusor" | "tapa" | "base" | "toleranciaGeneral";

export interface ParamGroup {
  readonly id: ParamGroupId;
  readonly label: string;
  readonly description: string;
}

export const PARAM_GROUPS: readonly ParamGroup[] = [
  {
    id: "svg",
    label: "Configurar SVG",
    description: "Ajusta el tamaño del letrero resultante a partir del SVG importado.",
  },
  {
    id: "panelDifusor",
    label: "Panel difusor",
    description: "Define el espesor y el ajuste del panel difusor.",
  },
  {
    id: "tapa",
    label: "Tapa",
    description: "Configura las paredes, el rebaje y el encastre de la tapa.",
  },
  {
    id: "base",
    label: "Base",
    description: "Ajusta el suelo y la estructura inferior del modelo.",
  },
  {
    id: "toleranciaGeneral",
    label: "Tolerancia general",
    description: "Controla las holguras y el ajuste entre las piezas.",
  },
];

/**
 * Definición de cada parámetro editable. Los valores por defecto son los
 * establecidos en el plan v0.1 (§4); el usuario puede editarlos en la UI.
 */
export interface ParamDefinition {
  /** Identificador único del parámetro (literal, derivado en ParamId). */
  readonly id: string;
  readonly label: string;
  readonly group: ParamGroupId;
  readonly unit: string;
  readonly defaultValue: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

export const PARAM_DEFINITIONS = [
  {
    id: "svgMaxDimension",
    label: "Tamaño máximo",
    group: "svg",
    unit: "mm",
    defaultValue: 50,
    min: 50,
    max: 1000,
    step: 5,
  },
  {
    id: "espesorPanelDifusor",
    label: "Espesor de panel difusor",
    group: "panelDifusor",
    unit: "mm",
    defaultValue: 3,
    min: 0.5,
    max: 10,
    step: 0.1,
  },
  {
    id: "toleranciaPanelDifusor",
    label: "Tolerancia de panel difusor",
    group: "panelDifusor",
    unit: "mm",
    defaultValue: 0.2,
    min: 0,
    max: 2,
    step: 0.05,
  },
  {
    id: "espesorParedTapa",
    label: "Espesor de la pared de la tapa",
    group: "tapa",
    unit: "mm",
    defaultValue: 1.5,
    min: 0.5,
    max: 10,
    step: 0.1,
  },
  {
    id: "alturaParedTapa",
    label: "Altura de la pared de la tapa",
    group: "tapa",
    unit: "mm",
    defaultValue: 40,
    min: 5,
    max: 200,
    step: 1,
  },
  {
    id: "profundidadLabioTapa",
    label: "Profundidad del labio de la tapa",
    group: "tapa",
    unit: "mm",
    defaultValue: 4,
    min: 1,
    max: 20,
    step: 0.5,
  },
  {
    id: "espesorLabioTapa",
    label: "Espesor del labio de la tapa",
    group: "tapa",
    unit: "mm",
    defaultValue: 2,
    min: 0.5,
    max: 10,
    step: 0.1,
  },
  {
    id: "espesorSueloBase",
    label: "Espesor del suelo base",
    group: "base",
    unit: "mm",
    defaultValue: 1.5,
    min: 0.5,
    max: 10,
    step: 0.1,
  },
  {
    id: "espesorParedExteriorBase",
    label: "Espesor de la pared exterior de la base",
    group: "base",
    unit: "mm",
    defaultValue: 1.5,
    min: 0.5,
    max: 10,
    step: 0.1,
  },
  {
    id: "alturaParedExteriorBase",
    label: "Altura de la pared exterior de la base",
    group: "base",
    unit: "mm",
    defaultValue: 3,
    min: 1,
    max: 20,
    step: 0.5,
  },
  {
    id: "espesorParedInteriorBase",
    label: "Espesor de la pared interior de la base",
    group: "base",
    unit: "mm",
    defaultValue: 1.5,
    min: 0.5,
    max: 10,
    step: 0.1,
  },
  {
    id: "alturaParedInteriorBase",
    label: "Altura de la pared interior de la base",
    group: "base",
    unit: "mm",
    defaultValue: 30,
    min: 5,
    max: 200,
    step: 1,
  },
  {
    id: "holgura",
    label: "Holgura",
    group: "toleranciaGeneral",
    unit: "mm",
    defaultValue: 0.5,
    min: 0,
    max: 5,
    step: 0.1,
  },
] as const satisfies readonly ParamDefinition[];

export type ParamId = (typeof PARAM_DEFINITIONS)[number]["id"];

/** Mapa con todos los parámetros y sus valores por defecto. */
export type ProjectSettingsValues = Record<ParamId, number>;

export const DEFAULT_PROJECT_SETTINGS: ProjectSettingsValues = Object.fromEntries(
  PARAM_DEFINITIONS.map((d) => [d.id, d.defaultValue]),
) as ProjectSettingsValues;

export function paramDefinition(id: ParamId): ParamDefinition {
  const def = PARAM_DEFINITIONS.find((d) => d.id === id);
  if (!def) throw new ValidationError(`Parámetro desconocido: ${id}`);
  return def;
}

/** Acota un valor al rango [min, max] de la definición. */
export function clampParamValue(id: ParamId, value: number): number {
  const def = paramDefinition(id);
  return Math.min(def.max, Math.max(def.min, value));
}

/**
 * Value object inmutable con los parámetros del modelo. Garantiza los
 * invariantes de dominio: valores numéricos dentro de [min, max].
 *
 * Los 12 parámetros son EDITABLES por el usuario; estos son los valores por
 * defecto con los que arranca la app.
 */
export class ProjectSettings {
  readonly values: ProjectSettingsValues;

  constructor(values: Partial<ProjectSettingsValues> = {}) {
    const merged = Object.assign({}, DEFAULT_PROJECT_SETTINGS, values) as ProjectSettingsValues;
    for (const [id, value] of Object.entries(merged) as [ParamId, number][]) {
      const def = paramDefinition(id);
      if (typeof value !== "number" || Number.isNaN(value)) {
        throw new ValidationError(`El valor de "${def.label}" debe ser un número`);
      }
      if (value < def.min || value > def.max) {
        throw new ValidationError(
          `"${def.label}" (${value}) está fuera del rango [${def.min}, ${def.max}]`,
        );
      }
    }
    this.values = merged;
  }

  /** Devuelve el valor de un parámetro. */
  get(id: ParamId): number {
    return this.values[id];
  }

  /** Devuelve una nueva instancia con un único parámetro actualizado (validado). */
  set(id: ParamId, value: number): ProjectSettings {
    return new ProjectSettings({ ...this.values, [id]: value });
  }

  /** Devuelve una nueva instancia con varios parámetros actualizados (validados). */
  setMany(patch: Partial<ProjectSettingsValues>): ProjectSettings {
    return new ProjectSettings({ ...this.values, ...patch });
  }

  /** Devuelve una nueva instancia con todos los valores por defecto. */
  reset(): ProjectSettings {
    return new ProjectSettings();
  }

  /** Crea la configuración por defecto. */
  static create(): ProjectSettings {
    return new ProjectSettings();
  }

  /** Reconstruye desde un JSON, completando los parámetros ausentes con defaults. */
  static fromJSON(json: Partial<ProjectSettingsValues>): ProjectSettings {
    return new ProjectSettings(json);
  }

  toJSON(): ProjectSettingsValues {
    return { ...this.values };
  }

  /**
   * Advertencias de consistencia geométrica entre parámetros (no bloquean,
   * pero avisan de configuraciones que no ensamblarán correctamente).
   * La calibración fina se valida con impresión real (plan v0.1 §5).
   */
  assemblyWarnings(): string[] {
    const warnings: string[] = [];

    const lipDepth = this.get("profundidadLabioTapa");
    const outerWallHeight = this.get("alturaParedExteriorBase");
    if (lipDepth > outerWallHeight) {
      warnings.push(
        `El labio de la tapa (${lipDepth} mm) es más profundo que la pared exterior ` +
          `de la base (${outerWallHeight} mm); interferirá al ensamblar.`,
      );
    }

    const panelTolerance = this.get("toleranciaPanelDifusor");
    const wallThickness = this.get("espesorParedTapa");
    if (panelTolerance >= wallThickness) {
      warnings.push(
        `La tolerancia del panel difusor (${panelTolerance} mm) iguala o supera el ` +
          `espesor de la pared de la tapa (${wallThickness} mm); el rebaje no asentará el panel.`,
      );
    }

    return warnings;
  }
}
