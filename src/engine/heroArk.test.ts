import { describe, expect, it } from "vitest";
import { hashSnapshot } from "./hash";
import { createHeroArk } from "./heroArk";
import { summarizeArk } from "./metrics";

describe("hero Ark generation", () => {
  it("is deterministic for the same seed", () => {
    const left = createHeroArk(12345);
    const right = createHeroArk(12345);
    expect(hashSnapshot(left)).toBe(hashSnapshot(right));
    expect(left).toEqual(right);
  });

  it("creates a critical, recoverable-looking world with real topology", () => {
    const snapshot = createHeroArk();
    const metrics = summarizeArk(snapshot);
    expect(snapshot.cells.length).toBeGreaterThan(300);
    expect(snapshot.edges.length).toBeGreaterThan(snapshot.cells.length);
    expect(metrics.phase).toBe("critical");
    expect(metrics.overheatedCells).toBeGreaterThan(0);
    expect(metrics.fracturedEdges).toBeGreaterThan(0);
    expect(metrics.peakTemperature).toBeGreaterThan(85);
    expect(metrics.stability).toBeGreaterThan(0);
    expect(metrics.stability).toBeLessThan(1);
  });

  it("never generates invalid physical quantities", () => {
    for (let seed = 1; seed <= 32; seed += 1) {
      const snapshot = createHeroArk(seed);
      for (const cell of snapshot.cells) {
        expect(Number.isFinite(cell.temperature)).toBe(true);
        expect(cell.coolant).toBeGreaterThanOrEqual(0);
        expect(cell.energy).toBeGreaterThanOrEqual(0);
        expect(cell.atmosphere).toBeGreaterThanOrEqual(0);
        expect(cell.matter).toBeGreaterThanOrEqual(0);
        expect(cell.integrity).toBeGreaterThanOrEqual(0);
        expect(cell.integrity).toBeLessThanOrEqual(1);
      }
      for (const edge of snapshot.edges) {
        expect(edge.from).not.toBe(edge.to);
        expect(snapshot.cells[edge.from]).toBeDefined();
        expect(snapshot.cells[edge.to]).toBeDefined();
        expect(edge.capacity).toBeGreaterThan(0);
        expect(edge.flow).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
