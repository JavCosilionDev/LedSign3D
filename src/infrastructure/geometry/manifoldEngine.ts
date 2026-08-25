import manifoldFactory, {
  type ManifoldToplevel,
  type SimplePolygon,
  type Mesh as ManifoldMesh,
  type Manifold as ManifoldType,
} from "manifold-3d";
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

  async extrudeLoops(
    loops: readonly Polygon2D[],
    height: number,
    fillRule: FillRule = "EvenOdd",
  ): Promise<Mesh3D> {
    if (height <= 0) {
      throw new Error("La altura de extrusión debe ser mayor que 0");
    }
    const simple: SimplePolygon[] = [];
    for (const loop of loops) addPolygon(simple, loop);
    if (simple.length === 0) {
      throw new Error("No hay contornos para extruir");
    }

    const m = await ManifoldEngine.init();
    const crossSection = m.CrossSection.ofPolygons(simple, fillRule);
    const solid = m.Manifold.extrude(crossSection, height);
    const mesh3d = this.finalize(solid);
    crossSection.delete();
    return mesh3d;
  }

  async extrude(
    shape: OffsetShapeInput,
    height: number,
    fillRule: FillRule = "EvenOdd",
  ): Promise<Mesh3D> {
    return this.extrudeLoops([shape.outer, ...shape.holes], height, fillRule);
  }

  async union(a: Mesh3D, b: Mesh3D): Promise<Mesh3D> {
    const m = await ManifoldEngine.init();
    const ma = this.meshToManifold(m, a);
    const mb = this.meshToManifold(m, b);
    const result = ma.add(mb);
    const mesh3d = this.finalize(result);
    ma.delete();
    mb.delete();
    return mesh3d;
  }

  async difference(a: Mesh3D, b: Mesh3D): Promise<Mesh3D> {
    const m = await ManifoldEngine.init();
    const ma = this.meshToManifold(m, a);
    const mb = this.meshToManifold(m, b);
    const result = ma.subtract(mb);
    const mesh3d = this.finalize(result);
    ma.delete();
    mb.delete();
    return mesh3d;
  }

  private meshToManifold(m: ManifoldToplevel, mesh3d: Mesh3D): ManifoldType {
    const mesh = new m.Mesh({
      numProp: 3,
      vertProperties: mesh3d.vertices,
      triVerts: mesh3d.triangles,
    });
    return m.Manifold.ofMesh(mesh as ManifoldMesh);
  }

  /** Extrae posiciones/índices/volumen de un sólido y libera su memoria WASM. */
  private finalize(solid: ManifoldType): Mesh3D {
    const mesh = solid.getMesh();
    const numProp = mesh.numProp;
    const positions = new Float32Array(mesh.numVert * 3);
    for (let v = 0; v < mesh.numVert; v++) {
      positions[v * 3] = mesh.vertProperties[v * numProp];
      positions[v * 3 + 1] = mesh.vertProperties[v * numProp + 1];
      positions[v * 3 + 2] = mesh.vertProperties[v * numProp + 2];
    }
    const volume = solid.volume();
    solid.delete();
    return {
      vertices: positions,
      triangles: mesh.triVerts.slice(),
      volume,
      triangleCount: mesh.numTri,
    };
  }
}

function addPolygon(out: SimplePolygon[], polygon: Polygon2D): void {
  const sp: SimplePolygon = polygon.points.map((p) => [p.x, p.y]);
  if (sp.length >= 3) out.push(sp);
}
