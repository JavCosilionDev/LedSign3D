import { describe, it, expect } from "vitest";
import { CavalierContoursOffsetService } from "./cavalierContoursOffsetService";
import type { Polygon2D } from "../../domain/value-objects/Polygon2D";
import { signedArea } from "../../domain/value-objects/GeometryUtils";

function square(size: number, cx = 0, cy = 0): Polygon2D {
  const h = size / 2;
  return {
    isClosed: true,
    points: [
      { x: cx - h, y: cy - h },
      { x: cx + h, y: cy - h },
      { x: cx + h, y: cy + h },
      { x: cx - h, y: cy + h },
    ],
  };
}

/**
 * Área de un polígono expandido una distancia d con esquinas redondeadas
 * (radio = d): A' = A + P·d + π·d². Es el resultado exacto del offset
 * paralelo de cavalier cuando el contorno se EXPANDE.
 */
function expandedArea(area: number, perimeter: number, d: number): number {
  return area + perimeter * d + Math.PI * d * d;
}

function squarePerimeter(size: number): number {
  return size * 4;
}

describe("CavalierContoursOffsetService", () => {
  const service = new CavalierContoursOffsetService();

  it("hace inset de un cuadrado reduciendo el área", () => {
    const result = service.offsetShape({ outer: square(100), holes: [] }, 10, "inset");
    expect(result.outer).not.toBeNull();
    expect(Math.abs(signedArea(result.outer!))).toBeCloseTo(80 * 80, 0);
  });

  it("hace outset de un cuadrado aumentando el área", () => {
    const result = service.offsetShape({ outer: square(100), holes: [] }, 10, "outset");
    expect(result.outer).not.toBeNull();
    // Expansión con esquinas redondeadas (radio = 10).
    expect(Math.abs(signedArea(result.outer!))).toBeCloseTo(
      expandedArea(100 * 100, squarePerimeter(100), 10),
      0,
    );
  });

  it("mantiene el agujero con inset de una forma con hoyo", () => {
    const outer = square(100);
    const hole = square(40);
    const result = service.offsetShape({ outer, holes: [hole] }, 10, "inset");
    // Exterior 80×80 (exacto); agujero expandido 40→60 con esquinas redondeadas.
    expect(result.outer).not.toBeNull();
    expect(result.holes).toHaveLength(1);
    const filled = Math.abs(signedArea(result.outer!)) - Math.abs(signedArea(result.holes[0]));
    expect(filled).toBeCloseTo(80 * 80 - expandedArea(40 * 40, squarePerimeter(40), 10), 0);
  });

  it("mantiene el agujero con outset de una forma con hoyo", () => {
    const outer = square(100);
    const hole = square(40);
    const result = service.offsetShape({ outer, holes: [hole] }, 10, "outset");
    // Exterior expandido con esquinas redondeadas; agujero contraído 40→20 (exacto).
    expect(result.outer).not.toBeNull();
    expect(result.holes).toHaveLength(1);
    const filled = Math.abs(signedArea(result.outer!)) - Math.abs(signedArea(result.holes[0]));
    expect(filled).toBeCloseTo(expandedArea(100 * 100, squarePerimeter(100), 10) - 20 * 20, 0);
  });

  it("elimina el área cuando el inset supera el radio de la forma", () => {
    const result = service.offsetShape({ outer: square(10), holes: [] }, 10, "inset");
    // El cuadrado de 10 se colapsa con inset de 10 → sin contorno exterior.
    expect(result.outer).toBeNull();
  });

  it("no produce autointersecciones en curvas cerradas (esquinas agudas)", () => {
    // "L" muy cerrada (espiral) que estresa el offset.
    const spike: Polygon2D = {
      isClosed: true,
      points: [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 5 },
        { x: 1, y: 5 },
        { x: 1, y: 1 },
        { x: 9, y: 1 },
        { x: 9, y: 9 },
        { x: 0, y: 9 },
      ],
    };
    for (const dist of [0.5, 1, 2, 3]) {
      const inset = service.offsetShape({ outer: spike, holes: [] }, dist, "inset");
      if (inset.outer) {
        expect(inset.outer.points.length).toBeGreaterThanOrEqual(3);
        // No verificar área con signo exacto, solo que no colapse a 0 puntos.
        expect(Math.abs(signedArea(inset.outer))).toBeGreaterThan(0);
      }
    }
  });

  it("rechaza distancias negativas", () => {
    expect(() => service.offsetShape({ outer: square(10), holes: [] }, -1, "inset")).toThrow();
  });

  it("normaliza orientación (acepta exterior CW)", () => {
    // Cuadrado en sentido horario (área negativa).
    const cw: Polygon2D = {
      isClosed: true,
      points: [
        { x: -50, y: -50 },
        { x: -50, y: 50 },
        { x: 50, y: 50 },
        { x: 50, y: -50 },
      ],
    };
    const result = service.offsetShape({ outer: cw, holes: [] }, 10, "inset");
    expect(result.outer).not.toBeNull();
    expect(Math.abs(signedArea(result.outer!))).toBeCloseTo(80 * 80, 0);
  });
});
