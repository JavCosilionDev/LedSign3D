import { describe, it, expect, beforeAll } from "vitest";
import { flattenPathData } from "../svg-parser/pathDataParser";
import { CavalierContoursOffsetService } from "./cavalierContoursOffsetService";
import { ManifoldEngine } from "./manifoldEngine";
import { signedArea, ensureOrientation } from "../../domain/value-objects/GeometryUtils";
import type { Polygon2D } from "../../domain/value-objects/Polygon2D";

/**
 * Prototipo integrado (Fase 0d): SVG simple → contornos → offset → extrusión
 * → malla 3D watertight sin errores geométricos.
 */
describe("prototipo SVG → malla 3D (Fase 0d)", () => {
  const offset = new CavalierContoursOffsetService();
  const engine = new ManifoldEngine();

  beforeAll(async () => {
    await ManifoldEngine.init();
  });

  it("corazón SVG → malla sólida con volumen > 0", async () => {
    // Corazón simple con dos curvas cúbicas.
    const d =
      "M 0 30 C -30 -20 -60 -10 -40 15 C -25 30 -5 20 0 5 C 5 20 25 30 40 15 C 60 -10 30 -20 0 30 Z";
    const polygons = flattenPathData(d, 0.1);
    expect(polygons).toHaveLength(1);
    const outer = ensureOrientation(polygons[0], false);

    const shape = { outer, holes: [] as Polygon2D[] };

    // Pared exterior (outset 1.5) y cavidad interior (inset 1.5).
    const outset = offset.offsetShape(shape, 1.5, "outset");
    const inset = offset.offsetShape(shape, 1.5, "inset");

    expect(outset.outer).not.toBeNull();
    expect(inset.outer).not.toBeNull();

    const wall = await engine.extrude(
      {
        outer: outset.outer!,
        holes: inset.outer ? [inset.outer] : [],
      },
      40,
    );
    expect(wall.triangleCount).toBeGreaterThan(0);
    // El volumen de la cáscara debe ser positivo y menor que el del bloque lleno.
    const solid = await engine.extrude(shape, 40);
    expect(solid.volume).toBeGreaterThan(0);
    expect(wall.volume).toBeGreaterThan(0);
    expect(wall.volume).toBeLessThan(solid.volume);
  });

  it("letra O (contorno + agujero) → base con cavidad", async () => {
    // Dos círculos: exterior e interior = letra "O" con relleno incluso.
    const rOut = 40;
    const rIn = 20;
    const circlePath = (r: number) =>
      `M ${r} 0 A ${r} ${r} 0 1 0 ${-r} 0 A ${r} ${r} 0 1 0 ${r} 0 Z`;
    // Tolerancia fina: la poligonal aproxima bien el área del círculo.
    const polys = flattenPathData(`${circlePath(rOut)} ${circlePath(rIn)}`, 0.001);
    expect(polys).toHaveLength(2);

    // Determinar exterior (mayor |área|) y agujero.
    const areas = polys.map((p) => Math.abs(signedArea(p)));
    const outerIdx = areas[0] > areas[1] ? 0 : 1;
    const holeIdx = outerIdx === 0 ? 1 : 0;

    const shape = {
      outer: ensureOrientation(polys[outerIdx], false),
      holes: [ensureOrientation(polys[holeIdx], true)],
    };

    // El volumen de la extrusión es área del polígono (anillo) × altura.
    const sectionArea =
      Math.abs(signedArea(shape.outer)) -
      shape.holes.reduce((sum, h) => sum + Math.abs(signedArea(h)), 0);

    // Suelo + pared interior: base.
    const base = await engine.extrude(shape, 30);
    expect(base.volume).toBeCloseTo(sectionArea * 30, 0);

    // Panel difusor: lámina plana con agujero, espesor 3.
    const panel = await engine.extrude(shape, 3);
    expect(panel.volume).toBeCloseTo(sectionArea * 3, 0);
    expect(panel.triangleCount).toBeGreaterThan(0);
  });
});
