import { Container, Graphics } from "pixi.js";
import { PALETTE } from "../colors";

type Star = {
  x: number;
  y: number;
  size: number;
  color: number;
  alpha: number;
  twinklePhase: number;
  twinkleSpeed: number;
};

export class StarfieldBackground {
  public readonly container = new Container();
  private nebulaLayer = new Graphics();
  private starLayer = new Graphics();
  private stormLayer = new Graphics();
  private stars: Star[] = [];
  private readonly worldWidth: number;
  private readonly worldHeight: number;

  constructor(worldWidth: number, worldHeight: number, seed: number) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.container.addChild(this.nebulaLayer, this.stormLayer, this.starLayer);
    this.container.eventMode = "none";
    this.generateStars(seed);
    this.drawNebula();
  }

  private generateStars(seed: number): void {
    let state = seed ^ 0x91e10da5;
    const random = () => {
      state = Math.imul(state ^ (state >>> 15), state | 1);
      state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
      return ((state ^ (state >>> 14)) >>> 0) / 4_294_967_296;
    };

    // Extended field dimensions to accommodate camera movement and zoom out
    const marginX = this.worldWidth * 0.5;
    const marginY = this.worldHeight * 0.5;
    const minX = -marginX;
    const maxX = this.worldWidth + marginX;
    const minY = -marginY;
    const maxY = this.worldHeight + marginY;

    this.stars = [];
    const count = 380;
    for (let i = 0; i < count; i += 1) {
      const x = minX + random() * (maxX - minX);
      const y = minY + random() * (maxY - minY);
      const roll = random();
      const size = roll > 0.94 ? 3 : roll > 0.82 ? 2 : 1;
      const color =
        roll > 0.88
          ? PALETTE.sunAmber
          : roll > 0.65
            ? PALETTE.coolantLight
            : roll > 0.45
              ? PALETTE.lifeMint
              : PALETTE.warmCream;
      const alpha = 0.25 + random() * 0.65;
      this.stars.push({
        x,
        y,
        size,
        color,
        alpha,
        twinklePhase: random() * Math.PI * 2,
        twinkleSpeed: 0.8 + random() * 2.2,
      });
    }
  }

  private drawNebula(): void {
    const g = this.nebulaLayer;
    g.clear();

    // Restrained deep-space cosmic dust lanes (organic polygon bands, not giant geometric ovals)
    const dustBands = [
      // Upper port celestial lane (deep indigo)
      [
        -200, -100,
        600, -100,
        450, 300,
        -200, 220,
      ],
      // Starboard deep cosmic shadow (warm shadow)
      [
        1100, -100,
        1800, -100,
        1800, 450,
        1250, 350,
      ],
      // Ventral stardust drift (deep night-blue)
      [
        200, 680,
        1400, 660,
        1600, 1000,
        0, 1000,
      ],
    ];

    for (const poly of dustBands) {
      g.poly(poly).fill({
        color: PALETTE.nightBlue,
        alpha: 0.18,
      });
    }
  }

  public update(elapsedMs: number, isCritical: boolean): void {
    const time = elapsedMs * 0.001;
    const g = this.starLayer;
    g.clear();

    // Render twinkling stars and drifting cosmic dust
    for (const star of this.stars) {
      const pulse = (Math.sin(time * star.twinkleSpeed + star.twinklePhase) + 1) * 0.5;
      const a = star.alpha * (0.55 + 0.45 * pulse);
      g.rect(Math.round(star.x), Math.round(star.y), star.size, star.size).fill({
        color: star.color,
        alpha: a,
      });
      // Subtle 4-directional diffraction sparkle on select bright 3px stars
      if (star.size === 3 && pulse > 0.82) {
        g.rect(Math.round(star.x - 1), Math.round(star.y + 1), 5, 1).fill({
          color: PALETTE.whiteHeat,
          alpha: a * 0.35,
        });
        g.rect(Math.round(star.x + 1), Math.round(star.y - 1), 1, 5).fill({
          color: PALETTE.whiteHeat,
          alpha: a * 0.35,
        });
      }
    }

    // Dynamic starboard ion storm front (restrained organic curtain, no giant ellipses)
    this.stormLayer.clear();
    if (isCritical) {
      const stormPulse = (Math.sin(time * 1.8) + 1) * 0.5;
      const stormAlpha = 0.04 + 0.04 * stormPulse;

      // Restrained ion curtain on far starboard edge of the cosmos
      this.stormLayer
        .poly([
          this.worldWidth * 0.88, -100,
          this.worldWidth + 300, -100,
          this.worldWidth + 300, this.worldHeight + 100,
          this.worldWidth * 0.84, this.worldHeight + 100,
          this.worldWidth * 0.82, this.worldHeight * 0.48,
        ])
        .fill({ color: PALETTE.ionViolet, alpha: stormAlpha });

      // Subtle ion filament streamers
      for (let i = 0; i < 4; i++) {
        const streamY = 180 + i * 160 + Math.sin(time * 2.0 + i) * 20;
        const streamX = this.worldWidth * 0.86 + Math.cos(time * 1.5 + i) * 30;
        this.stormLayer
          .moveTo(streamX, streamY)
          .lineTo(streamX + 120, streamY + 24)
          .stroke({ color: PALETTE.ember, width: 1, alpha: 0.12 + stormPulse * 0.1 });
      }
    }
  }
}
