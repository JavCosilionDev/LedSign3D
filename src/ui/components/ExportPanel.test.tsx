// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExportPanel } from "./ExportPanel";
import { useProjectStore } from "../state/projectStore";
import type { Assembly } from "../../domain/entities/Assembly";
import type { Mesh3D } from "../../domain/ports/IGeometryEngine";

function mesh(): Mesh3D {
  return {
    vertices: new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0]),
    triangles: new Uint32Array([0, 1, 2]),
    volume: 1,
    triangleCount: 1,
  };
}

function setReadyState(): void {
  useProjectStore.setState({
    status: "ready",
    fileName: "corazon.svg",
    contours: [
      {
        id: "contour-1",
        name: "forma-1",
        outer: { isClosed: true, points: [{ x: 0, y: 0 }] },
        holes: [],
        boundingBox: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
      },
    ],
    assemblies: [
      {
        contourId: "contour-1",
        base: { type: "base", contourId: "contour-1", mesh: mesh() },
        tapa: { type: "tapa", contourId: "contour-1", mesh: mesh() },
        panelDifusor: { type: "panel-difusor", contourId: "contour-1", mesh: mesh() },
      },
    ] as Assembly[],
    error: null,
  });
}

describe("ExportPanel", () => {
  const exporter = {
    execute: vi.fn(async () => new Blob(["zip"])),
  };

  let originalCreateObjectURL: typeof URL.createObjectURL;

  beforeEach(() => {
    useProjectStore.setState({
      status: "empty",
      fileName: null,
      contours: [],
      assemblies: [],
      error: null,
    });
    originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = vi.fn(() => "blob:fake");
    URL.revokeObjectURL = vi.fn();
    document.body.innerHTML = "";
    exporter.execute.mockClear();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    vi.restoreAllMocks();
  });

  it("deshabilita la exportación sin ensamblajes", () => {
    render(<ExportPanel exporter={exporter} />);
    expect(screen.getByRole("button", { name: /exportar zip/i })).toBeDisabled();
  });

  it("exporta el ZIP y dispara la descarga al hacer clic", async () => {
    setReadyState();
    const clickSpy = vi.spyOn(HTMLElement.prototype, "click").mockReturnValue(undefined);
    const createSpy = vi.spyOn(document, "createElement");

    render(<ExportPanel exporter={exporter} />);
    const button = screen.getByRole("button", { name: /exportar zip/i });
    expect(button).toBeEnabled();

    fireEvent.click(button);
    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));

    expect(exporter.execute).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalled();
    const anchor = createSpy.mock.results
      .map((r) => r.value)
      .find((el) => el instanceof HTMLAnchorElement) as HTMLAnchorElement;
    expect(anchor.download).toBe("corazon.zip");
  });

  it("cambia el formato STL", () => {
    setReadyState();
    render(<ExportPanel exporter={exporter} />);
    const select = screen.getByLabelText("Formato STL") as HTMLSelectElement;
    expect(select.value).toBe("binary");
    fireEvent.change(select, { target: { value: "ascii" } });
    expect(select.value).toBe("ascii");
  });
});
