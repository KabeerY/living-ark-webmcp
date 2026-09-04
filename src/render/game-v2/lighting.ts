import { Container, Graphics } from "pixi.js";
import { mixColor, PALETTE } from "../colors";
import type { PlayableCaretaker } from "./caretaker";

export class LightingSystem {
  public readonly container = new Container();
  private lightGraphics = new Graphics();
  private shadowGraphics = new Graphics();
  private alarmTimer = 0;

  constructor() {
    this.container.addChild(this.shadowGraphics, this.lightGraphics);
    this.container.eventMode = "none";
    this.lightGraphics.blendMode = "add";
  }

  public update(
    deltaMS: number,
    isCritical: boolean,
    isStable: boolean,
    caretaker: PlayableCaretaker,
  ): void {
    this.alarmTimer += deltaMS;

    const g = this.lightGraphics;
    g.clear();

    const time = this.alarmTimer * 0.001;
    const reactorPulse = (Math.sin(time * 3.0) + 1) * 0.5;
    const strobe = (Math.sin(time * 7.5) + 1) * 0.5;

    // 1. Sunwell Hero Singularity Core
    g.circle(748, 384, 8).fill({
      color: PALETTE.whiteHeat,
      alpha: 0.95,
    });
    g.circle(748, 384, 16 + reactorPulse * 4).fill({
      color: isStable ? PALETTE.coolantLight : PALETTE.sunAmber,
      alpha: 0.5 + reactorPulse * 0.2,
    });
    // Radiant filament rays
    for (let i = 0; i < 6; i++) {
      const angle = time * 1.5 + (i * Math.PI) / 3;
      const rayLen = 28 + Math.sin(time * 4.0 + i) * 8;
      g.moveTo(748, 384)
        .lineTo(748 + Math.cos(angle) * rayLen, 384 + Math.sin(angle) * rayLen)
        .stroke({ color: isStable ? PALETTE.coolantLight : PALETTE.sunAmber, width: 2, alpha: 0.4 });
    }

    // 2. Navigation Bridge (Holographic console display bloom)
    g.rect(184, 406, 20, 8).fill({
      color: PALETTE.coolantLight,
      alpha: 0.28,
    });

    // 3. Verdant Ring & Arboretum (Downward UV grow lamp cones)
    for (const vx of [380, 470, 560]) {
      // Downward light trapezoid from ceiling fixture to deck
      g.poly([
        vx - 6, 196,
        vx + 6, 196,
        vx + 18, 280,
        vx - 18, 280,
      ]).fill({
        color: PALETTE.lifeMint,
        alpha: 0.08,
      });
      // Small luminaire bulb
      g.rect(vx - 4, 194, 8, 2).fill({ color: PALETTE.whiteHeat, alpha: 0.85 });
    }

    // Concourse downward lamps
    for (const ax of [390, 480, 570]) {
      g.poly([
        ax - 6, 336,
        ax + 6, 336,
        ax + 16, 420,
        ax - 16, 420,
      ]).fill({
        color: PALETTE.sunAmber,
        alpha: 0.06,
      });
    }

    // 4. Memory Reef (Crystalline data pillar vertical light guides)
    for (const mx of [910, 990, 1060]) {
      g.rect(mx + 6, 240, 4, 36).fill({
        color: PALETTE.sunAmber,
        alpha: 0.28,
      });
      g.circle(mx + 8, 244, 4).fill({
        color: PALETTE.whiteHeat,
        alpha: 0.65,
      });
    }

    // 5. Cryovault (Subzero cryogenic frost glow inside pod tubes)
    for (let i = 0; i < 4; i++) {
      const px = 1190 + i * 48;
      g.rect(px + 6, 238, 4, 38).fill({
        color: PALETTE.coolantLight,
        alpha: 0.4,
      });
      g.circle(px + 8, 242, 3).fill({
        color: PALETTE.whiteHeat,
        alpha: 0.7,
      });
    }

    // 6. Atmosphere Lungs (Turbine intake glow)
    const lungPulse = (Math.sin(time * 2.0) + 1) * 0.5;
    g.circle(440, 590, 12 + lungPulse * 4).fill({
      color: PALETTE.coolantTeal,
      alpha: 0.25 + lungPulse * 0.1,
    });

    // 7. Heavy Engineering Turbine (Central stator spark glow)
    g.circle(746, 582, 10).fill({
      color: isStable ? PALETTE.coolantLight : PALETTE.sunAmber,
      alpha: 0.45 + reactorPulse * 0.2,
    });

    // 8. Nanite Foundry (Crucible weld point)
    g.circle(962, 584, 4).fill({
      color: PALETTE.whiteHeat,
      alpha: 0.85,
    });

    // 9. Thermal Choir Crisis Alarm / Stable Glow
    if (isCritical) {
      // Rotating directional emergency lighthouse beacon
      const beaconAngle = time * 6.0;
      const bx = 1290;
      const by = 390;
      const beamDist = 120;
      const cos = Math.cos(beaconAngle);
      const sin = Math.sin(beaconAngle);

      // Dual opposite sweep beams
      g.poly([
        bx, by,
        bx + cos * beamDist - sin * 16, by + sin * beamDist + cos * 16,
        bx + cos * beamDist + sin * 16, by + sin * beamDist - cos * 16,
      ]).fill({
        color: PALETTE.alarmRed,
        alpha: 0.4,
      });
      g.poly([
        bx, by,
        bx - cos * beamDist + sin * 16, by - sin * beamDist - cos * 16,
        bx - cos * beamDist - sin * 16, by - sin * beamDist + cos * 16,
      ]).fill({
        color: PALETTE.alarmRed,
        alpha: 0.4,
      });

      // Beacon bulb strobe core
      g.circle(bx, by, 8 + strobe * 4).fill({
        color: PALETTE.alarmRed,
        alpha: 0.6 + strobe * 0.4,
      });
      g.circle(bx, by, 3).fill({
        color: PALETTE.whiteHeat,
        alpha: 0.95,
      });

      // Molten fracture fissure fire glow
      g.rect(1270, 410, 20, 10).fill({
        color: PALETTE.ember,
        alpha: 0.45 + strobe * 0.25,
      });
    } else if (isStable) {
      // Serene turquoise radiator flow
      g.rect(1220, 390, 120, 6).fill({
        color: PALETTE.coolantLight,
        alpha: 0.35,
      });
    }

    // 10. Caretaker Focused Flashlight (Directional visor cone)
    const vx = caretaker.x + caretaker.facing * 10;
    const vy = caretaker.y - 15;
    g.ellipse(vx, vy, 10, 8).fill({
      color: PALETTE.whiteHeat,
      alpha: 0.7,
    });
    // Long crisp spotlight cone
    const beamLen = 70;
    const fx = vx + caretaker.facing * beamLen;
    g.poly([
      vx, vy - 3,
      fx, vy - 26,
      fx, vy + 26,
      vx, vy + 3,
    ]).fill({
      color: PALETTE.coolantLight,
      alpha: 0.24,
    });
  }
}
