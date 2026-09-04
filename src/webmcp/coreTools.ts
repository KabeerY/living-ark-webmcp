import { z } from "zod";
import { hashSnapshot } from "../engine/hash";
import { inspectSector, OVERHEAT_THRESHOLD, summarizeArk } from "../engine/metrics";
import { SECTOR_NAMES, type ArkSnapshot } from "../engine/types";
import type { ModelContext, SiteTool, ToolResult } from "./types";

function result(text: string, structuredContent: Record<string, unknown>): ToolResult {
  return { content: [{ type: "text", text }], structuredContent };
}

export async function registerCoreTools(
  modelContext: ModelContext,
  getSnapshot: () => ArkSnapshot,
  signal: AbortSignal,
): Promise<void> {
  const registerTool = (tool: SiteTool) => modelContext.registerTool(tool, { signal });

  await registerTool({
    name: "inspect_ark",
    description:
      "Inspect the live Living Ark at its current canonical revision. Returns global stability, critical systems, resources, and exact crisis counts. This tool is read-only.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: () => {
      const snapshot = getSnapshot();
      const metrics = summarizeArk(snapshot);
      return result(
        `The Ark is ${metrics.phase}. ${metrics.overheatedCriticalCells} critical cells exceed the ${OVERHEAT_THRESHOLD}-degree hard limit (${metrics.overheatedCells} overheated globally), ${metrics.fracturedEdges} network edges are fractured, and stability is ${Math.round(metrics.stability * 100)}%.`,
        { revision: snapshot.revision, tick: snapshot.tick, stateHash: hashSnapshot(snapshot), metrics },
      );
    },
  });

  await registerTool({
    name: "inspect_crisis",
    description:
      "Inspect the current ion-storm failure chain, endangered systems, and emergency-stasis boundary. This tool is read-only and does not advance the simulation.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: () => {
      const snapshot = getSnapshot();
      const critical = snapshot.cells
        .filter((cell) => cell.critical)
        .map((cell) => ({ id: cell.id, sector: cell.sector, temperature: Math.round(cell.temperature * 10) / 10 }))
        .sort((left, right) => right.temperature - left.temperature || left.id - right.id);
      const criticalSectors = [...new Set(critical.map((cell) => cell.sector))].map((sector) => {
        const cells = critical.filter((cell) => cell.sector === sector);
        return {
          sector,
          criticalCells: cells.length,
          overheatedCriticalCells: cells.filter((cell) => cell.temperature > OVERHEAT_THRESHOLD + 1e-8).length,
          peakCriticalTemperature: Math.max(...cells.map((cell) => cell.temperature)),
        };
      });
      const metrics = summarizeArk(snapshot);
      const stable = snapshot.phase === "stable";
      return result(
        stable
          ? "The ion-storm cascade has been contained. Certified thermal routes held every critical system within the hard limit through the delayed horizon."
          : "An ion storm fractured the starboard thermal mesh. A heat cascade is moving through the Thermal Choir toward the Cryovault and Sunwell. Emergency stasis is holding a critical but recoverable boundary.",
        {
          revision: snapshot.revision,
          phase: snapshot.phase,
          criticalHardTemperatureLimit: OVERHEAT_THRESHOLD,
          overheatedCriticalCells: metrics.overheatedCriticalCells,
          peakCriticalTemperature: metrics.peakCriticalTemperature,
          criticalCellCount: critical.length,
          hottestCriticalCells: critical.slice(0, 12),
          criticalCellsTruncated: critical.length > 12,
          criticalSectors,
          events: snapshot.events.map((event) => ({
            sequence: event.sequence,
            tick: event.tick,
            type: event.type,
            message: event.message,
            affectedCells: event.cellIds?.length ?? 0,
            affectedEdges: event.edgeIds?.length ?? 0,
          })),
          thisInspectionMutatesCanonicalArk: false,
        },
      );
    },
  });

  await registerTool({
    name: "inspect_sector",
    description:
      "Inspect one named Ark sector as a bounded semantic state slice, including exact cells, temperatures, coolant, integrity, and fractured edge IDs. This tool is read-only.",
    inputSchema: {
      type: "object",
      properties: {
        sector: {
          type: "string",
          enum: SECTOR_NAMES,
          description: "Exact Ark sector name.",
        },
      },
      required: ["sector"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: (args) => {
      const parsed = z.object({ sector: z.enum(SECTOR_NAMES) }).parse(args);
      const snapshot = getSnapshot();
      const inspection = inspectSector(snapshot, parsed.sector);
      return result(
        `${parsed.sector} contains ${inspection.cellCount} cells, ${inspection.overheatedCellIds.length} overheated cells, and ${inspection.fracturedEdgeIds.length} connected fractured edges.`,
        inspection,
      );
    },
  });
}
