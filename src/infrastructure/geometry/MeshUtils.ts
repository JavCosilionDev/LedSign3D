import type { Mesh3D } from "../../domain/ports/IGeometryEngine";

export interface MeshBounds {
  readonly width: number;
  readonly depth: number;
  readonly height: number;
}

/** Dimensiones del bounding box de una malla (X=ancho, Y=prof., Z=altura). */
export function meshBounds(mesh: Mesh3D): MeshBounds {
  const v = mesh.vertices;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  const n = v.length / 3;
  for (let i = 0; i < n; i++) {
    const x = v[i * 3];
    const y = v[i * 3 + 1];
    const z = v[i * 3 + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  return {
    width: maxX - minX,
    depth: maxY - minY,
    height: maxZ - minZ,
  };
}

/** Devuelve una copia de la malla desplazada en Z. */
export function translateMeshZ(mesh: Mesh3D, dz: number): Mesh3D {
  if (dz === 0) return mesh;
  const vertices = mesh.vertices.slice();
  for (let i = 2; i < vertices.length; i += 3) {
    vertices[i] += dz;
  }
  return { ...mesh, vertices };
}
