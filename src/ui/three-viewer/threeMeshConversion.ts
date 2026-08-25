import * as THREE from "three";
import type { Mesh3D } from "../../domain/ports/IGeometryEngine";

/**
 * Convierte una malla neutral (Mesh3D) a una BufferGeometry de Three.js.
 * Las posiciones son interleaved XYZ; los triángulos son índices Uint32.
 */
export function toBufferGeometry(mesh: Mesh3D): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(mesh.vertices, 3));
  geometry.setIndex(new THREE.BufferAttribute(mesh.triangles, 1));
  geometry.computeVertexNormals();
  return geometry;
}
