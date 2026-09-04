import { createHeroArk } from "../engine/heroArk";
import type { ArkSnapshot } from "../engine/types";

export class ArkStore {
  private snapshot: ArkSnapshot;
  private listeners = new Set<() => void>();

  constructor(snapshot = createHeroArk()) {
    this.snapshot = snapshot;
  }

  getSnapshot = (): ArkSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  replace(snapshot: ArkSnapshot): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener();
  }
}

export const arkStore = new ArkStore();
