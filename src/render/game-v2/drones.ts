import { Container, Graphics, Sprite } from "pixi.js";
import { PALETTE } from "../colors";
import type { SpriteSheetAtlas } from "./pixelAtlas";

type DroneUnit = {
  id: string;
  points: Array<{ x: number; y: number }>;
  currentLeg: number;
  progress: number;
  speed: number;
  sprite: Sprite;
  facing: 1 | -1;
  scanColor: number;
  bobPhase: number;
};

export class DroneSystem {
  public readonly container = new Container();
  private scanGraphics = new Graphics();
  private atlas: SpriteSheetAtlas;
  private drones: DroneUnit[] = [];
  private animTimer = 0;
  private animFrame = 0;

  constructor(atlas: SpriteSheetAtlas) {
    this.atlas = atlas;
    this.container.addChild(this.scanGraphics);
    this.container.eventMode = "none";
    this.initializePatrolDrones();
  }

  private initializePatrolDrones(): void {
    // 3 Autonomous maintenance drones on distinct sector patrol loops
    const routes = [
      // Drone 1: Forward & Upper Patrol (Navigation -> Verdant -> Memory)
      {
        id: "drone_alpha",
        points: [
          { x: 260, y: 290 },
          { x: 480, y: 270 },
          { x: 740, y: 285 },
          { x: 960, y: 270 },
          { x: 740, y: 285 },
          { x: 480, y: 270 },
        ],
        speed: 0.045,
        scanColor: PALETTE.coolantLight,
      },
      // Drone 2: Main Deck Patrol (Bridge -> Sunwell -> Reservoirs)
      {
        id: "drone_beta",
        points: [
          { x: 310, y: 425 },
          { x: 620, y: 425 },
          { x: 740, y: 415 },
          { x: 920, y: 425 },
          { x: 1080, y: 425 },
          { x: 920, y: 425 },
          { x: 620, y: 425 },
        ],
        speed: 0.038,
        scanColor: PALETTE.sunAmber,
      },
      // Drone 3: Crisis / Aft Patrol (Cryovault <-> Thermal Choir <-> Fabrication)
      {
        id: "drone_gamma",
        points: [
          { x: 1180, y: 280 },
          { x: 1280, y: 390 },
          { x: 1340, y: 490 },
          { x: 1260, y: 580 },
          { x: 1080, y: 610 },
          { x: 1260, y: 580 },
          { x: 1340, y: 490 },
        ],
        speed: 0.052,
        scanColor: PALETTE.ember,
      },
    ];

    for (const r of routes) {
      const sprite = new Sprite(this.atlas.getTexture("drone_0"));
      sprite.anchor.set(0.5);
      this.container.addChild(sprite);
      this.drones.push({
        id: r.id,
        points: r.points,
        currentLeg: 0,
        progress: Math.random(),
        speed: r.speed,
        sprite,
        facing: 1,
        scanColor: r.scanColor,
        bobPhase: Math.random() * Math.PI * 2,
      });
    }
  }

  public update(deltaMS: number, isCritical: boolean): void {
    const dt = Math.min(deltaMS, 64) * 0.001;
    this.animTimer += deltaMS;
    if (this.animTimer > 180) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 2;
    }

    this.scanGraphics.clear();

    for (const d of this.drones) {
      d.progress += d.speed * dt;
      if (d.progress >= 1) {
        d.progress = 0;
        d.currentLeg = (d.currentLeg + 1) % d.points.length;
      }

      const nextLeg = (d.currentLeg + 1) % d.points.length;
      const p1 = d.points[d.currentLeg];
      const p2 = d.points[nextLeg];

      const curX = p1.x + (p2.x - p1.x) * d.progress;
      d.bobPhase += dt * 3;
      const curY = p1.y + (p2.y - p1.y) * d.progress + Math.sin(d.bobPhase) * 4;

      d.facing = p2.x >= p1.x ? 1 : -1;
      d.sprite.scale.x = d.facing;
      d.sprite.texture = this.atlas.getTexture(`drone_${this.animFrame}`);
      d.sprite.position.set(Math.round(curX), Math.round(curY));

      // Sensor scan beam projected forward/down
      const beamLength = 28;
      const beamAngle = d.facing === 1 ? 0.35 : Math.PI - 0.35;
      const bx = curX + Math.cos(beamAngle) * beamLength;
      const by = curY + Math.sin(beamAngle) * beamLength;

      const scanColor = isCritical && d.id === "drone_gamma" ? PALETTE.ember : d.scanColor;

      this.scanGraphics
        .poly([curX, curY + 2, bx - 6, by, bx + 6, by])
        .fill({ color: scanColor, alpha: 0.12 });
      this.scanGraphics
        .moveTo(curX, curY + 2)
        .lineTo(bx, by)
        .stroke({ color: scanColor, width: 1, alpha: 0.35 });
    }
  }
}
