import type { ArkSnapshot } from "./types";

export function cloneSnapshot(snapshot: ArkSnapshot): ArkSnapshot {
  return {
    ...snapshot,
    cells: snapshot.cells.map((cell) => ({ ...cell })),
    edges: snapshot.edges.map((edge) => ({ ...edge })),
    events: snapshot.events.map((event) => ({
      ...event,
      cellIds: event.cellIds ? [...event.cellIds] : undefined,
      edgeIds: event.edgeIds ? [...event.edgeIds] : undefined,
    })),
  };
}
