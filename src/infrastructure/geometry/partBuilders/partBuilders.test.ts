import { describe, it, expect, beforeAll } from "vitest";
import type { Contour } from "../../../domain/entities/Contour";
import type { Polygon2D } from "../../../domain/value-objects/Polygon2D";
import { ProjectSettings } from "../../../domain/value-objects/ProjectSettings";
import { ManifoldEngine } from "../manifoldEngine";
import { CavalierContoursOffsetService } from "../cavalierContoursOffsetService";
import { GeometryPipeline } from "../GeometryPipeline";
import { createPartBuilders } from "./index";
import { meshBounds } from "../MeshUtils";

function circleContour(r: number, holeR?: number): Contour {
  const circle = (radius: number, n = 96): Polygon2D => {
    const points = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      points.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius });
    }
    return { points, isClosed: true };
  };
  return {
    id: "c1",
    name: "forma-1",
    outer: circle(r),
    holes: holeR ? [circle(holeR)] : [],
    boundingBox: { minX: -r, minY: -r, maxX: r, maxY: r },
  };
}

describe("partBuilders", () => {
  const offset = new CavalierContoursOffsetService();
  const engine = new ManifoldEngine();
  const pipeline = new GeometryPipeline(offset, engine);
  const builders = createPartBuilders(pipeline);

  beforeAll(async () => {
    await ManifoldEngine.init();
  });

  const settings = ProjectSettings.create();
  const contour = circleContour(40, 15);

  it("panel difusor: altura = espesor y volumen = área inset × espesor", async () => {
    const panel = await builders["panel-difusor"].build(contour, settings);
    const tolerance = settings.get("toleranciaPanelDifusor");
    const thickness = settings.get("espesorPanelDifusor");

    const area = Math.PI * ((40 - tolerance) ** 2 - (15 + tolerance) ** 2);
    // El contorno está poligonizado (96 segmentos): comparación relativa.
    expect(Math.abs(panel.volume - area * thickness) / (area * thickness)).toBeLessThan(0.01);
    expect(meshBounds(panel).height).toBeCloseTo(thickness, 3);
    // El panel es una lámina: grosor pequeño respecto al diámetro.
    expect(meshBounds(panel).width).toBeCloseTo(2 * (40 - tolerance), 0);
  });

  it("tapa: altura total = pared + labio, watertight", async () => {
    const tapa = await builders["tapa"].build(contour, settings);
    const height = settings.get("alturaParedTapa") + settings.get("profundidadLabioTapa");
    expect(tapa.volume).toBeGreaterThan(0);
    expect(meshBounds(tapa).height).toBeCloseTo(height, 3);
    // El rebaje elimina material: el volumen debe ser sensiblemente menor que
    // el del cilindro hueco completo sin rebaje.
    const ringVolume = Math.PI * (40 ** 2 - (40 - settings.get("espesorParedTapa")) ** 2) * 40;
    expect(tapa.volume).toBeLessThan(ringVolume * 1.5);
  });

  it("base: altura = suelo + pared interior, watertight", async () => {
    const base = await builders["base"].build(contour, settings);
    const height = settings.get("espesorSueloBase") + settings.get("alturaParedInteriorBase");
    expect(base.volume).toBeGreaterThan(0);
    expect(meshBounds(base).height).toBeCloseTo(height, 3);
    // La pared exterior expande el ancho del letrero.
    const width = 2 * (40 + settings.get("espesorParedExteriorBase"));
    expect(meshBounds(base).width).toBeCloseTo(width, 0);
  });

  it("el espesor del panel afecta la altura de la pieza", async () => {
    const thin = settings.set("espesorPanelDifusor", 3);
    const thick = settings.set("espesorPanelDifusor", 6);
    const p1 = await builders["panel-difusor"].build(contour, thin);
    const p2 = await builders["panel-difusor"].build(contour, thick);
    expect(meshBounds(p2).height).toBeCloseTo(6, 3);
    expect(meshBounds(p1).height).toBeCloseTo(3, 3);
  });
});
