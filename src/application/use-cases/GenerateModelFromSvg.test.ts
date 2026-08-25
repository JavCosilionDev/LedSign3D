// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from "vitest";
import { GenerateModelFromSvg } from "./GenerateModelFromSvg";
import { SvgSanitizer } from "../../infrastructure/svg-parser/SvgSanitizer";
import { SvgParser } from "../../infrastructure/svg-parser/SvgParser";
import { ManifoldEngine } from "../../infrastructure/geometry/manifoldEngine";
import { CavalierContoursOffsetService } from "../../infrastructure/geometry/cavalierContoursOffsetService";
import { GeometryPipeline } from "../../infrastructure/geometry/GeometryPipeline";
import { GeometryBuilderService } from "../../infrastructure/geometry/GeometryBuilderService";
import { ProjectSettings } from "../../domain/value-objects/ProjectSettings";
import type { Part } from "../../domain/entities/Part";

describe("GenerateModelFromSvg (integración SVG → ensamblajes)", () => {
  const useCase = new GenerateModelFromSvg({
    sanitizer: new SvgSanitizer(),
    parser: new SvgParser(),
    builder: new GeometryBuilderService(
      new GeometryPipeline(new CavalierContoursOffsetService(), new ManifoldEngine()),
    ),
  });

  beforeAll(async () => {
    await ManifoldEngine.init();
  });

  it("corazón SVG → ensamblaje con 3 piezas watertight", async () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M 50 80 C 10 40 0 50 20 70 C 35 85 45 70 50 55 C 55 70 65 85 80 70 C 100 50 90 40 50 80 Z"/>
      </svg>`;
    const assemblies = await useCase.execute(svg, ProjectSettings.create());

    expect(assemblies).toHaveLength(1);
    const assembly = assemblies[0];
    expect(assembly.base?.mesh).toBeDefined();
    expect(assembly.tapa?.mesh).toBeDefined();
    expect(assembly.panelDifusor?.mesh).toBeDefined();

    for (const part of [assembly.base, assembly.tapa, assembly.panelDifusor] as Part[]) {
      expect(part.mesh!.volume).toBeGreaterThan(0);
      expect(part.mesh!.triangleCount).toBeGreaterThan(0);
      expect(part.metadata!.volume).toBe(part.mesh!.volume);
    }
  });

  it("letra O (con agujero) genera un único ensamblaje con piezas huecas", async () => {
    const r = (rr: number) =>
      `M ${rr} 0 A ${rr} ${rr} 0 1 1 ${-rr} 0 A ${rr} ${rr} 0 1 1 ${rr} 0 Z`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${r(40)} ${r(20)}"/></svg>`;
    const assemblies = await useCase.execute(svg, ProjectSettings.create());

    expect(assemblies).toHaveLength(1);
    const base = assemblies[0].base!;
    const panel = assemblies[0].panelDifusor!;
    // La cavidad interior reduce el volumen frente al bloque sólido completo
    // (huella exterior × altura total de la base).
    const solidBlock = Math.PI * 41.5 * 41.5 * (1.5 + 30);
    expect(base.mesh!.volume).toBeLessThan(0.5 * solidBlock);
    // El panel difusor con agujero: volumen menor que el disco lleno de 3 mm.
    expect(panel.mesh!.volume).toBeLessThan(Math.PI * 40 * 40 * 3);
  });

  it("dos formas separadas generan dos ensamblajes independientes", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="10" height="10"/>
      <rect x="50" y="0" width="10" height="10"/>
    </svg>`;
    const assemblies = await useCase.execute(svg, ProjectSettings.create());
    expect(assemblies).toHaveLength(2);
  });

  it("lanza error si el SVG no tiene formas cerradas", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="0" x2="5" y2="5"/></svg>`;
    await expect(useCase.execute(svg, ProjectSettings.create())).rejects.toThrow();
  });

  it("sanitiza antes de procesar (elimina scripts)", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10"/></svg>`;
    const assemblies = await useCase.execute(svg, ProjectSettings.create());
    expect(assemblies).toHaveLength(1);
  });
});
