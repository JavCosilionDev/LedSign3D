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
 *
 * El worker se crea de forma DIFERIDA (en la primera generación) y `dispose()`
 * lo libera y lo deja en `null`. Así, el doble montaje de React StrictMode en
 * desarrollo (montar → desmontar → montar, que invoca `dispose()` durante el
 * desmontaje simulado) no deja al gateway apuntando a un worker ya terminado.
 * La factoría de worker es inyectable para poder testear el transporte.
 */
export class GeometryWorkerGateway implements IGeometryGateway {
  private worker: Worker | null = null;
  private nextId = 1;
  private readonly pending = new Map<
    number,
    { resolve: (assemblies: Assembly[]) => void; reject: (err: Error) => void }
  >();

  constructor(private readonly createWorker: () => Worker = defaultWorkerFactory) {}

  generateAssemblies(contours: readonly Contour[], settings: ProjectSettings): Promise<Assembly[]> {
    const worker = this.ensureWorker();
    const id = this.nextId++;
    const request: WorkerRequest = {
      id,
      type: "generate",
      contours,
      settings: settings.toJSON(),
    };
    return new Promise<Assembly[]>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      worker.postMessage(request);
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.rejectAll(new Error("Worker finalizado"));
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;

    const worker = this.createWorker();
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
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
    worker.onerror = (event) => {
      this.rejectAll(new Error(event.message || "Error en el worker de geometría"));
    };

    this.worker = worker;
    return worker;
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
