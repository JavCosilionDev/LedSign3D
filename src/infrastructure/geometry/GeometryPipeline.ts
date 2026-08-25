import type { Contour } from "../../domain/entities/Contour";
import type { IGeometryEngine, Mesh3D } from "../../domain/ports/IGeometryEngine";
import type {
  IOffsetService,
  OffsetShapeInput,
  OffsetDirection,
} from "../../domain/ports/IOffsetService";
import type { Polygon2D } from "../../domain/value-objects/Polygon2D";

/**
 * Fachada que combina offset 2D y extrusión/booleanos 3D para construir las
 * secciones de las piezas a partir de un contorno y sus parámetros.
 *
 * Convención de signos: `curveOffset(curve, signedD)` con `signedD > 0`
 * EXPANDE el área del bucle (independientemente de su orientación) y
 * `signedD < 0` la contrae.
 */
export class GeometryPipeline {
  constructor(
    private readonly offset: IOffsetService,
    private readonly engine: IGeometryEngine,
  ) {}

  /** Sección completa del contorno (exterior + agujeros) como input de offset. */
  shapeOf(contour: Contour): OffsetShapeInput {
    return { outer: contour.outer, holes: contour.holes };
  }

  /** Desplaza un bucle individual; `signedD > 0` expande, `signedD < 0` contrae. */
  curveOffset(curve: Polygon2D, signedD: number): Polygon2D {
    if (signedD === 0) return curve;
    const direction: OffsetDirection = signedD > 0 ? "outset" : "inset";
    const result = this.offset.offsetShape(
      { outer: curve, holes: [] },
      Math.abs(signedD),
      direction,
    );
    if (!result.outer) {
      throw new Error("El contorno colapsa con el offset aplicado");
    }
    return result.outer;
  }

  /**
   * Desplaza un contorno (exterior o agujero) hacia el interior del material.
   * Para el exterior (CCW) el material está hacia adentro (inset); para un
   * agujero (CW) el material está hacia afuera (outset).
   */
  boundaryAt(curve: Polygon2D, isHole: boolean, distIntoMaterial: number): Polygon2D {
    return this.curveOffset(curve, isHole ? distIntoMaterial : -distIntoMaterial);
  }

  /**
   * Bucles de la sección de un muro que sigue TODOS los contornos del letrero
   * (exterior + agujeros), de espesor `thickness`, con su cara exterior a
   * `baseInset` del contorno nominal. Interpretados con EvenOdd.
   */
  wallLoops(contour: Contour, thickness: number, baseInset = 0): Polygon2D[] {
    const loops = [
      this.boundaryAt(contour.outer, false, baseInset),
      this.boundaryAt(contour.outer, false, baseInset + thickness),
    ];
    for (const hole of contour.holes) {
      loops.push(this.boundaryAt(hole, true, baseInset));
      loops.push(this.boundaryAt(hole, true, baseInset + thickness));
    }
    return loops;
  }

  /** Bucles del panel difusor: forma completa inseted por `distance`. */
  panelLoops(contour: Contour, distance: number): Polygon2D[] {
    const loops = [this.boundaryAt(contour.outer, false, distance)];
    for (const hole of contour.holes) {
      loops.push(this.boundaryAt(hole, true, distance));
    }
    return loops;
  }

  /** Extruye una lista de bucles (EvenOdd). */
  async extrudeLoops(loops: readonly Polygon2D[], height: number): Promise<Mesh3D> {
    return this.engine.extrudeLoops(loops, height, "EvenOdd");
  }

  /** Extruye la forma completa de un contorno. */
  async extrudeContour(contour: Contour, height: number): Promise<Mesh3D> {
    return this.extrudeLoops([contour.outer, ...contour.holes], height);
  }

  union(a: Mesh3D, b: Mesh3D): Promise<Mesh3D> {
    return this.engine.union(a, b);
  }

  difference(a: Mesh3D, b: Mesh3D): Promise<Mesh3D> {
    return this.engine.difference(a, b);
  }
}
