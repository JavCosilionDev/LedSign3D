import { describe, it, expect } from "vitest";
import {
  ProjectSettings,
  DEFAULT_PROJECT_SETTINGS,
  PARAM_DEFINITIONS,
  PARAM_GROUPS,
  clampParamValue,
} from "./ProjectSettings";
import { ValidationError } from "./ValidationError";

describe("ProjectSettings", () => {
  it("expone los 12 parámetros del plan v0.1 con sus valores por defecto", () => {
    expect(PARAM_DEFINITIONS).toHaveLength(12);
    expect(DEFAULT_PROJECT_SETTINGS).toEqual({
      espesorPanelDifusor: 3,
      toleranciaPanelDifusor: 0.2,
      espesorParedTapa: 1.5,
      alturaParedTapa: 40,
      profundidadLabioTapa: 4,
      espesorLabioTapa: 2,
      espesorSueloBase: 1.5,
      espesorParedExteriorBase: 1.5,
      alturaParedExteriorBase: 3,
      espesorParedInteriorBase: 1.5,
      alturaParedInteriorBase: 30,
      holgura: 0.5,
    });
  });

  it("agrupa los parámetros en los 4 grupos del menú", () => {
    const groupIds = PARAM_GROUPS.map((g) => g.id);
    expect(groupIds).toEqual(["panelDifusor", "tapa", "base", "toleranciaGeneral"]);
    for (const g of PARAM_GROUPS) {
      expect(PARAM_DEFINITIONS.some((d) => d.group === g.id)).toBe(true);
    }
  });

  it("cada definición tiene rango válido (min <= default <= max)", () => {
    for (const d of PARAM_DEFINITIONS) {
      expect(d.min).toBeLessThanOrEqual(d.defaultValue);
      expect(d.defaultValue).toBeLessThanOrEqual(d.max);
      expect(d.step).toBeGreaterThan(0);
    }
  });

  it("crea la configuración por defecto al no pasar valores", () => {
    const s = ProjectSettings.create();
    expect(s.toJSON()).toEqual(DEFAULT_PROJECT_SETTINGS);
  });

  it("rellena los parámetros ausentes con defaults al recibir un parcial", () => {
    const s = new ProjectSettings({ holgura: 1 });
    expect(s.get("holgura")).toBe(1);
    expect(s.get("espesorPanelDifusor")).toBe(3);
  });

  it("set devuelve una instancia nueva e inmutable", () => {
    const s = ProjectSettings.create();
    const s2 = s.set("alturaParedTapa", 50);
    expect(s.get("alturaParedTapa")).toBe(40);
    expect(s2.get("alturaParedTapa")).toBe(50);
    expect(s2).not.toBe(s);
  });

  it("setMany actualiza varios parámetros", () => {
    const s = ProjectSettings.create().setMany({ holgura: 0.2, espesorPanelDifusor: 4 });
    expect(s.get("holgura")).toBe(0.2);
    expect(s.get("espesorPanelDifusor")).toBe(4);
  });

  it("reset devuelve los valores por defecto", () => {
    const s = ProjectSettings.create().set("alturaParedInteriorBase", 100);
    expect(s.reset().toJSON()).toEqual(DEFAULT_PROJECT_SETTINGS);
  });

  it("rechaza valores fuera de rango", () => {
    expect(() => new ProjectSettings({ holgura: -1 })).toThrow(ValidationError);
    expect(() => new ProjectSettings({ alturaParedTapa: 500 })).toThrow(ValidationError);
    expect(() => ProjectSettings.create().set("espesorPanelDifusor", 0)).toThrow(ValidationError);
  });

  it("rechaza valores no numéricos", () => {
    expect(() => new ProjectSettings({ holgura: Number.NaN })).toThrow(ValidationError);
  });

  it("clampParamValue acota al rango de la definición", () => {
    expect(clampParamValue("holgura", 99)).toBe(5);
    expect(clampParamValue("holgura", -9)).toBe(0);
    expect(clampParamValue("holgura", 0.5)).toBe(0.5);
  });

  it("fromJSON completa los valores ausentes y toJSON hace roundtrip", () => {
    const s = ProjectSettings.fromJSON({ holgura: 0.7 });
    const roundtrip = ProjectSettings.fromJSON(s.toJSON());
    expect(roundtrip.toJSON()).toEqual(s.toJSON());
    expect(roundtrip.get("espesorSueloBase")).toBe(1.5);
  });

  it("assemblyWarnings avisa si el labio excede la pared exterior de la base", () => {
    const s = ProjectSettings.create()
      .set("profundidadLabioTapa", 10)
      .set("alturaParedExteriorBase", 3);
    const warnings = s.assemblyWarnings();
    expect(warnings.some((w) => w.includes("labio"))).toBe(true);
  });

  it("assemblyWarnings avisa si la tolerancia del panel excede la pared de la tapa", () => {
    const s = ProjectSettings.create()
      .set("toleranciaPanelDifusor", 2)
      .set("espesorParedTapa", 1.5);
    expect(s.assemblyWarnings().some((w) => w.includes("panel difusor"))).toBe(true);
  });

  it("assemblyWarnings detecta con los defaults el labio más profundo que la pared exterior", () => {
    // Los defaults del plan (labio 4 mm > pared exterior 3 mm) generan la
    // advertencia no bloqueante; la calibración fina es empírica (plan §5).
    const warnings = ProjectSettings.create().assemblyWarnings();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("labio");
  });
});
