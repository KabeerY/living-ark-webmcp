import type { CompiledThermalCapability } from "./schema";
import { validateThermalCapability } from "./validator";

type ValidationRequest = {
  requestId: string;
  capability: CompiledThermalCapability;
  seeds: number[];
};

self.addEventListener("message", (event: MessageEvent<ValidationRequest>) => {
  const { requestId, capability, seeds } = event.data;
  try {
    const report = validateThermalCapability(capability, seeds);
    self.postMessage({ requestId, ok: true, report });
  } catch (error) {
    self.postMessage({
      requestId,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
