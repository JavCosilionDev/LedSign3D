import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "./settingsStore";
import { useProjectStore } from "./projectStore";
import { DEFAULT_PROJECT_SETTINGS } from "../../domain/value-objects/ProjectSettings";

describe("useSettingsStore", () => {
  beforeEach(() => {
    useSettingsStore.setState({ settings: useSettingsStore.getState().settings.reset() });
  });

  it("arranca con los valores por defecto del plan", () => {
    expect(useSettingsStore.getState().settings.toJSON()).toEqual(DEFAULT_PROJECT_SETTINGS);
  });

  it("setParam actualiza un parámetro y acota al rango", () => {
    useSettingsStore.getState().setParam("holgura", 99);
    expect(useSettingsStore.getState().settings.get("holgura")).toBe(5);

    useSettingsStore.getState().setParam("alturaParedTapa", 55);
    expect(useSettingsStore.getState().settings.get("alturaParedTapa")).toBe(55);
  });

  it("reset restablece los valores por defecto", () => {
    useSettingsStore.getState().setParam("espesorPanelDifusor", 6);
    useSettingsStore.getState().reset();
    expect(useSettingsStore.getState().settings.toJSON()).toEqual(DEFAULT_PROJECT_SETTINGS);
  });
});

describe("useProjectStore", () => {
  beforeEach(() => {
    useProjectStore.setState({
      status: "empty",
      fileName: null,
      svgSource: null,
      contours: [],
      assemblies: [],
      error: null,
    });
  });

  it("setSvgSource pone el estado en parsing con el contenido", () => {
    useProjectStore.getState().setSvgSource("<svg/>", "test.svg");
    const s = useProjectStore.getState();
    expect(s.svgSource).toBe("<svg/>");
    expect(s.fileName).toBe("test.svg");
    expect(s.status).toBe("parsing");
  });

  it("setAssemblies pasa el estado a ready", () => {
    useProjectStore.getState().setAssemblies([{ contourId: "c0" }]);
    expect(useProjectStore.getState().status).toBe("ready");
  });

  it("clear reinicia todo el estado", () => {
    useProjectStore.getState().setSvgSource("<svg/>", "a.svg");
    useProjectStore.getState().setAssemblies([{ contourId: "c0" }]);
    useProjectStore.getState().clear();
    const s = useProjectStore.getState();
    expect(s.status).toBe("empty");
    expect(s.svgSource).toBeNull();
    expect(s.assemblies).toHaveLength(0);
  });
});
