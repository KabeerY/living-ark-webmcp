import { Application, Container, Graphics, Sprite, type Texture } from "pixi.js";
import { Viewport } from "pixi-viewport";
import type { ArkCell, ArkSnapshot, SystemLens } from "../engine/types";
import { OVERHEAT_THRESHOLD } from "../engine/metrics";
import { mixColor, PALETTE } from "./colors";
import { loadArkAtlas, type ArkAtlas } from "./atlas";
import type { ArkRendererContract, ArkRendererOptions } from "./contract";

const CELL_SIZE = 24;

type LivingSprite = {
  sprite: Sprite;
  role: "hull" | "garden" | "lungs" | "sunwell" | "memory" | "fabrication" | "cryo" | "reservoir" | "thermal";
  baseScale: number;
  baseY: number;
  phase: number;
};

const CARETAKER_ROUTES: ReadonlyArray<{
  points: ReadonlyArray<readonly [number, number]>;
  period: number;
  phase: number;
}> = [
  {
    points: [[282, 408], [424, 390], [580, 414], [746, 432], [916, 420], [1_088, 452], [916, 420], [746, 432], [580, 414], [424, 390]],
    period: 12_800,
    phase: 0.08,
  },
  {
    points: [[382, 618], [548, 638], [706, 594], [876, 614], [1_046, 646], [1_176, 594], [1_046, 646], [876, 614], [706, 594], [548, 638]],
    period: 15_600,
    phase: 0.46,
  },
  {
    points: [[1_126, 292], [1_230, 336], [1_324, 390], [1_350, 498], [1_314, 586], [1_242, 530], [1_214, 426]],
    period: 10_900,
    phase: 0.71,
  },
];

function pointOnLoop(points: ReadonlyArray<readonly [number, number]>, progress: number): [number, number] {
  const wrapped = ((progress % 1) + 1) % 1;
  const scaled = wrapped * points.length;
  const index = Math.floor(scaled) % points.length;
  const next = (index + 1) % points.length;
  const local = scaled - Math.floor(scaled);
  return [
    points[index][0] + (points[next][0] - points[index][0]) * local,
    points[index][1] + (points[next][1] - points[index][1]) * local,
  ];
}

function cellBaseColor(cell: ArkCell): number {
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

function cellColor(cell: ArkCell, lens: SystemLens): number {
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
  if (cell.temperature >= OVERHEAT_THRESHOLD) {
    return mixColor(PALETTE.ember, PALETTE.whiteHeat, Math.min(1, (cell.temperature - 85) / 55));
  }
  return cellBaseColor(cell);
}

function edgeColor(network: ArkSnapshot["edges"][number]["network"], lens: SystemLens): number {
  if (lens !== "living" && lens !== network) return PALETTE.hullInk;
  switch (network) {
    case "thermal":
      return PALETTE.coolantTeal;
    case "energy":
      return PALETTE.sunAmber;
    case "atmosphere":
      return PALETTE.lifeMint;
    default:
      return PALETTE.warmCream;
  }
}

export class ArkRenderer implements ArkRendererContract {
  private readonly host: HTMLElement;
  private snapshot: ArkSnapshot;
  private readonly onSelectCell: (cellId: number) => void;
  private app = new Application();
  private viewport: Viewport | null = null;
  private world = new Container();
  private sectorLayer = new Graphics();
  private livingLayer = new Graphics();
  private assetLayer = new Container();
  private networkLayer = new Graphics();
  private flowLayer = new Graphics();
  private cellLayer = new Container();
  private ambientLayer = new Graphics();
  private effectLayer = new Graphics();
  private cellGraphics = new Map<number, Graphics>();
  private selectedId: number | null = null;
  private lens: SystemLens;
  private resizeObserver: ResizeObserver | null = null;
  private elapsed = 0;
  private animationFrame = 0;
  private transition: { from: ArkSnapshot; to: ArkSnapshot; elapsed: number; duration: number } | null = null;
  private atlas: ArkAtlas | null = null;
  private livingSprites: LivingSprite[] = [];

  constructor(options: ArkRendererOptions) {
    this.host = options.host;
    this.snapshot = options.snapshot;
    this.lens = options.lens;
    this.onSelectCell = options.onSelectCell;
  }

  async init(): Promise<void> {
    await this.app.init({
      resizeTo: this.host,
      background: PALETTE.abyss,
      antialias: false,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      preference: "webgl",
    });

    this.app.canvas.className = "ark-canvas";
    this.host.replaceChildren(this.app.canvas);
    try {
      this.atlas = await loadArkAtlas();
    } catch (error) {
      // The semantic world and recovery animation remain usable when a
      // decorative atlas asset is unavailable on a preview host.
      console.warn("Living Ark atlas could not be loaded; continuing with the code-authored world.", error);
      this.atlas = null;
    }

    const viewport = new Viewport({
      screenWidth: this.host.clientWidth,
      screenHeight: this.host.clientHeight,
      worldWidth: this.snapshot.worldWidth,
      worldHeight: this.snapshot.worldHeight,
      events: this.app.renderer.events,
    });
    this.viewport = viewport;
    viewport.drag().pinch().wheel({ smooth: 5 }).decelerate({ friction: 0.92 });
    viewport.clampZoom({ minScale: 0.46, maxScale: 2.35 });
    viewport.clamp({ direction: "all" });
    this.app.stage.addChild(viewport);

    this.drawStarfield(viewport);
    this.drawHull();
    this.drawSectorMasses();
    this.drawLivingInterior();
    this.drawLivingAssets();
    this.world.addChild(
      this.sectorLayer,
      this.livingLayer,
      this.assetLayer,
      this.networkLayer,
      this.flowLayer,
      this.cellLayer,
      this.ambientLayer,
      this.effectLayer,
    );
    viewport.addChild(this.world);
    this.redrawNetworks();
    this.drawCells();
    this.setLens(this.lens);
    viewport.fit(true, this.snapshot.worldWidth * 1.08, this.snapshot.worldHeight * 1.08);
    viewport.moveCenter(this.snapshot.worldWidth / 2, this.snapshot.worldHeight / 2);

    this.app.ticker.add((ticker) => {
      this.elapsed += ticker.deltaMS;
      this.animate(ticker.deltaMS);
    });

    this.resizeObserver = new ResizeObserver(() => {
      if (!this.viewport) return;
      this.viewport.resize(this.host.clientWidth, this.host.clientHeight, this.snapshot.worldWidth, this.snapshot.worldHeight);
    });
    this.resizeObserver.observe(this.host);
  }

  private drawStarfield(viewport: Viewport): void {
    const stars = new Graphics();
    let state = this.snapshot.seed ^ 0x91e10da5;
    const random = () => {
      state = Math.imul(state ^ (state >>> 15), state | 1);
      state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
      return ((state ^ (state >>> 14)) >>> 0) / 4_294_967_296;
    };
    for (let index = 0; index < 230; index += 1) {
      const x = random() * this.snapshot.worldWidth;
      const y = random() * this.snapshot.worldHeight;
      const size = random() > 0.92 ? 2 : 1;
      const color = random() > 0.8 ? PALETTE.sunAmber : random() > 0.6 ? PALETTE.coolantLight : PALETTE.warmCream;
      stars.rect(Math.round(x), Math.round(y), size, size).fill({ color, alpha: 0.28 + random() * 0.65 });
    }
    viewport.addChild(stars);
  }

  private drawHull(): void {
    const hull = new Graphics();
    hull
      .poly([
        76, 430, 150, 282, 330, 160, 665, 86, 1_050, 116, 1_390, 256, 1_498, 426,
        1_378, 626, 1_055, 758, 654, 790, 314, 704, 132, 572,
      ])
      .stroke({ color: PALETTE.abyss, width: 28, alpha: 0.86 });
    hull
      .poly([
        76, 430, 150, 282, 330, 160, 665, 86, 1_050, 116, 1_390, 256, 1_498, 426,
        1_378, 626, 1_055, 758, 654, 790, 314, 704, 132, 572,
      ])
      .fill({ color: PALETTE.hullInk, alpha: 0.94 })
      .stroke({ color: PALETTE.warmCream, width: 9, alpha: 0.55 });
    hull
      .poly([
        92, 430, 174, 302, 344, 184, 672, 112, 1_034, 140, 1_356, 270, 1_466, 426,
        1_348, 600, 1_042, 730, 662, 760, 330, 678, 152, 558,
      ])
      .stroke({ color: PALETTE.brass, width: 3, alpha: 0.52 });
    const dorsalPlates = [
      [180, 270, 328, 178, 362, 194, 224, 298],
      [352, 172, 544, 122, 574, 136, 390, 197],
      [590, 112, 790, 102, 818, 121, 620, 139],
      [842, 111, 1_034, 137, 1_058, 160, 866, 137],
      [1_084, 153, 1_260, 218, 1_276, 248, 1_106, 181],
    ];
    for (let index = 0; index < dorsalPlates.length; index += 1) {
      hull.poly(dorsalPlates[index]).fill({ color: index % 2 === 0 ? PALETTE.warmShadow : PALETTE.hullInk, alpha: 0.74 })
        .stroke({ color: PALETTE.brass, width: 2, alpha: 0.3 });
    }
    const ventralPlates = [
      [186, 574, 326, 680, 366, 670, 226, 554],
      [354, 684, 548, 744, 586, 730, 392, 661],
      [620, 742, 816, 756, 844, 734, 646, 716],
      [874, 735, 1_064, 706, 1_088, 682, 898, 710],
      [1_112, 676, 1_286, 604, 1_302, 570, 1_136, 646],
    ];
    for (let index = 0; index < ventralPlates.length; index += 1) {
      hull.poly(ventralPlates[index]).fill({ color: index % 2 === 0 ? PALETTE.hullInk : PALETTE.warmShadow, alpha: 0.7 })
        .stroke({ color: PALETTE.brass, width: 2, alpha: 0.26 });
    }
    const ribs = [238, 354, 476, 602, 732, 864, 998, 1_128, 1_246, 1_350];
    for (const x of ribs) {
      const distance = Math.abs(x - 760) / 760;
      const halfHeight = 282 * (1 - distance * 0.58);
      hull
        .moveTo(x, 430 - halfHeight)
        .bezierCurveTo(x - 26, 330, x - 24, 530, x, 430 + halfHeight)
        .stroke({ color: PALETTE.warmCream, width: 2, alpha: 0.12 });
    }
    const tendrils = [
      [1_370, 286, 1_492, 222, 1_528, 244],
      [1_404, 334, 1_524, 302, 1_548, 326],
      [1_414, 516, 1_526, 554, 1_548, 534],
      [1_370, 584, 1_486, 650, 1_526, 628],
      [174, 338, 72, 294, 38, 318],
      [168, 526, 64, 570, 32, 548],
    ];
    for (const [x1, y1, x2, y2, x3, y3] of tendrils) {
      hull
        .moveTo(x1, y1)
        .bezierCurveTo(x2, y2, x2, y2, x3, y3)
        .stroke({ color: PALETTE.brass, width: 3, alpha: 0.62 });
      hull.rect(x3 - 2, y3 - 2, 4, 4).fill({ color: PALETTE.coolantLight, alpha: 0.6 });
    }
    this.world.addChild(hull);
  }

  private drawSectorMasses(): void {
    this.sectorLayer.clear();
    const sectorColors: Record<string, number> = {
      "Hull Skin": PALETTE.warmShadow,
      "Navigation Crown": PALETTE.brass,
      "Verdant Ring": PALETTE.moss,
      Sunwell: PALETTE.sunAmber,
      "Thermal Choir": PALETTE.coolantTeal,
      Cryovault: PALETTE.warmCream,
      "Atmosphere Lungs": PALETTE.lifeMint,
      "Fabrication Reef": PALETTE.terracotta,
      "Memory Reef": PALETTE.brass,
      Reservoirs: PALETTE.coolantDark,
    };
    const grouped = new Map<string, ArkCell[]>();
    for (const cell of this.snapshot.cells) {
      const sectorCells = grouped.get(cell.sector);
      if (sectorCells) sectorCells.push(cell);
      else grouped.set(cell.sector, [cell]);
    }
    for (const [sector, cells] of grouped) {
      const minX = Math.min(...cells.map((cell) => cell.x)) - 16;
      const maxX = Math.max(...cells.map((cell) => cell.x)) + 16;
      const minY = Math.min(...cells.map((cell) => cell.y)) - 16;
      const maxY = Math.max(...cells.map((cell) => cell.y)) + 16;
      const inset = 8 + (cells[0]?.id ?? 0) % 9;
      this.sectorLayer
        .poly([
          minX + inset, minY,
          maxX - inset, minY + 3,
          maxX, minY + inset,
          maxX - 4, maxY - inset,
          maxX - inset, maxY,
          minX + inset, maxY - 3,
          minX, maxY - inset,
          minX + 4, minY + inset,
        ])
        .fill({ color: sectorColors[sector] ?? PALETTE.warmShadow, alpha: sector === "Sunwell" ? 0.13 : 0.075 })
        .stroke({ color: sectorColors[sector] ?? PALETTE.warmShadow, width: 2, alpha: 0.16 });
    }
  }

  private pixelPanel(
    graphics: Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    alpha = 0.34,
    cut = 10,
  ): void {
    const membrane = [
      x + cut, y + 2,
      x + width * 0.43, y - 4,
      x + width - cut, y + 1,
      x + width + 3, y + cut,
      x + width - 2, y + height * 0.46,
      x + width + 2, y + height - cut,
      x + width - cut, y + height + 2,
      x + width * 0.58, y + height - 3,
      x + cut, y + height + 1,
      x - 3, y + height - cut,
      x + 2, y + height * 0.52,
      x - 2, y + cut,
    ];
    graphics.poly(membrane).stroke({ color: PALETTE.abyss, width: 12, alpha: 0.64 });
    graphics
      .poly(membrane)
      .fill({ color, alpha })
      .stroke({ color: mixColor(color, PALETTE.warmCream, 0.35), width: 3, alpha: 0.4 });
    graphics
      .poly([
        x + cut + 8, y + 9,
        x + width - cut - 5, y + 8,
        x + width - 8, y + cut + 7,
        x + width - 10, y + height - cut - 4,
        x + width - cut - 6, y + height - 9,
        x + cut + 7, y + height - 8,
        x + 8, y + height - cut - 5,
        x + 9, y + cut + 6,
      ])
      .stroke({ color: mixColor(color, PALETTE.hullInk, 0.62), width: 4, alpha: 0.42 });
  }

  private drawLivingInterior(): void {
    const g = this.livingLayer;
    const stable = this.snapshot.phase === "stable";
    g.clear();

    const deck = (points: number[], color: number, alpha: number) => {
      g.poly(points).stroke({ color: PALETTE.abyss, width: 18, alpha: 0.76 });
      g.poly(points)
        .fill({ color, alpha })
        .stroke({ color: mixColor(color, PALETTE.warmCream, 0.46), width: 4, alpha: 0.42 });
      g.poly(points).stroke({ color: PALETTE.brass, width: 1, alpha: 0.38 });
    };

    // Irregular inhabited deck-islands replace the old dashboard rectangles.
    deck([112, 400, 168, 322, 278, 290, 356, 330, 390, 408, 350, 500, 260, 548, 168, 508, 118, 448], PALETTE.warmShadow, 0.68);
    deck([300, 260, 320, 188, 430, 160, 570, 178, 666, 232, 650, 350, 570, 408, 426, 398, 330, 342], PALETTE.mossDark, 0.78);
    deck([292, 522, 320, 452, 402, 420, 552, 430, 644, 486, 634, 626, 552, 684, 402, 670, 320, 610], PALETTE.coolantDark, 0.54);
    deck([626, 372, 650, 280, 718, 250, 800, 272, 850, 340, 848, 520, 796, 590, 700, 580, 644, 512], PALETTE.warmShadow, 0.78);
    deck([806, 302, 818, 184, 934, 158, 1_070, 188, 1_132, 260, 1_114, 368, 1_012, 398, 870, 372], PALETTE.hullInk, 0.9);
    deck([808, 476, 828, 388, 1_080, 376, 1_130, 430, 1_086, 530, 860, 542], PALETTE.coolantDark, 0.68);
    deck([770, 596, 794, 520, 920, 500, 1_080, 520, 1_168, 590, 1_138, 710, 980, 738, 830, 686], PALETTE.terracotta, 0.52);
    deck([1_120, 190, 1_260, 178, 1_400, 230, 1_434, 330, 1_380, 420, 1_200, 430, 1_128, 358], PALETTE.coolantDark, 0.72);
    deck([1_128, 420, 1_260, 402, 1_408, 448, 1_458, 550, 1_404, 664, 1_230, 688, 1_120, 620], stable ? PALETTE.coolantDark : PALETTE.terracotta, stable ? 0.58 : 0.54);

    // A few architectural marks keep scale readable without turning rooms back
    // into grids. Most visual specificity now comes from the sprite landmarks.
    for (const [x, y, color] of [
      [174, 403, PALETTE.sunAmber], [202, 372, PALETTE.coolantLight], [236, 464, PALETTE.sunAmber],
      [358, 284, PALETTE.lifeMint], [618, 312, PALETTE.lifeMint], [872, 248, PALETTE.sunAmber],
      [1_096, 306, PALETTE.coolantLight], [1_178, 255, PALETTE.coolantLight], [1_394, 348, PALETTE.coolantLight],
    ] as const) {
      g.rect(x - 3, y - 3, 6, 6).fill({ color, alpha: 0.88 });
      g.rect(x - 7, y - 7, 14, 14).stroke({ color, width: 1, alpha: 0.22 });
    }

    // The Sunwell sits on an old concentric engine cradle.
    g.ellipse(748, 432, 96, 132).stroke({ color: PALETTE.brass, width: 6, alpha: 0.34 });
    g.ellipse(748, 432, 72, 102).stroke({ color: stable ? PALETTE.coolantTeal : PALETTE.sunAmber, width: 3, alpha: 0.46 });
    for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      const x1 = 748 + Math.cos(angle) * 72;
      const y1 = 432 + Math.sin(angle) * 102;
      const x2 = 748 + Math.cos(angle) * 102;
      const y2 = 432 + Math.sin(angle) * 140;
      g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: PALETTE.brass, width: 5, alpha: 0.38 });
    }

    // Curved arteries bind the rooms into one organism. These are visual
    // bundles; live edge truth still comes from networkLayer above them.
    const artery = (fromX: number, fromY: number, c1x: number, c1y: number, c2x: number, c2y: number, toX: number, toY: number, color: number) => {
      g.moveTo(fromX, fromY).bezierCurveTo(c1x, c1y, c2x, c2y, toX, toY)
        .stroke({ color: PALETTE.abyss, width: 15, alpha: 0.82 });
      g.moveTo(fromX, fromY).bezierCurveTo(c1x, c1y, c2x, c2y, toX, toY)
        .stroke({ color, width: 6, alpha: 0.55 });
      g.moveTo(fromX, fromY).bezierCurveTo(c1x, c1y, c2x, c2y, toX, toY)
        .stroke({ color: mixColor(color, PALETTE.warmCream, 0.55), width: 2, alpha: 0.5 });
    };
    artery(350, 406, 460, 386, 568, 430, 648, 432, PALETTE.brass);
    artery(640, 338, 684, 324, 702, 298, 724, 280, PALETTE.lifeMint);
    artery(642, 526, 682, 536, 706, 564, 724, 576, PALETTE.lifeMint);
    artery(844, 432, 920, 402, 1_046, 412, 1_126, 458, PALETTE.coolantTeal);
    artery(844, 486, 946, 520, 1_046, 564, 1_132, 600, PALETTE.sunAmber);
    artery(1_116, 340, 1_152, 370, 1_172, 408, 1_210, 438, PALETTE.coolantTeal);

    // Crisis language is localized to the Thermal Choir instead of washing the
    // whole map red. Stable state stitches the exact same scar with coolant.
    g.moveTo(1_310, 424).lineTo(1_330, 472).lineTo(1_314, 518).lineTo(1_342, 560).lineTo(1_324, 612).lineTo(1_350, 662)
      .stroke({ color: stable ? PALETTE.coolantLight : PALETTE.alarmRed, width: stable ? 5 : 9, alpha: stable ? 0.7 : 0.62 });
    if (!stable) {
      for (const [x, y] of [[1_296, 486], [1_336, 528], [1_312, 580], [1_360, 614]]) {
        g.moveTo(x - 10, y + 8).lineTo(x, y - 12).lineTo(x + 7, y + 5)
          .stroke({ color: PALETTE.ember, width: 4, alpha: 0.72 });
      }
    }
  }

  private addLivingSprite(
    texture: Texture,
    x: number,
    y: number,
    scale: number,
    role: LivingSprite["role"],
    options: { rotation?: number; alpha?: number; phase?: number } = {},
  ): Sprite {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.position.set(Math.round(x), Math.round(y));
    sprite.scale.set(scale);
    sprite.rotation = options.rotation ?? 0;
    sprite.alpha = options.alpha ?? 1;
    sprite.eventMode = "none";
    this.assetLayer.addChild(sprite);
    this.livingSprites.push({
      sprite,
      role,
      baseScale: scale,
      baseY: Math.round(y),
      phase: options.phase ?? this.livingSprites.length * 0.73,
    });
    return sprite;
  }

  private drawLivingAssets(): void {
    this.assetLayer.removeChildren();
    this.livingSprites = [];
    const atlas = this.atlas;
    if (!atlas) return;
    const texture = (column: number, row: number) => atlas.textureAt(column, row);
    const stable = this.snapshot.phase === "stable";

    // Layered hull-room clusters break the smooth schematic silhouette into a
    // hand-built inhabited vessel without replacing the canonical world mesh.
    this.addLivingSprite(texture(0, 0), 242, 302, 0.88, "hull", { rotation: -0.12, alpha: 0.96 });
    this.addLivingSprite(texture(2, 0), 486, 166, 0.78, "hull", { rotation: -0.05, alpha: 0.9 });
    this.addLivingSprite(texture(3, 0), 742, 132, 0.82, "hull", { alpha: 0.88 });
    this.addLivingSprite(texture(4, 0), 1_036, 175, 0.8, "hull", { rotation: 0.06, alpha: 0.9 });
    this.addLivingSprite(texture(1, 0), 302, 672, 0.84, "hull", { rotation: 0.1, alpha: 0.9 });
    this.addLivingSprite(texture(3, 0), 654, 744, 0.84, "hull", { alpha: 0.84 });
    this.addLivingSprite(texture(4, 0), 1_064, 695, 0.84, "hull", { rotation: -0.08, alpha: 0.86 });

    // Sector landmarks remain spatially aligned with the simulation's cells.
    this.addLivingSprite(texture(1, 1), 458, 286, 1.45, "garden", { phase: 0.2 });
    this.addLivingSprite(texture(4, 1), 584, 306, 0.98, "garden", { phase: 1.4, alpha: 0.96 });
    this.addLivingSprite(texture(2, 2), 492, 550, 1.38, "lungs", { phase: 0.7 });
    this.addLivingSprite(texture(stable ? 4 : 0, 3), 748, 432, 1.45, "sunwell", { phase: 2.1 });
    this.addLivingSprite(texture(1, 4), 920, 286, 1.25, "memory", { phase: 1.1 });
    this.addLivingSprite(texture(4, 4), 1_040, 294, 0.95, "memory", { phase: 2.6 });
    this.addLivingSprite(texture(2, 5), 982, 607, 1.35, "fabrication", { phase: 0.9 });
    this.addLivingSprite(texture(2, 6), 1_254, 316, 1.2, "cryo", { phase: 1.8 });
    this.addLivingSprite(texture(5, 6), 1_362, 354, 0.88, "cryo", { phase: 3.1 });
    this.addLivingSprite(texture(3, 7), 952, 454, 1.15, "reservoir", { phase: 1.7 });
    this.addLivingSprite(texture(0, 7), 1_078, 470, 0.84, "reservoir", { phase: 2.9 });

    // The hero damage swaps from a scorched organ to living vessels only after
    // the engine reaches canonical STABLE; it is not a UI-only green toggle.
    if (stable) {
      this.addLivingSprite(texture(4, 8), 1_273, 530, 1.35, "thermal", { rotation: 0.05, phase: 0.4 });
      this.addLivingSprite(texture(1, 8), 1_362, 594, 0.94, "thermal", { rotation: 0.22, phase: 2.2 });
    } else {
      this.addLivingSprite(texture(4, 9), 1_270, 535, 1.35, "thermal", { rotation: 0.04, phase: 0.4 });
      this.addLivingSprite(texture(1, 9), 1_370, 598, 0.94, "thermal", { rotation: 0.18, phase: 2.2 });
    }
  }

  private redrawNetworks(transitionProgress = 1): void {
    this.networkLayer.clear();
    const transition = this.transition;
    const cells = transition ? transition.to.cells : this.snapshot.cells;
    const targetEdges = transition ? transition.to.edges : this.snapshot.edges;
    for (const targetEdge of targetEdges) {
      const previousEdge = transition?.from.edges[targetEdge.id];
      const changed = Boolean(
        previousEdge &&
        (previousEdge.active !== targetEdge.active ||
          previousEdge.fractured !== targetEdge.fractured ||
          previousEdge.dormant !== targetEdge.dormant ||
          previousEdge.network !== targetEdge.network),
      );
      const revealAt = 0.12 + ((targetEdge.id * 37) % 101) / 101 * 0.7;
      const edge = changed && transitionProgress < revealAt && previousEdge ? previousEdge : targetEdge;
      const from = cells[edge.from];
      const to = cells[edge.to];
      const relevant = this.lens === edge.network;
      if (this.lens === "living" && !edge.fractured && edge.id % 31 !== 0) continue;
      if (this.lens !== "living" && !relevant && edge.id % 9 !== 0) continue;
      if (edge.fractured) {
        if (
          this.lens === "living" &&
          ((from.sector !== "Thermal Choir" && from.sector !== "Cryovault" && to.sector !== "Thermal Choir" && to.sector !== "Cryovault") ||
            edge.id % 2 !== 0)
        ) continue;
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;
        this.networkLayer
          .moveTo(from.x, from.y)
          .lineTo(mx - 4, my - 3)
          .moveTo(mx + 4, my + 3)
          .lineTo(to.x, to.y)
          .stroke({ color: PALETTE.alarmRed, width: relevant || this.lens === "living" ? 3 : 1, alpha: relevant || this.lens === "living" ? 0.72 : 0.14 });
        continue;
      }
      if (this.lens === "living") {
        const midpointX = (from.x + to.x) / 2;
        const midpointY = (from.y + to.y) / 2;
        const bend = (edge.id % 3 - 1) * 5;
        this.networkLayer
          .moveTo(from.x, from.y)
          .quadraticCurveTo(midpointX - bend, midpointY + bend, to.x, to.y)
          .stroke({ color: PALETTE.abyss, width: 8, alpha: 0.7 })
          .moveTo(from.x, from.y)
          .quadraticCurveTo(midpointX - bend, midpointY + bend, to.x, to.y)
          .stroke({ color: edgeColor(edge.network, this.lens), width: edge.network === "thermal" ? 3 : 2, alpha: edge.dormant ? 0.16 : 0.38 });
        continue;
      }
      this.networkLayer
        .moveTo(from.x, from.y)
        .lineTo(to.x, to.y)
        .stroke({
          color: edgeColor(edge.network, this.lens),
          width: relevant ? (edge.network === "thermal" ? 3 : 2) : 1,
          alpha: relevant ? (edge.dormant ? 0.24 : 0.58) : 0.07,
        });
    }
  }

  private drawCells(): void {
    for (const cell of this.snapshot.cells) {
      const graphics = new Graphics();
      graphics.eventMode = "static";
      graphics.cursor = "pointer";
      graphics.on("pointertap", () => {
        this.setSelectedCell(cell.id);
        this.onSelectCell(cell.id);
      });
      this.cellGraphics.set(cell.id, graphics);
      this.cellLayer.addChild(graphics);
      this.redrawCell(cell, graphics);
    }
  }

  private redrawCell(cell: ArkCell, graphics: Graphics): void {
    const selected = cell.id === this.selectedId;
    graphics.alpha = 1;
    graphics.scale.set(1);
    const heat = Math.max(0, Math.min(1, (cell.temperature - OVERHEAT_THRESHOLD) / 55));
    const livingLandmark =
      selected ||
      (cell.critical && heat > 0) ||
      (cell.kind === "habitat" ? cell.id % 83 === 0 :
        cell.kind === "shell" ? cell.id % 109 === 0 :
          cell.id % 47 === 0);
    graphics.visible = this.lens !== "living" || livingLandmark;
    graphics.clear();
    if (this.lens === "living") {
      if (!livingLandmark) return;
      const base = heat > 0 ? cellColor(cell, this.lens) : cellBaseColor(cell);
      const lampSize = selected ? 7 : heat > 0 ? 6 : 4;
      graphics.rect(cell.x - 11, cell.y - 11, 22, 22).fill({ color: PALETTE.abyss, alpha: 0.001 });
      if (heat > 0) {
        graphics.rect(cell.x - 9, cell.y - 9, 18, 18).fill({ color: PALETTE.ember, alpha: 0.1 + heat * 0.2 });
      }
      graphics
        .poly([cell.x, cell.y - lampSize, cell.x + lampSize, cell.y, cell.x, cell.y + lampSize, cell.x - lampSize, cell.y])
        .fill({ color: base, alpha: 0.92 })
        .stroke({ color: selected ? PALETTE.coolantLight : PALETTE.warmCream, width: selected ? 2 : 1, alpha: selected ? 0.92 : 0.34 });
      graphics.rect(cell.x - 1, cell.y - 1, 2, 2).fill({ color: PALETTE.whiteHeat, alpha: 0.76 });
      if (selected) graphics.ellipse(cell.x, cell.y, 16, 16).stroke({ color: PALETTE.coolantLight, width: 2, alpha: 0.62 });
      return;
    }
    const size = cell.kind === "reactor" ? CELL_SIZE + 9 : cell.critical ? CELL_SIZE + 4 : CELL_SIZE;
    const x = Math.round(cell.x - size / 2);
    const y = Math.round(cell.y - size / 2);
    const base = cellColor(cell, this.lens);
    const shadow = mixColor(base, PALETTE.hullInk, 0.48);
    const light = mixColor(base, PALETTE.warmCream, 0.28);
    if (heat > 0) {
      const glowSize = Math.round(size * (1.1 + heat * 0.45));
      graphics.rect(Math.round(cell.x - glowSize / 2), Math.round(cell.y - glowSize / 2), glowSize, glowSize).fill({
        color: PALETTE.ember,
        alpha: 0.08 + heat * 0.15,
      });
    }

    const outline = selected ? PALETTE.coolantLight : cell.critical ? PALETTE.warmCream : shadow;
    const bodyAlpha = cell.kind === "shell" ? 0.68 : 0.94;
    const body = [
      x + 4, y,
      x + size - 4, y,
      x + size, y + 4,
      x + size, y + size - 4,
      x + size - 4, y + size,
      x + 4, y + size,
      x, y + size - 4,
      x, y + 4,
    ];
    graphics.poly(body).fill({ color: base, alpha: bodyAlpha }).stroke({ color: outline, width: selected ? 3 : cell.critical ? 2 : 1, alpha: 0.82 });
    graphics.rect(x + 4, y + 3, Math.max(4, size - 8), 2).fill({ color: light, alpha: 0.42 });
    graphics.rect(x + 3, y + size - 5, Math.max(4, size - 6), 3).fill({ color: shadow, alpha: 0.52 });

    if (cell.kind === "reactor") {
      graphics.rect(cell.x - 7, cell.y - 7, 14, 14).fill({ color: shadow, alpha: 0.7 });
      graphics.rect(cell.x - 4, cell.y - 4, 8, 8).fill({ color: PALETTE.whiteHeat, alpha: 0.95 });
      graphics.rect(cell.x - 1, y - 3, 2, 5).fill({ color: PALETTE.sunAmber, alpha: 0.9 });
      graphics.rect(cell.x - 1, y + size - 2, 2, 5).fill({ color: PALETTE.sunAmber, alpha: 0.9 });
    } else if (cell.kind === "garden") {
      graphics.rect(cell.x - 7, cell.y - 2, 4, 5).fill({ color: PALETTE.mossDark, alpha: 0.9 });
      graphics.rect(cell.x - 2, cell.y - 6, 5, 9).fill({ color: PALETTE.lifeMint, alpha: 0.88 });
      graphics.rect(cell.x + 4, cell.y - 3, 3, 6).fill({ color: PALETTE.mossDark, alpha: 0.9 });
    } else if (cell.kind === "reservoir") {
      graphics.rect(cell.x - 6, cell.y - 6, 12, 12).fill({ color: PALETTE.coolantDark, alpha: 0.86 });
      graphics.rect(cell.x - 4, cell.y - 3, 8, 7).fill({ color: PALETTE.coolantLight, alpha: 0.9 });
      graphics.rect(cell.x - 4, cell.y - 3, 8, 2).fill({ color: PALETTE.warmCream, alpha: 0.65 });
    } else if (cell.kind === "cryo") {
      graphics.rect(cell.x - 7, cell.y - 5, 14, 10).fill({ color: PALETTE.warmCream, alpha: 0.74 });
      graphics.rect(cell.x - 5, cell.y - 2, 10, 4).fill({ color: PALETTE.coolantDark, alpha: 0.9 });
      graphics.rect(cell.x + 4, cell.y - 1, 2, 2).fill({ color: PALETTE.coolantLight, alpha: 0.96 });
    } else if (cell.kind === "fabricator") {
      graphics.rect(cell.x - 6, cell.y - 5, 12, 3).fill({ color: PALETTE.sunAmber, alpha: 0.72 });
      graphics.rect(cell.x - 3, cell.y - 1, 6, 7).fill({ color: PALETTE.hullInk, alpha: 0.72 });
      graphics.rect(cell.x - 1, cell.y + 1, 2, 3).fill({ color: PALETTE.sunAmber, alpha: 0.88 });
    } else if (cell.kind === "memory") {
      graphics.poly([cell.x, cell.y - 7, cell.x + 6, cell.y, cell.x, cell.y + 7, cell.x - 6, cell.y]).fill({ color: PALETTE.hullInk, alpha: 0.8 });
      graphics.rect(cell.x - 1, cell.y - 4, 2, 8).fill({ color: PALETTE.sunAmber, alpha: 0.9 });
      graphics.rect(cell.x - 4, cell.y - 1, 8, 2).fill({ color: PALETTE.sunAmber, alpha: 0.78 });
    } else if (cell.kind === "habitat") {
      const lamp = cell.id % 3 === 0 ? PALETTE.sunAmber : PALETTE.warmCream;
      graphics.rect(cell.x - 6, cell.y - 3, 4, 4).fill({ color: PALETTE.hullInk, alpha: 0.78 });
      graphics.rect(cell.x + 2, cell.y - 3, 4, 4).fill({ color: PALETTE.hullInk, alpha: 0.78 });
      graphics.rect(cell.x - 1, cell.y + 4, 2, 2).fill({ color: lamp, alpha: 0.84 });
    }
  }

  private animate(deltaMS: number): void {
    this.animationFrame += 1;
    const transition = this.transition;
    let transitionProgress = 1;
    if (transition) {
      transition.elapsed += deltaMS;
      const linear = Math.min(1, transition.elapsed / transition.duration);
      transitionProgress = linear < 0.5 ? 2 * linear * linear : 1 - Math.pow(-2 * linear + 2, 2) / 2;
      if (this.animationFrame % 2 === 0 || linear >= 1) {
        this.redrawNetworks(transitionProgress);
        for (let index = 0; index < transition.to.cells.length; index += 1) {
          const from = transition.from.cells[index];
          const to = transition.to.cells[index];
          const graphics = this.cellGraphics.get(to.id);
          if (!from || !graphics) continue;
          this.redrawCell(
            {
              ...to,
              temperature: from.temperature + (to.temperature - from.temperature) * transitionProgress,
              coolant: from.coolant + (to.coolant - from.coolant) * transitionProgress,
              integrity: from.integrity + (to.integrity - from.integrity) * transitionProgress,
            },
            graphics,
          );
        }
      }
      if (linear >= 1) {
        this.snapshot = transition.to;
        this.transition = null;
        this.drawLivingInterior();
        this.drawLivingAssets();
        this.redrawNetworks();
        for (const cell of this.snapshot.cells) {
          const graphics = this.cellGraphics.get(cell.id);
          if (graphics) this.redrawCell(cell, graphics);
        }
      }
    }

    const animationSnapshot = this.transition
      ? transitionProgress < 0.58 ? this.transition.from : this.transition.to
      : this.snapshot;
    const pulse = (Math.sin(this.elapsed / 420) + 1) / 2;

    this.ambientLayer.clear();
    if (this.lens === "living") {
      const reactorPulse = (Math.sin(this.elapsed / 610) + 1) / 2;
      const breathLeft = (Math.sin(this.elapsed / 1_230) + 1) / 2;
      const breathRight = (Math.sin(this.elapsed / 1_470 + 1.3) + 1) / 2;
      this.ambientLayer
        .poly([748, 377 - reactorPulse * 3, 778 + reactorPulse * 3, 407, 778 + reactorPulse * 3, 465, 748, 495 + reactorPulse * 3, 718 - reactorPulse * 3, 465, 718 - reactorPulse * 3, 407])
        .stroke({ color: animationSnapshot.phase === "stable" ? PALETTE.coolantLight : PALETTE.sunAmber, width: 3, alpha: 0.2 + reactorPulse * 0.38 });
      this.ambientLayer.ellipse(426, 556, 44 + breathLeft * 4, 58 + breathLeft * 5)
        .stroke({ color: PALETTE.lifeMint, width: 3, alpha: 0.12 + breathLeft * 0.25 });
      this.ambientLayer.ellipse(554, 556, 44 + breathRight * 4, 58 + breathRight * 5)
        .stroke({ color: PALETTE.lifeMint, width: 3, alpha: 0.12 + breathRight * 0.25 });
      for (let mote = 0; mote < 11; mote += 1) {
        const phase = (this.elapsed / (2_100 + mote * 97) + mote * 0.217) % 1;
        const x = 374 + ((mote * 73) % 244);
        const y = 356 - phase * 132 + Math.sin(this.elapsed / 380 + mote) * 4;
        this.ambientLayer.rect(Math.round(x), Math.round(y), mote % 4 === 0 ? 3 : 2, 2)
          .fill({ color: mote % 3 === 0 ? PALETTE.lifeMint : PALETTE.moss, alpha: 0.16 + (1 - phase) * 0.52 });
      }
      const conveyorX = 858 + (this.elapsed / 12 % 242);
      this.ambientLayer.rect(Math.round(conveyorX), 645, 8, 8)
        .fill({ color: PALETTE.sunAmber, alpha: 0.72 });
      for (let pod = 0; pod < 4; pod += 1) {
        const podPulse = (Math.sin(this.elapsed / (840 + pod * 110) + pod) + 1) / 2;
        this.ambientLayer.rect(1_187 + pod * 48, 262, 12, 3)
          .fill({ color: PALETTE.coolantLight, alpha: 0.2 + podPulse * 0.48 });
      }

      for (const living of this.livingSprites) {
        const wave = Math.sin(this.elapsed / (living.role === "lungs" ? 1_280 : 1_760) + living.phase);
        const shimmer = (wave + 1) / 2;
        living.sprite.y = living.baseY + (living.role === "hull" ? 0 : Math.round(wave * 1.4));
        if (living.role === "lungs") {
          living.sprite.scale.set(living.baseScale * (0.985 + shimmer * 0.03), living.baseScale * (0.97 + shimmer * 0.06));
        } else if (living.role === "sunwell") {
          living.sprite.scale.set(living.baseScale * (0.99 + shimmer * 0.02));
        } else {
          living.sprite.scale.set(living.baseScale);
        }
        if (living.role === "thermal" && animationSnapshot.phase !== "stable") {
          living.sprite.alpha = 0.86 + shimmer * 0.14;
        }
      }

      for (let index = 0; index < CARETAKER_ROUTES.length; index += 1) {
        const route = CARETAKER_ROUTES[index];
        const progress = this.elapsed / route.period + route.phase;
        const [x, y] = pointOnLoop(route.points, progress);
        const [trailX, trailY] = pointOnLoop(route.points, progress - 0.006);
        const facing = pointOnLoop(route.points, progress + 0.002)[0] >= x ? 1 : -1;
        const crisisScout = index === 2 && animationSnapshot.phase !== "stable";
        const core = crisisScout ? PALETTE.ember : index === 1 ? PALETTE.sunAmber : PALETTE.coolantLight;
        this.ambientLayer
          .ellipse(Math.round(x), Math.round(y + 7), 11, 4)
          .fill({ color: PALETTE.abyss, alpha: 0.34 });
        this.ambientLayer
          .poly([
            Math.round(x - 6), Math.round(y - 2),
            Math.round(x - 2), Math.round(y - 6),
            Math.round(x + 5), Math.round(y - 4),
            Math.round(x + 7), Math.round(y + 2),
            Math.round(x + 2), Math.round(y + 5),
            Math.round(x - 6), Math.round(y + 3),
          ])
          .fill({ color: PALETTE.hullInk, alpha: 0.96 })
          .stroke({ color: PALETTE.brass, width: 2, alpha: 0.82 });
        this.ambientLayer.rect(Math.round(x + facing * 3 - 1), Math.round(y - 2), 3, 3)
          .fill({ color: core, alpha: 0.96 });
        this.ambientLayer.moveTo(Math.round(x - facing * 4), Math.round(y - 4))
          .lineTo(Math.round(x - facing * 7), Math.round(y - 8))
          .stroke({ color: PALETTE.brass, width: 1, alpha: 0.72 });
        this.ambientLayer.rect(Math.round(trailX - 1), Math.round(trailY), 2, 2)
          .fill({ color: core, alpha: 0.34 });
      }
    }
    for (const cell of animationSnapshot.cells) {
      if (cell.temperature < OVERHEAT_THRESHOLD && cell.kind !== "reactor") continue;
      const graphics = this.cellGraphics.get(cell.id);
      if (!graphics) continue;
      graphics.alpha = 0.82 + pulse * 0.18;
      graphics.scale.set(1 + pulse * (cell.kind === "reactor" ? 0.025 : 0.012));
    }
    this.flowLayer.clear();
    const thermalEdges = animationSnapshot.edges.filter(
      (edge) => edge.network === "thermal" && edge.active && !edge.fractured && !edge.dormant,
    );
    for (let index = 0; index < thermalEdges.length; index += Math.max(1, Math.ceil(thermalEdges.length / 95))) {
      const edge = thermalEdges[index];
      const from = animationSnapshot.cells[edge.from];
      const to = animationSnapshot.cells[edge.to];
      const progress = (this.elapsed / (1_100 + (edge.id % 7) * 80) + (edge.id * 0.173) % 1) % 1;
      const x = Math.round(from.x + (to.x - from.x) * progress);
      const y = Math.round(from.y + (to.y - from.y) * progress);
      this.flowLayer.rect(x - 1, y - 1, 3, 3).fill({
        color: this.lens === "energy" ? PALETTE.sunAmber : PALETTE.coolantLight,
        alpha: this.lens === "structure" || this.lens === "atmosphere" ? 0.18 : 0.78,
      });
    }

    this.effectLayer.clear();
    const hotCells = animationSnapshot.cells.filter((cell) => cell.temperature >= OVERHEAT_THRESHOLD);
    for (const cell of hotCells) {
      const phase = this.elapsed / (760 + (cell.id % 5) * 90) + cell.id * 0.41;
      const drift = (phase % 1) * 18;
      const x = Math.round(cell.x + Math.sin(phase * 5.1) * 5);
      const y = Math.round(cell.y - drift);
      this.effectLayer.rect(x, y, cell.id % 4 === 0 ? 3 : 2, 2).fill({
        color: cell.temperature > 112 ? PALETTE.whiteHeat : PALETTE.ember,
        alpha: 0.15 + (1 - (phase % 1)) * 0.65,
      });
    }

    if (this.transition) {
      const waveX = Math.round(110 + transitionProgress * (this.snapshot.worldWidth - 180));
      this.effectLayer
        .poly([waveX - 18, 150, waveX + 7, 150, waveX + 28, 430, waveX + 4, 742, waveX - 21, 742, waveX - 3, 430])
        .fill({ color: PALETTE.coolantLight, alpha: 0.035 + Math.sin(transitionProgress * Math.PI) * 0.13 });
      this.effectLayer
        .moveTo(waveX, 174)
        .lineTo(waveX + 9, 430)
        .lineTo(waveX - 4, 716)
        .stroke({ color: PALETTE.warmCream, width: 3, alpha: 0.3 + Math.sin(transitionProgress * Math.PI) * 0.45 });
      for (let mote = 0; mote < 24; mote += 1) {
        const phase = ((mote * 0.618 + transitionProgress * 1.7) % 1);
        const y = 180 + phase * 520;
        const x = waveX + Math.sin(mote * 2.3 + this.elapsed / 160) * 28;
        this.effectLayer.rect(Math.round(x), Math.round(y), mote % 4 === 0 ? 4 : 2, 2).fill({
          color: mote % 3 === 0 ? PALETTE.sunAmber : PALETTE.coolantLight,
          alpha: 0.34 + (mote % 5) * 0.09,
        });
      }
    }
  }

  transitionToSnapshot(next: ArkSnapshot): void {
    if (next.revision === this.snapshot.revision && next.tick === this.snapshot.tick) return;
    if (this.cellGraphics.size === 0) {
      this.snapshot = next;
      return;
    }
    const from = this.transition?.to ?? this.snapshot;
    this.transition = { from, to: next, elapsed: 0, duration: next.phase === "stable" ? 2_900 : 1_100 };
  }

  setLens(lens: SystemLens): void {
    this.lens = lens;
    this.livingLayer.alpha = lens === "living" ? 1 : 0.16;
    this.assetLayer.alpha = lens === "living" ? 1 : 0.1;
    this.sectorLayer.alpha = lens === "living" ? 0.16 : 0.3;
    this.redrawNetworks();
    for (const cell of this.snapshot.cells) {
      const graphics = this.cellGraphics.get(cell.id);
      if (graphics) this.redrawCell(cell, graphics);
    }
  }

  setSelectedCell(cellId: number | null): void {
    const previous = this.selectedId;
    this.selectedId = cellId;
    if (previous !== null) {
      const graphics = this.cellGraphics.get(previous);
      if (graphics) this.redrawCell(this.snapshot.cells[previous], graphics);
    }
    if (cellId !== null) {
      const graphics = this.cellGraphics.get(cellId);
      if (graphics) this.redrawCell(this.snapshot.cells[cellId], graphics);
    }
  }

  frameCell(cellId: number): void {
    const cell = this.snapshot.cells[cellId];
    if (!cell || !this.viewport) return;
    this.viewport.animate({ position: { x: cell.x, y: cell.y }, scale: 1.55, time: 720, ease: "easeInOutSine" });
  }

  frameArk(): void {
    if (!this.viewport) return;
    this.viewport.animate({
      position: { x: this.snapshot.worldWidth / 2, y: this.snapshot.worldHeight / 2 },
      scale: Math.min(this.host.clientWidth / (this.snapshot.worldWidth * 1.08), this.host.clientHeight / (this.snapshot.worldHeight * 1.08)),
      time: 720,
      ease: "easeInOutSine",
    });
  }

  panBy(dx: number, dy: number): void {
    if (!this.viewport) return;
    const center = this.viewport.center;
    this.viewport.moveCenter(center.x + dx / this.viewport.scale.x, center.y + dy / this.viewport.scale.y);
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    this.app.destroy(true, { children: true, texture: true });
  }
}
