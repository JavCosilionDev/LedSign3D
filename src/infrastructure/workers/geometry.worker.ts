import { handleWorkerMessage, type WorkerRequest, type WorkerResponse } from "./geometryWorkerCore";
import { assemblyParts } from "../../domain/entities/Assembly";
import type { Assembly } from "../../domain/entities/Assembly";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

/** Recoge los ArrayBuffers de las mallas para transferirlos sin copiar. */
function collectTransferables(assemblies: readonly Assembly[]): ArrayBuffer[] {
  const transfer: ArrayBuffer[] = [];
  for (const assembly of assemblies) {
    for (const part of assemblyParts(assembly)) {
      if (part.mesh) {
        transfer.push(
          part.mesh.vertices.buffer as ArrayBuffer,
          part.mesh.triangles.buffer as ArrayBuffer,
        );
      }
    }
  }
  return transfer;
}

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  if (msg.type !== "generate") return;

  void handleWorkerMessage(msg).then((response: WorkerResponse) => {
    if (response.type === "result") {
      ctx.postMessage(response, collectTransferables(response.assemblies));
    } else {
      ctx.postMessage(response);
    }
  });
};
