import type { Assembly } from "../../domain/entities/Assembly";
import type { Contour } from "../../domain/entities/Contour";
import type { ProjectSettings } from "../../domain/value-objects/ProjectSettings";
import type { IGeometryGateway } from "../../application/ports/IGeometryGateway";
import type { WorkerRequest, WorkerResponse } from "./geometryWorkerCore";

/**
 * Implementación de IGeometryGateway mediante un Web Worker de módulo.
 *
 * Envía los contornos (ya parseados en el hilo principal) y la configuración;
 * recibe los ensamblajes con las mallas transferidas por ArrayBuffer.
 * La factoría de worker es inyectable para poder testear el transporte.
 */
export class GeometryWorkerGateway implements IGeometryGateway {
  private readonly worker: Worker;
  private nextId = 1;
  private readonly pending = new Map<
    number,
    { resolve: (assemblies: Assembly[]) => void; reject: (err: Error) => void }
  >();

  constructor(createWorker: () => Worker = defaultWorkerFactory) {
    this.worker = createWorker();
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data;
      const entry = this.pending.get(msg.id);
      if (!entry) return;
      this.pending.delete(msg.id);
      if (msg.type === "result") {
        entry.resolve(msg.assemblies);
      } else {
        entry.reject(new Error(msg.error));
      }
    };
    this.worker.onerror = (event) => {
      this.rejectAll(new Error(event.message || "Error en el worker de geometría"));
    };
  }

  generateAssemblies(contours: readonly Contour[], settings: ProjectSettings): Promise<Assembly[]> {
    const id = this.nextId++;
    const request: WorkerRequest = {
      id,
      type: "generate",
      contours,
      settings: settings.toJSON(),
    };
    return new Promise<Assembly[]>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage(request);
    });
  }

  dispose(): void {
    this.worker.terminate();
    this.rejectAll(new Error("Worker finalizado"));
  }

  private rejectAll(err: Error): void {
    for (const entry of this.pending.values()) entry.reject(err);
    this.pending.clear();
  }
}

function defaultWorkerFactory(): Worker {
  return new Worker(new URL("./geometry.worker.ts", import.meta.url), {
    type: "module",
  });
}
