import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Assembly } from "../../domain/entities/Assembly";
import type { PartType } from "../../domain/entities/Part";
import { layoutAssemblies } from "./assemblyPlacement";
import { toBufferGeometry } from "./threeMeshConversion";

/** Colores por tipo de pieza (coherentes con la leyenda del plan: tapa=verde, panel=cian, base=gris). */
const PART_COLORS: Record<PartType, number> = {
  base: 0x5b6b7c,
  tapa: 0x2e8b57,
  "panel-difusor": 0x9fd8ff,
};

const PART_OPACITY: Record<PartType, number> = {
  base: 1,
  tapa: 1,
  "panel-difusor": 0.7,
};

const GRID_COLOR = 0x2a2f3a;
const GRID_COLOR2 = 0x1d2129;
const GRID_MARGIN = 1.3; // la cuadrícula cubre la huella del modelo con ~30 % de margen
const MIN_GRID_SIZE = 40;

/**
 * Gestor de la escena Three.js: renderizador, cámara, iluminación,
 * controles de órbita y sincronización con los ensamblajes del proyecto.
 * El eje Z del modelo (altura) se mapea a Y (arriba) en Three.js.
 *
 * El modelo se centra horizontalmente sobre el origen (centro de la
 * cuadrícula) y la cuadrícula se redimensiona para abarcar toda la huella
 * con margen, justo bajo la base del modelo.
 */
export class ViewerScene {
  private container: HTMLElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: OrbitControls | null = null;
  private readonly root = new THREE.Group();
  private grid: THREE.GridHelper | null = null;
  private frameId = 0;
  private resizeObserver: ResizeObserver | null = null;

  init(container: HTMLElement): void {
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.9));

    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(120, 200, 80);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-120, 60, -120);
    this.scene.add(fill);

    this.grid = createGridHelper(MIN_GRID_SIZE);
    this.scene.add(this.grid);

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      4000,
    );

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;

    this.scene.add(this.root);

    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(container);

    this.render();
  }

  /** Reemplaza el contenido 3D por los ensamblajes dados, centra el modelo y encuadra la cámara. */
  setAssemblies(assemblies: readonly Assembly[]): void {
    if (!this.scene) return;
    this.clearRoot();
    this.root.position.set(0, 0, 0);

    const layout = layoutAssemblies(assemblies);
    for (const item of layout.items) {
      for (const { part, zOffset } of item.placements) {
        if (!part.mesh) continue;
        const geometry = toBufferGeometry(part.mesh);
        const material = new THREE.MeshStandardMaterial({
          color: PART_COLORS[part.type],
          transparent: PART_OPACITY[part.type] < 1,
          opacity: PART_OPACITY[part.type],
          roughness: 0.5,
          metalness: 0.15,
        });
        const mesh = new THREE.Mesh(geometry, material);
        // Mapear Z (altura del modelo) → Y (arriba) en el mundo de Three.js.
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(item.xOffset, zOffset, 0);
        this.root.add(mesh);
      }
    }

    this.centerAndSizedGrid();
    this.frameCamera();
  }

  dispose(): void {
    cancelAnimationFrame(this.frameId);
    this.resizeObserver?.disconnect();
    this.clearRoot();
    this.disposeGrid();
    this.controls?.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
    this.renderer = null;
    this.scene = null;
    this.controls = null;
    this.container = null;
  }

  /** Centra el modelo horizontalmente en el origen y dimensiona la cuadrícula a su huella. */
  private centerAndSizedGrid(): void {
    this.root.updateWorldMatrix(true, false);
    const box = new THREE.Box3().setFromObject(this.root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Centrar sobre el origen (centro de la cuadrícula) en X y Z; la base
    // permanece en Y (el grid se coloca justo bajo la base).
    this.root.position.set(-center.x, 0, -center.z);

    if (this.root.children.length > 0) {
      const footprint = Math.max(size.x, size.z);
      const gridSize = Math.max(MIN_GRID_SIZE, footprint * GRID_MARGIN);
      const gridY = box.min.y - 0.5;
      this.disposeGrid();
      this.grid = createGridHelper(gridSize);
      this.grid.position.y = gridY;
      this.scene?.add(this.grid);
    }
  }

  private disposeGrid(): void {
    if (!this.grid) return;
    this.scene?.remove(this.grid);
    this.grid.geometry.dispose();
    const material = this.grid.material as THREE.Material;
    material.dispose();
    this.grid = null;
  }

  private clearRoot(): void {
    for (const child of [...this.root.children]) {
      this.root.remove(child);
      disposeObject(child);
    }
  }

  private frameCamera(): void {
    if (!this.camera || !this.controls || this.root.children.length === 0) return;
    this.root.updateWorldMatrix(true, false);
    const box = new THREE.Box3().setFromObject(this.root);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1);
    const distance = maxDim * 2.2;

    this.controls.target.copy(center);
    this.camera.near = Math.max(maxDim / 1000, 0.01);
    this.camera.far = Math.max(distance * 10, 100);
    this.camera.aspect = this.aspectRatio();
    this.camera.position.set(
      center.x + distance * 0.75,
      center.y + distance * 0.85,
      center.z + distance * 0.95,
    );
    this.camera.lookAt(center);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  private onResize(): void {
    if (!this.container || !this.camera || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private aspectRatio(): number {
    if (!this.container) return 1;
    return this.container.clientWidth / Math.max(this.container.clientHeight, 1);
  }

  private render = (): void => {
    this.frameId = requestAnimationFrame(this.render);
    this.controls?.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };
}

function createGridHelper(size: number): THREE.GridHelper {
  const divisions = Math.max(10, Math.min(80, Math.round(size / 10)));
  return new THREE.GridHelper(size, divisions, GRID_COLOR, GRID_COLOR2);
}

function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) material.dispose();
    }
  });
}
