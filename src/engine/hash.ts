import type { ArkSnapshot } from "./types";

export function hashString(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function hashSnapshot(snapshot: ArkSnapshot): string {
  const stableShape = {
    seed: snapshot.seed,
    tick: snapshot.tick,
    revision: snapshot.revision,
    phase: snapshot.phase,
    cells: snapshot.cells.map((cell) => [
      cell.id,
      Math.round(cell.temperature * 1_000),
      Math.round(cell.coolant * 1_000),
      Math.round(cell.energy * 1_000),
      Math.round(cell.atmosphere * 1_000),
      Math.round(cell.matter * 1_000),
      Math.round(cell.integrity * 1_000),
    ]),
    edges: snapshot.edges.map((edge) => [
      edge.id,
      edge.active,
      edge.fractured,
      edge.dormant,
      Math.round(edge.flow * 1_000),
      Math.round(edge.integrity * 1_000),
    ]),
  };

  return hashString(JSON.stringify(stableShape));
}
