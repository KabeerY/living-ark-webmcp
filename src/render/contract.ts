import type { ArkSnapshot, SystemLens } from "../engine/types";

/**
 * Stable boundary between the application and whichever world renderer is active.
 *
 * A visual fork can replace `ArkRenderer` without importing or mutating the Ark
 * engine, the Foundry, or the WebMCP registration layer.
 */
export type ArkRendererOptions = {
  host: HTMLElement;
  snapshot: ArkSnapshot;
  lens: SystemLens;
  onSelectCell: (cellId: number) => void;
};

export interface ArkRendererContract {
  init(): Promise<void>;
  transitionToSnapshot(next: ArkSnapshot): void;
  setLens(lens: SystemLens): void;
  setSelectedCell(cellId: number | null): void;
  frameCell(cellId: number): void;
  frameArk(): void;
  panBy(dx: number, dy: number): void;
  destroy(): void;
}

export type ArkRendererConstructor = new (options: ArkRendererOptions) => ArkRendererContract;
