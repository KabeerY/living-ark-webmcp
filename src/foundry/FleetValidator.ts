import type { CompiledThermalCapability } from "./schema";
import type { ValidationReport } from "./validator";

type WorkerResponse =
  | { requestId: string; ok: true; report: ValidationReport }
  | { requestId: string; ok: false; error: string };

export class FleetValidator {
  private readonly worker: Worker;
  private readonly pending = new Map<
    string,
    { resolve: (report: ValidationReport) => void; reject: (error: Error) => void }
  >();

  constructor() {
    this.worker = new Worker(new URL("./validator.worker.ts", import.meta.url), { type: "module" });
    this.worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
      const pending = this.pending.get(event.data.requestId);
      if (!pending) return;
      this.pending.delete(event.data.requestId);
      if (event.data.ok) pending.resolve(event.data.report);
      else pending.reject(new Error(event.data.error));
    });
    this.worker.addEventListener("error", (event) => {
      const error = new Error(event.message || "Counterfactual Fleet worker failed.");
      for (const request of this.pending.values()) request.reject(error);
      this.pending.clear();
    });
  }

  validate(capability: CompiledThermalCapability, seeds: number[]): Promise<ValidationReport> {
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.worker.postMessage({ requestId, capability, seeds });
    });
  }

  destroy(): void {
    this.worker.terminate();
    const error = new Error("Counterfactual Fleet validator was destroyed.");
    for (const request of this.pending.values()) request.reject(error);
    this.pending.clear();
  }
}
