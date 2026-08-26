// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useModelPipeline } from "./useModelPipeline";
import { useProjectStore } from "./projectStore";
import { useSettingsStore } from "./settingsStore";
import type { IGeometryGateway } from "../../application/ports/IGeometryGateway";
import type { Assembly } from "../../domain/entities/Assembly";
import type { Contour } from "../../domain/entities/Contour";
import type { ProjectSettings } from "../../domain/value-objects/ProjectSettings";

class FakeGateway implements IGeometryGateway {
  calls: { contours: readonly Contour[]; settings: ProjectSettings }[] = [];

  async generateAssemblies(
    contours: readonly Contour[],
    settings: ProjectSettings,
  ): Promise<Assembly[]> {
    this.calls.push({ contours, settings });
    return contours.map((c) => ({ contourId: c.id }));
  }
}

function resetStores(): void {
  useProjectStore.setState({
    status: "empty",
    fileName: null,
    svgSource: null,
    contours: [],
    assemblies: [],
    error: null,
  });
  useSettingsStore.setState({ settings: useSettingsStore.getState().settings.reset() });
}

describe("useModelPipeline", () => {
  beforeEach(resetStores);
  afterEach(() => vi.useRealTimers());

  it("al cargar un SVG parsea y genera los ensamblajes escalados a 50 mm", async () => {
    const gateway = new FakeGateway();
    renderHook(() => useModelPipeline(gateway));

    await act(async () => {
      useProjectStore
        .getState()
        .setSvgSource(
          '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>',
          "a.svg",
        );
    });

    await waitFor(() => expect(gateway.calls).toHaveLength(1));
    expect(gateway.calls[0].contours).toHaveLength(1);
    // El rect 10×10 se escala a 50×50 (mínimo viable). Con Y invertida, el
    // bounding box queda en x 0..50, y -50..0.
    expect(gateway.calls[0].contours[0].boundingBox.maxX).toBeCloseTo(50, 6);
    expect(Math.abs(gateway.calls[0].contours[0].boundingBox.minY)).toBeCloseTo(50, 6);
    expect(useProjectStore.getState().status).toBe("ready");
    expect(useProjectStore.getState().assemblies).toHaveLength(1);
  });

  it("cambiar el tamaño máximo del SVG regenera con la nueva escala", async () => {
    const gateway = new FakeGateway();
    renderHook(() => useModelPipeline(gateway));

    await act(async () => {
      useProjectStore
        .getState()
        .setSvgSource(
          '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>',
          "a.svg",
        );
    });
    await waitFor(() => expect(gateway.calls).toHaveLength(1));

    await act(async () => {
      useSettingsStore.getState().setParam("svgMaxDimension", 100);
    });
    await waitFor(() => expect(gateway.calls).toHaveLength(2));
    expect(gateway.calls[1].contours[0].boundingBox.maxX).toBeCloseTo(100, 6);
  });

  it("ante un SVG sin formas, marca error sin llamar al gateway", async () => {
    const gateway = new FakeGateway();
    renderHook(() => useModelPipeline(gateway));

    await act(async () => {
      useProjectStore
        .getState()
        .setSvgSource(
          '<svg xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="0" x2="5" y2="5"/></svg>',
          "b.svg",
        );
    });

    await waitFor(() => expect(useProjectStore.getState().status).toBe("error"));
    expect(gateway.calls).toHaveLength(0);
  });

  it("un cambio de parámetros regenera el modelo (debounced)", async () => {
    const gateway = new FakeGateway();
    renderHook(() => useModelPipeline(gateway));

    await act(async () => {
      useProjectStore
        .getState()
        .setSvgSource(
          '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>',
          "a.svg",
        );
    });
    await waitFor(() => expect(gateway.calls).toHaveLength(1));

    await act(async () => {
      useSettingsStore.getState().setParam("holgura", 1);
    });
    await waitFor(() => expect(gateway.calls).toHaveLength(2));
    expect(gateway.calls[1].settings.get("holgura")).toBe(1);
  });
});
