import { mixColor, PALETTE } from "../colors";
import type { ArkCell, ArkEdge, SystemLens } from "../../engine/types";
import { OVERHEAT_THRESHOLD } from "../../engine/metrics";

export class LensVisualizer {
  public static getCellColor(cell: ArkCell, lens: SystemLens): number {
    if (lens === "thermal") {
      const heat = Math.max(0, Math.min(1, (cell.temperature - 32) / 85));
      return heat > 0.72
        ? mixColor(PALETTE.ember, PALETTE.whiteHeat, (heat - 0.72) / 0.28)
        : mixColor(PALETTE.coolantDark, PALETTE.ember, heat / 0.72);
    }

    if (lens === "energy") {
      return mixColor(PALETTE.hullInk, PALETTE.sunAmber, cell.energy / 100);
    }

    if (lens === "atmosphere") {
      return mixColor(PALETTE.hullInk, PALETTE.lifeMint, cell.atmosphere / 100);
    }

    if (lens === "structure") {
      return mixColor(PALETTE.alarmRed, PALETTE.warmCream, cell.integrity);
    }

    // Default "living" mode: highlight overheating hazards
    if (cell.temperature >= OVERHEAT_THRESHOLD) {
      return mixColor(PALETTE.ember, PALETTE.whiteHeat, Math.min(1, (cell.temperature - 85) / 55));
    }

    switch (cell.kind) {
      case "reactor":
        return PALETTE.sunAmber;
      case "reservoir":
        return PALETTE.coolantTeal;
      case "garden":
        return PALETTE.moss;
      case "cryo":
        return PALETTE.warmCream;
      case "fabricator":
        return PALETTE.terracotta;
      case "memory":
        return PALETTE.brass;
      case "shell":
        return PALETTE.warmShadow;
      default:
        return PALETTE.brass;
    }
  }

  public static getEdgeColor(edge: ArkEdge, lens: SystemLens): number {
    if (lens !== "living" && lens !== edge.network) {
      return PALETTE.hullInk;
    }

    if (edge.fractured) {
      return PALETTE.alarmRed;
    }

    switch (edge.network) {
      case "thermal":
        return PALETTE.coolantTeal;
      case "energy":
        return PALETTE.sunAmber;
      case "atmosphere":
        return PALETTE.lifeMint;
      case "structural":
      default:
        return PALETTE.warmCream;
    }
  }

  public static getEdgeAlpha(edge: ArkEdge, lens: SystemLens): number {
    if (lens === "living") {
      if (edge.fractured) return 0.85;
      if (edge.network === "thermal") return edge.dormant ? 0.25 : 0.65;
      return 0.35;
    }

    const isRelevant = lens === edge.network;
    if (isRelevant) {
      return edge.dormant ? 0.3 : 0.85;
    }
    return 0.08; // De-emphasize non-relevant networks
  }
}
