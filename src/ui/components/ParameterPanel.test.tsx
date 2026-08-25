import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ParameterPanel } from "./ParameterPanel";
import { useSettingsStore } from "../state/settingsStore";
import { PARAM_DEFINITIONS } from "../../domain/value-objects/ProjectSettings";

/** Parámetros que renderiza ParameterPanel (excluye el grupo "Configurar SVG"). */
const MODEL_DEFS = PARAM_DEFINITIONS.filter((d) => d.group !== "svg");

describe("ParameterPanel", () => {
  it("renderiza los 12 parámetros de modelo agrupados", () => {
    render(<ParameterPanel />);
    for (const def of MODEL_DEFS) {
      expect(screen.getByLabelText(def.label)).toBeInTheDocument();
    }
    expect(screen.getByText("Configurar modelo")).toBeInTheDocument();
    // El grupo SVG no se renderiza aquí.
    expect(screen.queryByText("Tamaño máximo")).toBeNull();
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

  it("muestra las advertencias de ensamblaje cuando aplica", () => {
    useSettingsStore.setState({
      settings: useSettingsStore.getState().settings.set("profundidadLabioTapa", 10),
    });
    render(<ParameterPanel />);

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toContain("labio");
  });
});
