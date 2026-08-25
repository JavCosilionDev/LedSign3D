import type { IStlExporter, StlFormat } from "../../domain/ports/IStlExporter";
import type { Mesh3D } from "../../domain/ports/IGeometryEngine";
import type { Point3D } from "../../domain/value-objects/Point3D";

const BINARY_HEADER_SIZE = 80;
const BYTES_PER_TRIANGLE = 50; // normal(12) + 3 vértices(36) + atributo(2)

/**
 * Exportador STL (binario por defecto, ASCII opcional) a partir de una
 * malla neutral Mesh3D. Funciona en navegador y Node.
 */
export class StlExporter implements IStlExporter {
  exportMesh(mesh: Mesh3D, options: { format?: StlFormat; name?: string } = {}): Blob {
    const format = options.format ?? "binary";
    return format === "binary"
      ? this.toBinary(mesh, options.name)
      : this.toAscii(mesh, options.name);
  }

  /** STL binario: cabecera de 80 bytes, cuenta de triángulos (LE) y triángulos. */
  toBinary(mesh: Mesh3D, name?: string): Blob {
    const triCount = mesh.triangleCount;
    const buffer = new ArrayBuffer(BINARY_HEADER_SIZE + 4 + triCount * BYTES_PER_TRIANGLE);
    const view = new DataView(buffer);

    writeHeaderName(view, name);
    view.setUint32(BINARY_HEADER_SIZE, triCount, true);

    let offset = BINARY_HEADER_SIZE + 4;
    for (let t = 0; t < triCount; t++) {
      const v0 = this.vertexAt(mesh, mesh.triangles[t * 3]);
      const v1 = this.vertexAt(mesh, mesh.triangles[t * 3 + 1]);
      const v2 = this.vertexAt(mesh, mesh.triangles[t * 3 + 2]);
      const normal = faceNormal(v0, v1, v2);

      writeVec3(view, offset, normal);
      offset += 12;
      writeVec3(view, offset, v0);
      writeVec3(view, offset + 12, v1);
      writeVec3(view, offset + 24, v2);
      offset += 36;
      view.setUint16(offset, 0, true);
      offset += 2;
    }

    return new Blob([buffer], { type: "model/stl" });
  }

  /** STL ASCII: faceta por triángulo. */
  toAscii(mesh: Mesh3D, name?: string): Blob {
    const solidName = name ? sanitizeName(name) : "ledsign3d";
    let out = `solid ${solidName}\n`;
    for (let t = 0; t < mesh.triangleCount; t++) {
      const v0 = this.vertexAt(mesh, mesh.triangles[t * 3]);
      const v1 = this.vertexAt(mesh, mesh.triangles[t * 3 + 1]);
      const v2 = this.vertexAt(mesh, mesh.triangles[t * 3 + 2]);
      const normal = faceNormal(v0, v1, v2);
      out += `  facet normal ${fmt(normal.x)} ${fmt(normal.y)} ${fmt(normal.z)}\n`;
      out += `    outer loop\n`;
      out += `      vertex ${fmt(v0.x)} ${fmt(v0.y)} ${fmt(v0.z)}\n`;
      out += `      vertex ${fmt(v1.x)} ${fmt(v1.y)} ${fmt(v1.z)}\n`;
      out += `      vertex ${fmt(v2.x)} ${fmt(v2.y)} ${fmt(v2.z)}\n`;
      out += `    endloop\n`;
      out += `  endfacet\n`;
    }
    out += `endsolid ${solidName}\n`;
    return new Blob([out], { type: "model/stl" });
  }

  private vertexAt(mesh: Mesh3D, index: number): Point3D {
    return {
      x: mesh.vertices[index * 3],
      y: mesh.vertices[index * 3 + 1],
      z: mesh.vertices[index * 3 + 2],
    };
  }
}

function writeHeaderName(view: DataView, name?: string): void {
  if (!name) return;
  const clean = sanitizeName(name);
  for (let i = 0; i < clean.length && i < BINARY_HEADER_SIZE; i++) {
    view.setUint8(i, clean.charCodeAt(i));
  }
}

function writeVec3(view: DataView, offset: number, v: Point3D): void {
  view.setFloat32(offset, v.x, true);
  view.setFloat32(offset + 4, v.y, true);
  view.setFloat32(offset + 8, v.z, true);
}

/** Normal de cara (producto cruz normalizado); (0,0,0) si degenerada. */
function faceNormal(a: Point3D, b: Point3D, c: Point3D): Point3D {
  const ux = b.x - a.x;
  const uy = b.y - a.y;
  const uz = b.z - a.z;
  const vx = c.x - a.x;
  const vy = c.y - a.y;
  const vz = c.z - a.z;
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz);
  if (len < 1e-12) return { x: 0, y: 0, z: 0 };
  return { x: nx / len, y: ny / len, z: nz / len };
}

function fmt(n: number): string {
  return n.toFixed(6);
}

function sanitizeName(name: string): string {
  return (
    name
      .replace(/[^\x20-\x7e]/g, "_")
      .trim()
      .slice(0, 79) || "ledsign3d"
  );
}
