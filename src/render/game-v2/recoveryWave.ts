import { Container, Graphics } from "pixi.js";
import { PALETTE } from "../colors";
import type { ArkSnapshot } from "../../engine/types";
import type { ParticleSystem } from "./particles";

export type RecoveryTransition = {
  from: ArkSnapshot;
  to: ArkSnapshot;
  elapsed: number;
  duration: number;
};

export class RecoveryWaveController {
  public readonly container = new Container();
  private waveGraphics = new Graphics();
  public currentTransition: RecoveryTransition | null = null;

  constructor() {
    this.container.addChild(this.waveGraphics);
    this.container.eventMode = "none";
  }

  public startTransition(from: ArkSnapshot, to: ArkSnapshot): void {
    const isToStable = to.phase === "stable";
    this.currentTransition = {
      from,
      to,
      elapsed: 0,
      duration: isToStable ? 2900 : 1100,
    };
  }

  public update(
    deltaMS: number,
    particles: ParticleSystem,
    onInterpolate: (progress: number, from: ArkSnapshot, to: ArkSnapshot) => void,
    onComplete: (finalSnapshot: ArkSnapshot) => void,
  ): void {
    if (!this.currentTransition) {
      this.waveGraphics.clear();
      return;
    }

    const t = this.currentTransition;
    t.elapsed += deltaMS;
    const linear = Math.min(1, t.elapsed / t.duration);
    // Smooth easeInOutQuad
    const progress = linear < 0.5 ? 2 * linear * linear : 1 - Math.pow(-2 * linear + 2, 2) / 2;

    onInterpolate(progress, t.from, t.to);

    // Render visual recovery sweep wave
    this.waveGraphics.clear();
    const worldW = t.to.worldWidth;
    const worldH = t.to.worldHeight;

    // Physical sweep moving from left/reservoirs towards aft damage zone
    const waveX = Math.round(180 + progress * (worldW - 260));

    // Glowing vertical nanite wavefront
    this.waveGraphics
      .poly([
        waveX - 32, 140,
        waveX + 16, 140,
        waveX + 38, 436,
        waveX + 12, 730,
        waveX - 36, 730,
        waveX - 8, 436,
      ])
      .fill({
        color: PALETTE.coolantLight,
        alpha: 0.05 + Math.sin(progress * Math.PI) * 0.16,
      });

    // Wavefront leading edge line
    this.waveGraphics
      .moveTo(waveX, 160)
      .lineTo(waveX + 14, 436)
      .lineTo(waveX - 6, 710)
      .stroke({
        color: PALETTE.warmCream,
        width: 3,
        alpha: 0.35 + Math.sin(progress * Math.PI) * 0.55,
      });

    // Spawn nanites along the wavefront
    if (Math.random() < 0.6) {
      const ny = 200 + Math.random() * 450;
      particles.spawnNaniteStream(waveX - 20, ny, waveX + 30, ny + (Math.random() - 0.5) * 40);
    }

    if (linear >= 1) {
      const finalSnapshot = t.to;
      this.currentTransition = null;
      this.waveGraphics.clear();
      onComplete(finalSnapshot);
    }
  }
}
