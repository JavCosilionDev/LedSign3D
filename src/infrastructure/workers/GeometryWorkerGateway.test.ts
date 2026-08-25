import { describe, it, expect, beforeEach } from "vitest";
import { GeometryWorkerGateway } from "./GeometryWorkerGateway";
import { ProjectSettings } from "../../domain/value-objects/ProjectSettings";
import type { Contour } from "../../domain/entities/Contour";
import type { Assembly } from "../../domain/entities/Assembly";

class FakeWorker {
  onmessage: ((e: MessageEvent<unknown>) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  posted: unknown[] = [];
  terminated = false;

  postMessage(data: unknown): void {
    this.posted.push(data);
  }
  terminate(): void {
    this.terminated = true;
  }
}

const contour: Contour = {
  id: "c1",
  name: "forma-1",
  outer: {
    isClosed: true,
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ],
  },
  holes: [],
  boundingBox: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
};

function respond(
  worker: FakeWorker,
  payload: { id: number; type: "result" | "error"; assemblies?: Assembly[]; error?: string },
): void {
  worker.onmessage?.({ data: payload } as MessageEvent<unknown>);
}

describe("GeometryWorkerGateway", () => {
  let worker: FakeWorker;
  let createWorker: () => Worker;
  let gateway: GeometryWorkerGateway;

  beforeEach(() => {
    worker = new FakeWorker();
    createWorker = () => worker as unknown as Worker;
    gateway = new GeometryWorkerGateway(createWorker);
  });

  it("no crea el worker hasta la primera generación", () => {
    expect(worker.posted).toHaveLength(0);
  });

  it("envía la solicitud de generación con la configuración serializada", () => {
    const settings = ProjectSettings.create();
    void gateway.generateAssemblies([contour], settings);

    expect(worker.posted).toHaveLength(1);
    expect(worker.posted[0]).toMatchObject({ id: 1, type: "generate", contours: [contour] });
    expect((worker.posted[0] as { settings: Record<string, number> }).settings).toEqual(
      settings.toJSON(),
    );
  });

  it("resuelve con los ensamblajes al recibir un resultado", async () => {
    const promise = gateway.generateAssemblies([contour], ProjectSettings.create());
    const assemblies: Assembly[] = [{ contourId: "c1" }];
    respond(worker, { id: 1, type: "result", assemblies });

    await expect(promise).resolves.toEqual(assemblies);
  });

  it("rechaza con el mensaje de error del worker", async () => {
    const promise = gateway.generateAssemblies([contour], ProjectSettings.create());
    respond(worker, { id: 1, type: "error", error: "boom" });

    await expect(promise).rejects.toThrow("boom");
  });

  it("rechaza las solicitudes pendientes ante un error no capturado del worker", async () => {
    const promise = gateway.generateAssemblies([contour], ProjectSettings.create());
    worker.onerror?.(new Event("error"));
    await expect(promise).rejects.toThrow();
  });

  it("termina el worker al hacer dispose", async () => {
    const promise = gateway.generateAssemblies([contour], ProjectSettings.create());
    gateway.dispose();
    expect(worker.terminated).toBe(true);
    await expect(promise).rejects.toThrow();
  });

  it("recrea el worker tras dispose (doble montaje de StrictMode)", async () => {
    // Primer uso crea el worker; dispose lo termina (simula el desmontaje).
    const first = gateway.generateAssemblies([contour], ProjectSettings.create());
    gateway.dispose();
    await expect(first).rejects.toThrow();

    // La siguiente generación debe recrear el worker y responder con normalidad.
    const second = gateway.generateAssemblies([contour], ProjectSettings.create());
    respond(worker, { id: 2, type: "result", assemblies: [{ contourId: "c1" }] });
    await expect(second).resolves.toEqual([{ contourId: "c1" }]);
    expect(worker.posted).toHaveLength(2);
  });
});
