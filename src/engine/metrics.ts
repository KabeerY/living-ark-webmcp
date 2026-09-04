import type { ArkMetrics, ArkSnapshot } from "./types";

export const OVERHEAT_THRESHOLD = 85;
const THERMAL_EPSILON = 1e-8;

function isOverheated(temperature: number): boolean {
  return temperature > OVERHEAT_THRESHOLD + THERMAL_EPSILON;
}

export function summarizeArk(snapshot: ArkSnapshot): ArkMetrics {
  const critical = snapshot.cells.filter((cell) => cell.critical);
  const overheatedCells = snapshot.cells.filter((cell) => isOverheated(cell.temperature)).length;
  const overheatedCriticalCells = critical.filter((cell) => isOverheated(cell.temperature)).length;
  const fracturedEdges = snapshot.edges.filter((edge) => edge.fractured).length;
  const criticalCells = critical.length;
  const peakTemperature = Math.max(...snapshot.cells.map((cell) => cell.temperature));
  const peakCriticalTemperature = critical.length
    ? Math.max(...critical.map((cell) => cell.temperature))
    : 0;
  const averageIntegrity =
    snapshot.cells.reduce((total, cell) => total + cell.integrity, 0) / Math.max(1, snapshot.cells.length);
  const totalCoolant = snapshot.cells.reduce((total, cell) => total + cell.coolant, 0);
  const heatScore = 1 - overheatedCells / Math.max(1, snapshot.cells.length * 0.36);
  const fractureScore = 1 - fracturedEdges / Math.max(1, snapshot.edges.length * 0.2);
  const stability = Math.max(0, Math.min(1, heatScore * 0.48 + fractureScore * 0.22 + averageIntegrity * 0.3));

  return {
    phase: snapshot.phase,
    cellCount: snapshot.cells.length,
    criticalCells,
    overheatedCells,
    overheatedCriticalCells,
    fracturedEdges,
    peakTemperature,
    peakCriticalTemperature,
    averageIntegrity,
    totalCoolant,
    stability,
  };
}

export function inspectSector(snapshot: ArkSnapshot, sector: string) {
  const cells = snapshot.cells.filter((cell) => cell.sector.toLowerCase() === sector.toLowerCase());
  const ids = new Set(cells.map((cell) => cell.id));
  const edges = snapshot.edges.filter((edge) => ids.has(edge.from) || ids.has(edge.to));

  return {
    sector: cells[0]?.sector ?? sector,
    revision: snapshot.revision,
    cellCount: cells.length,
    criticalCellIds: cells.filter((cell) => cell.critical).map((cell) => cell.id),
    overheatedCellIds: cells.filter((cell) => isOverheated(cell.temperature)).map((cell) => cell.id),
    peakTemperature: cells.length ? Math.max(...cells.map((cell) => cell.temperature)) : null,
    averageIntegrity: cells.length
      ? cells.reduce((total, cell) => total + cell.integrity, 0) / cells.length
      : null,
    fracturedEdgeIds: edges.filter((edge) => edge.fractured).map((edge) => edge.id),
    cells: cells.map((cell) => ({
      id: cell.id,
      kind: cell.kind,
      critical: cell.critical,
      temperature: Math.round(cell.temperature * 10) / 10,
      coolant: Math.round(cell.coolant * 10) / 10,
      integrity: Math.round(cell.integrity * 1_000) / 1_000,
    })),
  };
}
