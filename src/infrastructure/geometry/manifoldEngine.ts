import manifoldFactory, { type ManifoldToplevel, type SimplePolygon } from "manifold-3d";
import type { IGeometryEngine, Mesh3D, FillRule } from "../../domain/ports/IGeometryEngine";
import type { OffsetShapeInput } from "../../domain/ports/IOffsetService";
import type { Polygon2D } from "../../domain/value-objects/Polygon2D";

/**
 * Implementación de IGeometryEngine con manifold-3d (WASM).
 *
 * El WASM se inicializa una sola vez (módulo cargado vía `await init()`).
 * Esta clase es agnóstica del renderizador: devuelve Mesh3D con arrays
 * neutrales (Float32Array/Uint32Array) consumibles por Three.js, STL, etc.
 */
export class ManifoldEngine implements IGeometryEngine {
  private static toplevel: ManifoldToplevel | null = null;

  /** Inicializa el WASM de Manifold (idempotente). */
  static async init(): Promise<ManifoldToplevel> {
    if (!ManifoldEngine.toplevel) {
      const m = await manifoldFactory();
      m.setup();
      ManifoldEngine.toplevel = m;
    }
    return ManifoldEngine.toplevel;
  }

  async extrude(
    shape: OffsetShapeInput,
    height: number,
    fillRule: FillRule = "EvenOdd",
  ): Promise<Mesh3D> {
    if (height <= 0) {
      throw new Error("La altura de extrusión debe ser mayor que 0");
    }
    const m = await ManifoldEngine.init();

    const crossSection = m.CrossSection.ofPolygons(toSimplePolygons(shape), fillRule);

    const solid = m.Manifold.extrude(crossSection, height);
    const mesh = solid.getMesh();

    const vertices = mesh.vertProperties;
    // numProp >= 3; extraer solo posiciones XYZ interleaved.
    const positions = new Float32Array(mesh.numVert * 3);
    const numProp = mesh.numProp;
    for (let v = 0; v < mesh.numVert; v++) {
      positions[v * 3] = vertices[v * numProp];
      positions[v * 3 + 1] = vertices[v * numProp + 1];
      positions[v * 3 + 2] = vertices[v * numProp + 2];
    }

    const volume = solid.volume();
    solid.delete();
    crossSection.delete();

    return {
      vertices: positions,
      triangles: mesh.triVerts.slice(),
      volume,
      triangleCount: mesh.numTri,
    };
  }
}

function toSimplePolygons(shape: OffsetShapeInput): SimplePolygon[] {
  const result: SimplePolygon[] = [];
  addPolygon(result, shape.outer);
  for (const hole of shape.holes) addPolygon(result, hole);
  return result;
}

function addPolygon(out: SimplePolygon[], polygon: Polygon2D): void {
  const sp: SimplePolygon = polygon.points.map((p) => [p.x, p.y]);
  if (sp.length >= 3) out.push(sp);
}
