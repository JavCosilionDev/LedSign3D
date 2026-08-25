import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ParameterPanel } from "./ParameterPanel";
import { useSettingsStore } from "../state/settingsStore";
import { PARAM_DEFINITIONS } from "../../domain/value-objects/ProjectSettings";

describe("ParameterPanel", () => {
  it("renderiza los 12 parámetros editables agrupados", () => {
    render(<ParameterPanel />);
    for (const def of PARAM_DEFINITIONS) {
      expect(screen.getByLabelText(def.label)).toBeInTheDocument();
    }
    expect(screen.getByText("Configurar modelo")).toBeInTheDocument();
  });

  it("editar un parámetro actualiza el store", () => {
    render(<ParameterPanel />);
    const def = PARAM_DEFINITIONS.find((d) => d.id === "alturaParedTapa")!;

    const slider = screen.getByLabelText(def.label) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "60" } });

    expect(useSettingsStore.getState().settings.get("alturaParedTapa")).toBe(60);
  });

  it("el botón de restablecer vuelve a los valores por defecto", () => {
    useSettingsStore.getState().setParam("holgura", 2);
    render(<ParameterPanel />);

    fireEvent.click(screen.getByRole("button", { name: /restablecer/i }));

    expect(useSettingsStore.getState().settings.get("holgura")).toBe(0.5);
  });
});
