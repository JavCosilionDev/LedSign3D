// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SvgSettingsPanel } from "./SvgSettingsPanel";
import { useProjectStore } from "../state/projectStore";
import { useSettingsStore } from "../state/settingsStore";

const RECT_10 = {
  id: "contour-1",
  name: "forma-1",
  outer: {
    isClosed: true,
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ],
  },
  holes: [],
  boundingBox: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
};

describe("SvgSettingsPanel", () => {
  beforeEach(() => {
    useProjectStore.setState({ contours: [], status: "empty" });
    useSettingsStore.setState({ settings: useSettingsStore.getState().settings.reset() });
  });

  it("muestra el control de tamaño y un mensaje sin SVG cargado", () => {
    render(<SvgSettingsPanel />);
    expect(screen.getByText("Configurar SVG")).toBeInTheDocument();
    expect(screen.getByLabelText("Tamaño máximo")).toBeInTheDocument();
    expect(screen.getByText(/Carga un SVG/)).toBeInTheDocument();
  });

  it("muestra las dimensiones escaladas a 50 mm para un SVG pequeño", () => {
    useProjectStore.setState({ contours: [RECT_10] });
    render(<SvgSettingsPanel />);
    expect(screen.getByRole("status").textContent).toContain("Ancho: 50 mm");
    expect(screen.getByRole("status").textContent).toContain("Alto: 50 mm");
    expect(screen.getByRole("status").textContent).toContain("×5.00");
  });

  it("cambiar el tamaño máximo actualiza las dimensiones mostradas", () => {
    useProjectStore.setState({ contours: [RECT_10] });
    render(<SvgSettingsPanel />);

    const slider = screen.getByLabelText("Tamaño máximo") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "100" } });

    expect(useSettingsStore.getState().settings.get("svgMaxDimension")).toBe(100);
    expect(screen.getByRole("status").textContent).toContain("Ancho: 100 mm");
  });

  it("acota automáticamente a 50 mm si se introduce un valor menor", () => {
    useProjectStore.setState({ contours: [RECT_10] });
    render(<SvgSettingsPanel />);

    const number = screen.getByLabelText("Tamaño máximo (valor)") as HTMLInputElement;
    fireEvent.change(number, { target: { value: "10" } });

    expect(useSettingsStore.getState().settings.get("svgMaxDimension")).toBe(50);
  });
});
