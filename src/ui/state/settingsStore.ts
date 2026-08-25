import { create } from "zustand";
import {
  ProjectSettings,
  clampParamValue,
  type ParamId,
  type ProjectSettingsValues,
} from "../../domain/value-objects/ProjectSettings";

interface SettingsState {
  /** Configuración actual del modelo (los 12 parámetros editables). */
  settings: ProjectSettings;
  /** Actualiza un parámetro, acotando al rango válido de su definición. */
  setParam: (id: ParamId, value: number) => void;
  /** Actualiza varios parámetros a la vez (sin acotar; debe venir validado). */
  setMany: (patch: Partial<ProjectSettingsValues>) => void;
  /** Restablece todos los parámetros a sus valores por defecto. */
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: ProjectSettings.create(),

  setParam: (id, value) =>
    set((state) => ({
      settings: state.settings.set(id, clampParamValue(id, value)),
    })),

  setMany: (patch) =>
    set((state) => ({
      settings: state.settings.setMany(patch),
    })),

  reset: () => set({ settings: ProjectSettings.create() }),
}));
