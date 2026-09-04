import { Container, Graphics, Sprite } from "pixi.js";
import { PALETTE } from "../colors";
import type { ArkSnapshot, SectorName } from "../../engine/types";
import type { SpriteSheetAtlas } from "./pixelAtlas";

export type CompartmentDef = {
  id: string;
  sector: SectorName;
  deck: "upper" | "main" | "lower";
  x: number;
  y: number;
  width: number;
  height: number;
  floorY: number;
  wallTile: string;
  floorTile: string;
  name: string;
};

export const SHIP_COMPARTMENTS: CompartmentDef[] = [
  // Upper Deck (floorY = 296)
  {
    id: "comp_verdant",
    sector: "Verdant Ring",
    deck: "upper",
    x: 344,
    y: 180,
    width: 272,
    height: 116,
    floorY: 296,
    wallTile: "tile_wall_bio",
    floorTile: "tile_floor_bio",
    name: "Verdant Biosphere",
  },
  {
    id: "comp_memory",
    sector: "Memory Reef",
    deck: "upper",
    x: 874,
    y: 180,
    width: 264,
    height: 116,
    floorY: 296,
    wallTile: "tile_wall_server",
    floorTile: "tile_floor_diamond",
    name: "Memory Archive",
  },
  {
    id: "comp_cryo",
    sector: "Cryovault",
    deck: "upper",
    x: 1164,
    y: 180,
    width: 240,
    height: 116,
    floorY: 296,
    wallTile: "tile_wall_cryo",
    floorTile: "tile_floor_cryo",
    name: "Cryo Stasis Bay",
  },

  // Main Deck (floorY = 436)
  {
    id: "comp_bridge",
    sector: "Navigation Crown",
    deck: "main",
    x: 130,
    y: 320,
    width: 190,
    height: 116,
    floorY: 436,
    wallTile: "tile_wall_panel",
    floorTile: "tile_floor_diamond",
    name: "Command Bridge",
  },
  {
    id: "comp_arboretum",
    sector: "Verdant Ring",
    deck: "main",
    x: 344,
    y: 320,
    width: 272,
    height: 116,
    floorY: 436,
    wallTile: "tile_wall_bio",
    floorTile: "tile_floor_diamond",
    name: "Bio-Arboretum Concourse",
  },
  {
    id: "comp_sunwell",
    sector: "Sunwell",
    deck: "main",
    x: 644,
    y: 310,
    width: 206,
    height: 126,
    floorY: 436,
    wallTile: "tile_wall_panel",
    floorTile: "tile_floor_grate",
    name: "Sunwell Torus Core",
  },
  {
    id: "comp_reservoirs",
    sector: "Reservoirs",
    deck: "main",
    x: 874,
    y: 320,
    width: 264,
    height: 116,
    floorY: 436,
    wallTile: "tile_wall_panel",
    floorTile: "tile_floor_grate",
    name: "Coolant Reservoirs",
  },
  {
    id: "comp_thermal",
    sector: "Thermal Choir",
    deck: "main",
    x: 1164,
    y: 310,
    width: 266,
    height: 126,
    floorY: 436,
    wallTile: "tile_wall_corrugated",
    floorTile: "tile_floor_grate",
    name: "Thermal Exchangers",
  },

  // Lower Deck (floorY = 626)
  {
    id: "comp_lungs",
    sector: "Atmosphere Lungs",
    deck: "lower",
    x: 344,
    y: 510,
    width: 272,
    height: 116,
    floorY: 626,
    wallTile: "tile_wall_corrugated",
    floorTile: "tile_floor_grate",
    name: "Atmosphere Lungs",
  },
  {
    id: "comp_engineering",
    sector: "Sunwell",
    deck: "lower",
    x: 644,
    y: 510,
    width: 206,
    height: 116,
    floorY: 626,
    wallTile: "tile_wall_panel",
    floorTile: "tile_floor_grate",
    name: "Heavy Engineering Trench",
  },
  {
    id: "comp_fabrication",
    sector: "Fabrication Reef",
    deck: "lower",
    x: 874,
    y: 510,
    width: 264,
    height: 116,
    floorY: 626,
    wallTile: "tile_wall_corrugated",
    floorTile: "tile_floor_diamond",
    name: "Nanite Foundry",
  },
  {
    id: "comp_heatsinks",
    sector: "Thermal Choir",
    deck: "lower",
    x: 1164,
    y: 510,
    width: 240,
    height: 116,
    floorY: 626,
    wallTile: "tile_wall_corrugated",
    floorTile: "tile_floor_grate",
    name: "Lower Heat Sinks",
  },
];

export class RoomTileRenderer {
  private atlas: SpriteSheetAtlas;
  private animGraphics = new Graphics();
  private pilotSprite: Sprite | null = null;
  private botanistSprite: Sprite | null = null;
  private engineerSprite: Sprite | null = null;
  private scientistSprite: Sprite | null = null;
  private animTimer = 0;

  constructor(atlas: SpriteSheetAtlas) {
    this.atlas = atlas;
  }

  /**
   * Renders the authentic outer starship hull silhouette, armor plates,
   * thrusters, sensor masts, and structural cutaway cross-section.
   */
  public renderOuterHull(container: Container, worldWidth: number, worldHeight: number): void {
    const g = new Graphics();
    container.addChild(g);

    // 1. Deep Hull Cutaway Backing (The negative space of the ship interior)
    const hullContour = [
      110, 390,
      130, 340,
      200, 270,
      330, 160,
      640, 140,
      1120, 150,
      1410, 160,
      1470, 280,
      1490, 440,
      1470, 600,
      1400, 690,
      1120, 710,
      640, 720,
      330, 700,
      200, 600,
      130, 520,
      110, 470,
    ];

    // Heavy hull shadow / vacuum isolation boundary
    g.poly(hullContour)
      .fill({ color: PALETTE.abyss, alpha: 0.96 })
      .stroke({ color: PALETTE.hullInk, width: 28, alpha: 0.88 });

    // 2. Multi-Segment Armored Outer Plating (Top & Bottom armor plates)
    const dorsalBands = [
      [130, 340, 330, 160, 350, 180, 170, 350],
      [330, 160, 640, 140, 640, 164, 350, 180],
      [640, 140, 1120, 150, 1120, 174, 640, 164],
      [1120, 150, 1410, 160, 1390, 184, 1120, 174],
    ];
    for (let i = 0; i < dorsalBands.length; i++) {
      const color = i % 2 === 0 ? PALETTE.hullInk : PALETTE.warmShadow;
      g.poly(dorsalBands[i])
        .fill({ color, alpha: 0.95 })
        .stroke({ color: PALETTE.brass, width: 2, alpha: 0.5 });
    }

    const ventralBands = [
      [130, 520, 330, 700, 350, 680, 170, 510],
      [330, 700, 640, 720, 640, 696, 350, 680],
      [640, 720, 1120, 710, 1120, 686, 640, 696],
      [1120, 710, 1400, 690, 1380, 666, 1120, 686],
    ];
    for (let i = 0; i < ventralBands.length; i++) {
      const color = i % 2 === 0 ? PALETTE.warmShadow : PALETTE.hullInk;
      g.poly(ventralBands[i])
        .fill({ color, alpha: 0.95 })
        .stroke({ color: PALETTE.brass, width: 2, alpha: 0.5 });
    }

    // 3. Prow Nose Armor & Reinforced Bridge Canopy
    g.poly([100, 436, 126, 360, 140, 370, 116, 436, 140, 500, 126, 510])
      .fill({ color: PALETTE.brass, alpha: 0.75 })
      .stroke({ color: PALETTE.warmCream, width: 1, alpha: 0.6 });

    // 4. Aft Sublight Thruster Bells & Engine Manifolds with Glowing Ion Plumes
    for (const ty of [330, 436, 540]) {
      g.poly([1440, ty - 26, 1480, ty - 38, 1488, ty - 32, 1488, ty + 32, 1480, ty + 38, 1440, ty + 26])
        .fill({ color: PALETTE.hullInk, alpha: 0.95 })
        .stroke({ color: PALETTE.brass, width: 3, alpha: 0.8 });
      g.rect(1442, ty - 18, 14, 36).fill({ color: PALETTE.coolantLight, alpha: 0.45 });
      g.rect(1446, ty - 10, 8, 20).fill({ color: PALETTE.whiteHeat, alpha: 0.75 });

      // Luminous cyan ion exhaust plume streaming into the void
      g.poly([
        1488, ty - 24,
        1536, ty - 14,
        1554, ty,
        1536, ty + 14,
        1488, ty + 24,
      ]).fill({ color: PALETTE.coolantTeal, alpha: 0.35 });
      g.poly([
        1488, ty - 12,
        1522, ty - 6,
        1534, ty,
        1522, ty + 6,
        1488, ty + 12,
      ]).fill({ color: PALETTE.whiteHeat, alpha: 0.75 });
    }

    // 5. Living Hull Ribs & Bio-Mechanical Tendrils
    // Curving organic ribs wrapping around the armored shell
    for (const [rx, ry, dir] of [
      [310, 160, -1], [460, 145, -1], [620, 140, -1], [780, 144, -1], [940, 148, -1], [1100, 154, -1],
      [310, 700, 1], [460, 715, 1], [620, 720, 1], [780, 716, 1], [940, 712, 1], [1100, 706, 1],
    ]) {
      // Curved rib
      g.poly([
        rx, ry,
        rx + 16, ry + dir * 18,
        rx + 22, ry + dir * 18,
        rx + 6, ry,
      ]).fill({ color: PALETTE.warmShadow, alpha: 0.9 })
        .stroke({ color: PALETTE.brass, width: 1, alpha: 0.6 });

      // Fine bio-tendril reaching outward into space
      g.moveTo(rx + 16, ry + dir * 18)
        .lineTo(rx + 26, ry + dir * 32)
        .stroke({ color: PALETTE.moss, width: 2, alpha: 0.7 });
      g.rect(rx + 25, ry + dir * 32, 2, 2).fill({ color: PALETTE.lifeMint });
    }

    // Asymmetric programmable-matter repair patches on upper starboard hull
    g.poly([
      1130, 152,
      1260, 156,
      1240, 178,
      1110, 174,
    ]).fill({ color: PALETTE.terracotta, alpha: 0.85 })
      .stroke({ color: PALETTE.sunAmber, width: 2, alpha: 0.8 });
    for (let bx = 1136; bx < 1250; bx += 14) {
      g.rect(bx, 158, 2, 14).fill({ color: PALETTE.sunAmber, alpha: 0.7 });
    }

    // 6. Exterior Sensor Masts & Flashing Navigation Beacon Lights
    const antennas = [
      [220, 250, 170, 180],
      [580, 140, 580, 80],
      [960, 150, 960, 90],
      [1320, 160, 1370, 100],
      [220, 620, 170, 690],
      [580, 720, 580, 780],
      [960, 710, 960, 770],
    ];
    for (const [x1, y1, x2, y2] of antennas) {
      g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: PALETTE.brass, width: 3, alpha: 0.85 });
      g.rect(x2 - 3, y2 - 3, 6, 6).fill({ color: PALETTE.sunAmber, alpha: 0.9 });
      g.rect(x2 - 1, y2 - 1, 2, 2).fill({ color: PALETTE.whiteHeat });
    }

    // Port navigation beacon (red) & Starboard navigation beacon (green)
    g.circle(130, 336, 4).fill({ color: PALETTE.alarmRed, alpha: 0.9 });
    g.circle(130, 524, 4).fill({ color: PALETTE.lifeMint, alpha: 0.9 });
  }

  /**
   * Renders modular tiled back-walls for all starship compartments.
   */
  public renderRoomBackgrounds(container: Container): void {
    for (const comp of SHIP_COMPARTMENTS) {
      const tex = this.atlas.getTexture(comp.wallTile);
      // Fill room area with 16x16 tiles
      for (let rx = comp.x; rx < comp.x + comp.width; rx += 16) {
        for (let ry = comp.y; ry < comp.floorY; ry += 16) {
          const w = Math.min(16, comp.x + comp.width - rx);
          const h = Math.min(16, comp.floorY - ry);
          const s = new Sprite(tex);
          s.position.set(rx, ry);
          s.width = w;
          s.height = h;
          s.alpha = 0.88;
          container.addChild(s);
        }
      }

      // Room Header Sign / Sector Trim Bar
      const trim = new Graphics();
      trim.rect(comp.x, comp.y, comp.width, 4)
        .fill({ color: PALETTE.hullInk })
        .stroke({ color: PALETTE.brass, width: 1, alpha: 0.4 });
      container.addChild(trim);
    }
  }

  /**
   * Renders solid walkable deck floors with metal grating, hazard stripes,
   * subfloor girders, structural ceilings, and ceiling lights.
   */
  public renderFloorsAndCeilings(container: Container): void {
    const g = new Graphics();
    container.addChild(g);

    for (const comp of SHIP_COMPARTMENTS) {
      const floorTex = this.atlas.getTexture(comp.floorTile);
      const hazardTex = this.atlas.getTexture("tile_floor_hazard");
      const beamTex = this.atlas.getTexture("tile_ceiling_beam");
      const conduitTex = this.atlas.getTexture("tile_ceiling_conduit");
      const lampTex = this.atlas.getTexture("tile_ceiling_lamp");

      // 1. Walkable Deck Floor (16px high slab ending at floorY)
      const floorTop = comp.floorY - 6;
      for (let rx = comp.x; rx < comp.x + comp.width; rx += 16) {
        const isThreshold = rx === comp.x || rx + 16 >= comp.x + comp.width;
        const activeTex = isThreshold ? hazardTex : floorTex;
        const s = new Sprite(activeTex);
        s.position.set(rx, floorTop);
        s.width = Math.min(16, comp.x + comp.width - rx);
        s.height = 16;
        container.addChild(s);
      }

      // 2. Subfloor Structural Girders & Support Columns beneath floor
      g.rect(comp.x, floorTop + 14, comp.width, 10).fill({ color: PALETTE.hullInk });
      g.rect(comp.x, floorTop + 14, comp.width, 2).fill({ color: PALETTE.warmShadow });
      for (let rx = comp.x + 24; rx < comp.x + comp.width - 16; rx += 48) {
        g.rect(rx, floorTop + 16, 8, 14).fill({ color: PALETTE.brass, alpha: 0.65 });
        g.rect(rx + 1, floorTop + 16, 2, 14).fill({ color: PALETTE.warmCream, alpha: 0.4 });
      }

      // 3. Structural Ceiling Beams & Cable Trays
      for (let rx = comp.x; rx < comp.x + comp.width; rx += 16) {
        const isConduit = (rx / 16) % 3 === 0;
        const s = new Sprite(isConduit ? conduitTex : beamTex);
        s.position.set(rx, comp.y);
        s.width = Math.min(16, comp.x + comp.width - rx);
        s.height = 8;
        container.addChild(s);
      }

      // 4. Ceiling Fluorescent / Neon Lamps
      for (let lx = comp.x + 36; lx < comp.x + comp.width - 32; lx += 64) {
        const lamp = new Sprite(lampTex);
        lamp.position.set(lx, comp.y + 6);
        container.addChild(lamp);

        // Warm practical downward light beam
        g.poly([
          lx + 3, comp.y + 14,
          lx + 13, comp.y + 14,
          lx + 32, comp.floorY - 6,
          lx - 16, comp.floorY - 6,
        ]).fill({ color: PALETTE.sunAmber, alpha: 0.05 });
      }
    }
  }

  /**
   * Renders vertical bulkhead dividing walls, blast doors, and vertical transit shafts.
   */
  public renderBulkheadsAndShafts(container: Container): void {
    const g = new Graphics();
    container.addChild(g);

    // Vertical Transit Shafts (Ladders & Lifts)
    const shaftXs = [320, 620, 850, 1140];
    const ladderTex = this.atlas.getTexture("tile_ladder");

    for (const sx of shaftXs) {
      // 1. Shaft Backing Wall with Ribbed Metal Structure
      g.rect(sx - 2, 170, 28, 470)
        .fill({ color: PALETTE.nightBlue, alpha: 0.95 })
        .stroke({ color: PALETTE.hullInk, width: 3 });

      // 2. Vertical Heavy Conduit Trunks (Coolant Teal & Brass Bus)
      g.rect(sx, 170, 3, 470).fill({ color: PALETTE.coolantTeal, alpha: 0.8 });
      g.rect(sx + 1, 170, 1, 470).fill({ color: PALETTE.coolantLight, alpha: 0.9 });

      g.rect(sx + 21, 170, 3, 470).fill({ color: PALETTE.brass, alpha: 0.8 });
      g.rect(sx + 22, 170, 1, 470).fill({ color: PALETTE.sunAmber, alpha: 0.9 });

      // 3. Horizontal Mounting Struts and Service Platforms at each deck
      for (const py of [296, 436, 626]) {
        g.rect(sx - 4, py - 4, 32, 4).fill({ color: PALETTE.hullInk });
        g.rect(sx - 4, py - 4, 32, 1).fill({ color: PALETTE.warmCream, alpha: 0.6 });
        // Hazard warning mark on shaft threshold
        g.rect(sx - 4, py, 6, 2).fill({ color: PALETTE.sunAmber });
        g.rect(sx + 22, py, 6, 2).fill({ color: PALETTE.sunAmber });
      }

      // 4. Center High-Tension Ladder Rungs
      for (let sy = 176; sy < 634; sy += 16) {
        const s = new Sprite(ladderTex);
        s.position.set(sx + 4, sy);
        container.addChild(s);
      }
    }

    // Bulkhead Door Portals between rooms
    const doorLocs = [
      { x: 318, y: 404, open: true }, // Bridge -> Arboretum
      { x: 344, y: 264, open: true }, // Shaft -> Verdant
      { x: 616, y: 264, open: true }, // Verdant -> Shaft
      { x: 616, y: 404, open: true }, // Arboretum -> Sunwell
      { x: 874, y: 264, open: true }, // Shaft -> Memory
      { x: 1138, y: 264, open: true }, // Memory -> Shaft
      { x: 644, y: 404, open: true }, // Shaft -> Sunwell
      { x: 850, y: 404, open: true }, // Sunwell -> Reservoirs
      { x: 874, y: 404, open: true }, // Shaft -> Reservoirs
      { x: 1138, y: 404, open: true }, // Reservoirs -> Thermal
      { x: 344, y: 594, open: true }, // Shaft -> Lungs
      { x: 616, y: 594, open: true }, // Lungs -> Engineering
      { x: 850, y: 594, open: true }, // Engineering -> Fabrication
      { x: 874, y: 594, open: true }, // Shaft -> Fabrication
      { x: 1138, y: 594, open: true }, // Fabrication -> Heat Sinks
    ];

    const doorOpenTex = this.atlas.getTexture("door_open");
    for (const d of doorLocs) {
      const doorSprite = new Sprite(doorOpenTex);
      doorSprite.position.set(d.x - 8, d.y);
      container.addChild(doorSprite);
    }
  }

  /**
   * Densely furnishes every room with authentic pixel-art machinery, consoles,
   * vats, servers, and conduits bolted to the floors and walls.
   */
  public renderRoomFurnishings(container: Container, snapshot: ArkSnapshot): void {
    const isStable = snapshot.phase === "stable";
    const g = new Graphics();
    container.addChild(g);

    this.animGraphics = new Graphics();
    container.addChild(this.animGraphics);

    // Instantiate Living Starship Crew
    this.pilotSprite = new Sprite(this.atlas.getTexture("crew_pilot_0"));
    this.pilotSprite.position.set(148, 412);
    container.addChild(this.pilotSprite);

    this.botanistSprite = new Sprite(this.atlas.getTexture("crew_botanist_0"));
    this.botanistSprite.position.set(444, 274);
    container.addChild(this.botanistSprite);

    this.scientistSprite = new Sprite(this.atlas.getTexture("crew_scientist_0"));
    this.scientistSprite.position.set(976, 274);
    container.addChild(this.scientistSprite);

    this.engineerSprite = new Sprite(this.atlas.getTexture("crew_engineer_0"));
    this.engineerSprite.position.set(784, 604);
    container.addChild(this.engineerSprite);

    // ==========================================
    // 1. NAVIGATION CROWN (Forward Command Bridge)
    // ==========================================
    // A. Panoramic Cockpit Canopy Window (showing deep space & nebula outside)
    g.poly([134, 326, 214, 326, 236, 370, 134, 370])
      .fill({ color: PALETTE.abyss })
      .stroke({ color: PALETTE.brass, width: 2, alpha: 0.9 });
    // Distant stars visible through cockpit glass
    g.rect(150, 334, 2, 2).fill({ color: PALETTE.whiteHeat, alpha: 0.9 });
    g.rect(174, 342, 1, 1).fill({ color: PALETTE.coolantLight, alpha: 0.8 });
    g.rect(198, 336, 2, 2).fill({ color: PALETTE.sunAmber, alpha: 0.8 });
    g.rect(162, 356, 1, 1).fill({ color: PALETTE.whiteHeat, alpha: 0.7 });
    g.rect(188, 350, 2, 2).fill({ color: PALETTE.coolantLight, alpha: 0.9 });
    // Diagonal window canopy strut beams
    g.moveTo(134, 348).lineTo(180, 326).stroke({ color: PALETTE.hullInk, width: 3, alpha: 0.9 });
    g.moveTo(170, 370).lineTo(214, 326).stroke({ color: PALETTE.hullInk, width: 3, alpha: 0.9 });
    // Window glass cyan glare sheen
    g.moveTo(142, 366).lineTo(200, 330).stroke({ color: PALETTE.coolantLight, width: 1, alpha: 0.35 });

    // B. Captain's Command Chair
    g.rect(148, 412, 14, 24).fill({ color: PALETTE.warmShadow });
    g.rect(148, 412, 14, 24).stroke({ color: PALETTE.brass, width: 1 });
    g.rect(151, 404, 8, 9).fill({ color: PALETTE.brass }); // Headrest
    g.rect(145, 418, 3, 10).fill({ color: PALETTE.warmCream, alpha: 0.6 }); // Left armrest
    g.rect(162, 418, 3, 10).fill({ color: PALETTE.warmCream, alpha: 0.6 }); // Right armrest

    // C. Dual Tactical Helm Consoles
    const navSprite = new Sprite(this.atlas.getTexture("landmark_navigation"));
    navSprite.position.set(176, 402);
    container.addChild(navSprite);

    // CRT Holographic display screens
    g.rect(184, 406, 20, 10).fill({ color: PALETTE.nightBlue });
    g.rect(184, 406, 20, 10).stroke({ color: PALETTE.brass, width: 1 });
    // Radar sweep circle & blip
    g.ellipse(194, 411, 4, 4).stroke({ color: PALETTE.coolantTeal, width: 1, alpha: 0.8 });
    g.rect(196, 409, 2, 2).fill({ color: PALETTE.whiteHeat });

    // Supply cargo crates in bridge rear
    const crate1 = new Sprite(this.atlas.getTexture("prop_cargo_crate"));
    crate1.position.set(134, 420);
    container.addChild(crate1);
    g.rect(134, 428, 16, 2).fill({ color: PALETTE.sunAmber, alpha: 0.8 }); // Stencil hazard strip

    // ==========================================
    // 1B. BIO-ARBORETUM CONCOURSE (Main Deck Forward)
    // ==========================================
    // Growth vats with bubbling nutrient solution
    const arboVat1 = new Sprite(this.atlas.getTexture("landmark_verdant"));
    arboVat1.position.set(376, 398);
    container.addChild(arboVat1);

    const arboVat2 = new Sprite(this.atlas.getTexture("landmark_verdant"));
    arboVat2.position.set(486, 398);
    arboVat2.scale.x = -1;
    container.addChild(arboVat2);

    // Wall plant nursery shelving
    for (const sx of [360, 440, 520]) {
      g.rect(sx, 360, 32, 3).fill({ color: PALETTE.brass });
      g.rect(sx + 2, 350, 6, 10).fill({ color: PALETTE.mossDark });
      g.rect(sx + 4, 346, 3, 5).fill({ color: PALETTE.lifeMint });
      g.rect(sx + 14, 352, 5, 8).fill({ color: PALETTE.mossDark });
      g.rect(sx + 15, 348, 3, 4).fill({ color: PALETTE.whiteHeat });
      g.rect(sx + 24, 350, 6, 10).fill({ color: PALETTE.mossDark });
      g.rect(sx + 25, 346, 3, 5).fill({ color: PALETTE.lifeMint });
    }

    // Lush hanging vine canopy dripping from ceiling
    g.rect(348, 326, 264, 4).fill({ color: PALETTE.moss, alpha: 0.95 });
    for (let x = 354; x < 608; x += 18) {
      const vLen = 10 + ((x * 7) % 16);
      g.rect(x, 330, 2, vLen).fill({ color: PALETTE.lifeMint, alpha: 0.85 });
      g.rect(x - 1, 330 + vLen, 4, 4).fill({ color: PALETTE.moss });
      g.rect(x, 330 + vLen + 1, 2, 2).fill({ color: PALETTE.whiteHeat, alpha: 0.7 });
    }
    // Floor drainage grates with nutrient wash
    for (let x = 360; x < 600; x += 36) {
      g.rect(x, 430, 18, 6).fill({ color: PALETTE.coolantTeal, alpha: 0.5 });
      g.rect(x, 430, 18, 1).fill({ color: PALETTE.coolantLight, alpha: 0.7 });
    }

    // ==========================================
    // 2. VERDANT RING (Upper Deck Forward Hydroponics)
    // ==========================================
    const verdantSprite = new Sprite(this.atlas.getTexture("landmark_verdant"));
    verdantSprite.position.set(400, 258);
    container.addChild(verdantSprite);

    const verdantSprite2 = new Sprite(this.atlas.getTexture("landmark_verdant"));
    verdantSprite2.position.set(490, 258);
    verdantSprite2.scale.x = -1;
    container.addChild(verdantSprite2);

    // Terraced tiered planter beds
    for (const bx of [356, 520]) {
      g.rect(bx, 268, 38, 26).fill({ color: PALETTE.terracotta });
      g.rect(bx, 268, 38, 26).stroke({ color: PALETTE.brass, width: 1 });
      g.rect(bx + 2, 264, 34, 5).fill({ color: PALETTE.mossDark });
      for (let px = bx + 4; px < bx + 32; px += 5) {
        g.rect(px, 256, 3, 9).fill({ color: PALETTE.moss });
        g.rect(px + 1, 254, 2, 3).fill({ color: PALETTE.lifeMint });
      }
    }
    // Overhead purple UV grow light track
    g.rect(350, 192, 256, 3).fill({ color: PALETTE.hullInk });
    for (let lx = 370; lx < 590; lx += 48) {
      g.rect(lx, 195, 14, 4).fill({ color: PALETTE.ionViolet });
      g.rect(lx + 2, 197, 10, 2).fill({ color: PALETTE.whiteHeat });
    }

    // ==========================================
    // 3. ATMOSPHERE LUNGS (Lower Deck Forward Bellows)
    // ==========================================
    const lungsSprite1 = new Sprite(this.atlas.getTexture("landmark_lungs"));
    lungsSprite1.position.set(380, 586);
    container.addChild(lungsSprite1);

    const lungsSprite2 = new Sprite(this.atlas.getTexture("landmark_lungs"));
    lungsSprite2.position.set(480, 586);
    container.addChild(lungsSprite2);

    // Massive ventilation duct cowls & intake grills
    for (const dx of [350, 526]) {
      g.rect(dx, 546, 38, 48).fill({ color: PALETTE.hullInk });
      g.rect(dx, 546, 38, 48).stroke({ color: PALETTE.brass, width: 2 });
      for (let y = 552; y < 588; y += 6) {
        g.rect(dx + 4, y, 30, 2).fill({ color: PALETTE.abyss });
        g.rect(dx + 4, y + 1, 30, 1).fill({ color: PALETTE.warmCream, alpha: 0.3 });
      }
    }
    // High-pressure pneumatic lines
    g.rect(350, 516, 260, 6).fill({ color: PALETTE.brass });
    g.rect(350, 518, 260, 2).fill({ color: PALETTE.warmCream, alpha: 0.5 });

    // ==========================================
    // 4. SUNWELL (Central Fusion Reactor Core - Centerpiece)
    // ==========================================
    const sunwellSprite = new Sprite(this.atlas.getTexture("landmark_sunwell"));
    sunwellSprite.position.set(722, 356);
    container.addChild(sunwellSprite);

    // Heavy Magnetic Confinement Torus Housing
    // Outer Torus Ring
    g.ellipse(746, 384, 76, 56).stroke({
      color: PALETTE.brass,
      width: 4,
      alpha: 0.9,
    });
    // Middle Induction Ring
    g.ellipse(746, 384, 58, 42).stroke({
      color: isStable ? PALETTE.coolantTeal : PALETTE.sunAmber,
      width: 3,
      alpha: 0.85,
    });
    // Inner Containment Ring
    g.ellipse(746, 384, 38, 26).stroke({
      color: PALETTE.whiteHeat,
      width: 2,
      alpha: 0.9,
    });

    // 8 Radial Magnetic Choke Pods around reactor
    for (let a = 0; a < 8; a++) {
      const rad = (a * Math.PI) / 4;
      const px = 746 + Math.cos(rad) * 64;
      const py = 384 + Math.sin(rad) * 46;
      g.rect(px - 5, py - 5, 10, 10).fill({ color: PALETTE.hullInk });
      g.rect(px - 5, py - 5, 10, 10).stroke({ color: PALETTE.brass, width: 2 });
      g.rect(px - 2, py - 2, 4, 4).fill({ color: isStable ? PALETTE.coolantLight : PALETTE.sunAmber });
    }

    // Heavy High-Voltage Umbilical Power Trunks with Floor Anchors
    for (const [x1, y1, x2, y2] of [
      [746, 328, 746, 310], // Top trunk to upper deck
      [746, 440, 746, 510], // Bottom trunk to engineering
      [670, 384, 644, 384], // Left trunk to arboretum
      [822, 384, 850, 384], // Right trunk to reservoirs
    ]) {
      g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: PALETTE.hullInk, width: 10 });
      g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: PALETTE.brass, width: 6 });
      g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: isStable ? PALETTE.coolantLight : PALETTE.sunAmber, width: 2 });
    }

    // High-Voltage Hazard Floor Stripes around Sunwell
    for (let x = 660; x < 830; x += 16) {
      g.rect(x, 430, 8, 5).fill({ color: PALETTE.sunAmber, alpha: 0.9 });
      g.rect(x + 8, 430, 8, 5).fill({ color: PALETTE.hullInk, alpha: 0.9 });
    }

    // ==========================================
    // 4B. HEAVY ENGINEERING TRENCH (Lower Deck Center Dynamo)
    // ==========================================
    // Giant Industrial Dynamo Housing
    g.rect(656, 544, 182, 76).fill({ color: PALETTE.hullInk });
    g.rect(656, 544, 182, 76).stroke({ color: PALETTE.brass, width: 3 });

    // Multi-stage Steam Turbine Rotor & Stator Coils
    g.ellipse(746, 582, 50, 36).fill({ color: PALETTE.nightBlue });
    g.ellipse(746, 582, 50, 36).stroke({ color: PALETTE.brass, width: 4 });
    g.ellipse(746, 582, 28, 20).fill({ color: isStable ? PALETTE.coolantDark : PALETTE.warmShadow });
    g.ellipse(746, 582, 28, 20).stroke({ color: isStable ? PALETTE.coolantTeal : PALETTE.sunAmber, width: 2 });
    g.ellipse(746, 582, 10, 8).fill({ color: PALETTE.whiteHeat });

    // Turbine rotor blades
    for (let b = 0; b < 6; b++) {
      const bRad = (b * Math.PI) / 3;
      g.moveTo(746, 582)
        .lineTo(746 + Math.cos(bRad) * 24, 582 + Math.sin(bRad) * 16)
        .stroke({ color: PALETTE.brass, width: 2, alpha: 0.8 });
    }

    // High-Pressure Coolant Circulation Manifold
    g.rect(662, 524, 170, 8).fill({ color: PALETTE.brass });
    g.rect(662, 526, 170, 4).fill({ color: isStable ? PALETTE.coolantLight : PALETTE.sunAmber, alpha: 0.8 });
    // Dual Red Valve Handwheels
    for (const vx of [686, 806]) {
      g.ellipse(vx, 528, 7, 7).stroke({ color: PALETTE.alarmRed, width: 3 });
      g.rect(vx - 7, 527, 14, 2).fill({ color: PALETTE.alarmRed });
      g.rect(vx - 1, 521, 2, 14).fill({ color: PALETTE.alarmRed });
    }
    // Analog Pressure Dial Meters with Needles
    for (const mx of [716, 776]) {
      g.ellipse(mx, 532, 6, 6).fill({ color: PALETTE.warmCream });
      g.ellipse(mx, 532, 6, 6).stroke({ color: PALETTE.brass, width: 1 });
      g.moveTo(mx, 532).lineTo(mx + 3, 530).stroke({ color: PALETTE.alarmRed, width: 1 });
    }

    // ==========================================
    // 5. MEMORY REEF (Upper Deck Aft Crystal Data Archive)
    // ==========================================
    const memorySprite1 = new Sprite(this.atlas.getTexture("landmark_memory"));
    memorySprite1.position.set(906, 252);
    container.addChild(memorySprite1);

    const memorySprite2 = new Sprite(this.atlas.getTexture("landmark_memory"));
    memorySprite2.position.set(1006, 252);
    container.addChild(memorySprite2);

    // 4 Tall Quantum Server Stacks with cascading blinking LEDs
    for (const sx of [886, 950, 1046, 1100]) {
      g.rect(sx, 224, 18, 68).fill({ color: PALETTE.hullInk });
      g.rect(sx, 224, 18, 68).stroke({ color: PALETTE.brass, width: 1 });
      for (let y = 228; y < 288; y += 7) {
        g.rect(sx + 2, y, 14, 4).fill({ color: PALETTE.nightBlue });
        // Blinking server LEDs
        g.rect(sx + 4, y + 1, 2, 2).fill({ color: PALETTE.coolantLight });
        g.rect(sx + 8, y + 1, 2, 2).fill({ color: PALETTE.sunAmber });
        g.rect(sx + 12, y + 1, 2, 2).fill({ color: PALETTE.lifeMint });
      }
    }
    // Subfloor fiber-optic bus bar
    g.rect(880, 290, 252, 3).fill({ color: PALETTE.sunAmber, alpha: 0.8 });
    g.rect(880, 291, 252, 1).fill({ color: PALETTE.whiteHeat, alpha: 0.9 });

    // ==========================================
    // 6. COOLANT RESERVOIRS (Main Deck Aft Cistern Bay)
    // ==========================================
    const resSprite1 = new Sprite(this.atlas.getTexture("landmark_reservoirs"));
    resSprite1.position.set(906, 396);
    container.addChild(resSprite1);

    const resSprite2 = new Sprite(this.atlas.getTexture("landmark_reservoirs"));
    resSprite2.position.set(1006, 396);
    container.addChild(resSprite2);

    // Triple Pressurized Cistern Tanks
    for (const cx of [896, 968, 1048]) {
      g.rect(cx, 368, 38, 64).fill({ color: PALETTE.coolantDark });
      g.rect(cx, 368, 38, 64).stroke({ color: PALETTE.brass, width: 2 });
      // Vertical glass level gauge with coolant fluid
      g.rect(cx + 14, 376, 10, 48).fill({ color: PALETTE.abyss });
      g.rect(cx + 14, 376, 10, 48).stroke({ color: PALETTE.warmCream, width: 1 });
      g.rect(cx + 16, 386, 6, 36).fill({ color: PALETTE.coolantLight, alpha: 0.85 });
      // Pressure reinforcement bands
      g.rect(cx, 384, 38, 3).fill({ color: PALETTE.brass });
      g.rect(cx, 412, 38, 3).fill({ color: PALETTE.brass });
    }
    // Overhead Distribution Pipes
    const pipeTex = this.atlas.getTexture("pipe_h");
    for (let px = 880; px < 1120; px += 16) {
      const p = new Sprite(pipeTex);
      p.position.set(px, 336);
      container.addChild(p);
    }

    // ==========================================
    // 7. NANITE FABRICATION REEF (Lower Deck Aft Foundry)
    // ==========================================
    const fabSprite1 = new Sprite(this.atlas.getTexture("landmark_fabrication"));
    fabSprite1.position.set(910, 590);
    container.addChild(fabSprite1);

    const fabSprite2 = new Sprite(this.atlas.getTexture("landmark_fabrication"));
    fabSprite2.position.set(1020, 590);
    container.addChild(fabSprite2);

    // 3D Assembler Gantry Crane on Ceiling Tracks
    g.rect(884, 520, 244, 6).fill({ color: PALETTE.brass });
    g.rect(940, 526, 48, 14).fill({ color: PALETTE.hullInk });
    g.rect(940, 526, 48, 14).stroke({ color: PALETTE.brass, width: 1 });
    // Articulated robotic welding arm
    g.moveTo(964, 540).lineTo(974, 564).stroke({ color: PALETTE.warmCream, width: 3 });
    g.moveTo(974, 564).lineTo(962, 584).stroke({ color: PALETTE.warmCream, width: 2 });
    g.ellipse(962, 584, 2, 2).fill({ color: PALETTE.whiteHeat }); // Laser welding spark tip

    // Supply Crates & Industrial Pallets
    const crate2 = new Sprite(this.atlas.getTexture("prop_cargo_crate"));
    crate2.position.set(880, 608);
    container.addChild(crate2);
    const crate3 = new Sprite(this.atlas.getTexture("prop_cargo_crate"));
    crate3.position.set(1106, 608);
    container.addChild(crate3);

    // ==========================================
    // 8. CRYOVAULT (Upper Deck Far Aft Stasis Pods)
    // ==========================================
    const cryoSprite1 = new Sprite(this.atlas.getTexture("landmark_cryo"));
    cryoSprite1.position.set(1196, 252);
    container.addChild(cryoSprite1);

    const cryoSprite2 = new Sprite(this.atlas.getTexture("landmark_cryo"));
    cryoSprite2.position.set(1296, 252);
    container.addChild(cryoSprite2);

    // Row of 4 Vertical Stasis Pods with Colonist Silhouettes
    for (let i = 0; i < 4; i++) {
      const px = 1184 + i * 48;
      g.rect(px, 228, 24, 66).fill({ color: PALETTE.warmShadow });
      g.rect(px, 228, 24, 66).stroke({ color: PALETTE.brass, width: 2 });
      // Curved cryogenic glass window
      g.rect(px + 4, 236, 16, 48).fill({ color: PALETTE.coolantDark });
      g.rect(px + 4, 236, 16, 48).stroke({ color: PALETTE.coolantTeal, width: 1 });
      g.rect(px + 6, 240, 4, 40).fill({ color: PALETTE.coolantLight, alpha: 0.7 });
      // Sleeping colonist silhouette
      g.ellipse(px + 12, 250, 4, 4).fill({ color: PALETTE.nightBlue }); // Head
      g.rect(px + 9, 256, 6, 18).fill({ color: PALETTE.nightBlue }); // Torso
      // Overhead coolant feed tube
      g.rect(px + 10, 206, 4, 22).fill({ color: PALETTE.coolantTeal });
    }
    // Sub-zero frost mist along floor
    g.rect(1170, 290, 220, 5).fill({ color: PALETTE.coolantLight, alpha: 0.35 });

    // ==========================================
    // 9. THERMAL CHOIR (Main Deck Far Aft Radiators & Crisis Breach)
    // ==========================================
    const thermalTex = isStable
      ? this.atlas.getTexture("landmark_thermal")
      : this.atlas.getTexture("landmark_thermal_broken");
    const thermalSprite1 = new Sprite(thermalTex);
    thermalSprite1.position.set(1206, 394);
    container.addChild(thermalSprite1);

    const thermalSprite2 = new Sprite(this.atlas.getTexture("landmark_thermal"));
    thermalSprite2.position.set(1316, 394);
    container.addChild(thermalSprite2);

    // Crisis State: Ruptured Molten Fissure, Sparks & Emergency Strobe Beacon
    if (!isStable) {
      const fracPipe = new Sprite(this.atlas.getTexture("pipe_h_fractured"));
      fracPipe.position.set(1256, 346);
      container.addChild(fracPipe);

      // Molten breach fracture cutting through floor
      g.moveTo(1266, 316)
        .lineTo(1286, 366)
        .lineTo(1272, 416)
        .lineTo(1306, 446)
        .stroke({ color: PALETTE.alarmRed, width: 5, alpha: 0.95 });
      g.moveTo(1266, 316)
        .lineTo(1286, 366)
        .lineTo(1272, 416)
        .lineTo(1306, 446)
        .stroke({ color: PALETTE.ember, width: 3, alpha: 0.95 });
      g.moveTo(1268, 320)
        .lineTo(1284, 366)
        .lineTo(1274, 416)
        .lineTo(1302, 442)
        .stroke({ color: PALETTE.whiteHeat, width: 1 });

      // Flying plasma sparks
      for (const [sx, sy] of [
        [1274, 340], [1292, 380], [1280, 424], [1310, 440], [1260, 390], [1300, 360]
      ]) {
        g.rect(sx, sy, 3, 3).fill({ color: PALETTE.ember });
        g.rect(sx + 1, sy + 1, 1, 1).fill({ color: PALETTE.whiteHeat });
      }

      // Rotating Emergency Alarm Beacon housing on ceiling
      g.rect(1284, 314, 14, 10).fill({ color: PALETTE.hullInk });
      g.rect(1284, 314, 14, 10).stroke({ color: PALETTE.alarmRed, width: 2 });
      g.ellipse(1291, 324, 6, 6).fill({ color: PALETTE.alarmRed });
      g.ellipse(1291, 324, 2, 2).fill({ color: PALETTE.whiteHeat });
    }

    // 9B. Lower Heat Sinks (Lower Deck Far Aft Radiators)
    for (const hx of [1180, 1260, 1340]) {
      g.rect(hx, 546, 40, 76).fill({ color: PALETTE.nightBlue });
      g.rect(hx, 546, 40, 76).stroke({ color: PALETTE.brass, width: 2 });
      for (let y = 552; y < 618; y += 6) {
        g.rect(hx + 4, y, 32, 2).fill({ color: PALETTE.coolantDark });
        g.rect(hx + 4, y + 1, 32, 1).fill({ color: PALETTE.coolantLight, alpha: 0.3 });
      }
    }

    // ==========================================
    // 10. Wall Diagnostic Terminals bolted to room walls
    // ==========================================
    const termTex = this.atlas.getTexture("prop_wall_terminal");
    const termPositions = [
      [240, 376],
      [360, 226],
      [580, 226],
      [360, 556],
      [580, 556],
      [680, 346],
      [810, 346],
      [890, 226],
      [1100, 226],
      [890, 366],
      [1100, 366],
      [890, 556],
      [1100, 556],
      [1180, 226],
      [1370, 226],
      [1180, 366],
      [1390, 366],
    ];
    for (const [tx, ty] of termPositions) {
      const term = new Sprite(termTex);
      term.position.set(tx, ty);
      container.addChild(term);
    }
  }

  /**
   * Fluid 60fps dynamic animations for living crew, radar, plasma, bubbles, and machinery.
   */
  public update(deltaMS: number, isCritical: boolean, isStable: boolean): void {
    this.animTimer += deltaMS;
    const time = this.animTimer * 0.001;
    const frame = Math.floor(this.animTimer / 500) % 2;

    // 1. Crew Idle Animation frame cycling
    if (this.pilotSprite) {
      this.pilotSprite.texture = this.atlas.getTexture(`crew_pilot_${frame}`);
    }
    if (this.botanistSprite) {
      this.botanistSprite.texture = this.atlas.getTexture(`crew_botanist_${frame}`);
    }
    if (this.engineerSprite) {
      this.engineerSprite.texture = this.atlas.getTexture(`crew_engineer_${frame}`);
    }
    if (this.scientistSprite) {
      this.scientistSprite.texture = this.atlas.getTexture(`crew_scientist_${frame}`);
    }

    // 2. Dynamic animated machinery micro-graphics
    const g = this.animGraphics;
    g.clear();

    // A. Bridge: Radar sweep on helm console
    const sweepAngle = time * 3.0;
    const rx = 194;
    const ry = 411;
    const rLen = 4;
    g.moveTo(rx, ry)
      .lineTo(rx + Math.cos(sweepAngle) * rLen, ry + Math.sin(sweepAngle) * rLen)
      .stroke({ color: PALETTE.coolantLight, width: 1, alpha: 0.85 });
    // Radar blip pulse
    const blipPulse = (Math.sin(time * 6.0) + 1) * 0.5;
    g.rect(rx + 2, ry - 2, 1, 1).fill({ color: PALETTE.whiteHeat, alpha: blipPulse });

    // B. Verdant & Concourse: Algae cylinder micro-bubbles rising
    for (const [bx, by] of [[408, 268], [498, 268], [384, 408]]) {
      for (let i = 0; i < 3; i++) {
        const bubbleY = by - ((this.animTimer * 0.03 + i * 8) % 18);
        g.rect(bx, Math.round(bubbleY), 1, 1).fill({ color: PALETTE.whiteHeat, alpha: 0.8 });
      }
    }

    // C. Sunwell Torus: Swirling magnetic plasma filaments
    const torusPulse = (Math.sin(time * 4.0) + 1) * 0.5;
    for (let f = 0; f < 4; f++) {
      const fAngle = time * 2.5 + (f * Math.PI) / 2;
      const fDist = 14 + Math.sin(time * 5.0 + f) * 4;
      const px = 746 + Math.cos(fAngle) * fDist;
      const py = 384 + Math.sin(fAngle) * (fDist * 0.7);
      g.rect(Math.round(px - 1), Math.round(py - 1), 2, 2).fill({
        color: isStable ? PALETTE.coolantLight : PALETTE.whiteHeat,
        alpha: 0.75 + torusPulse * 0.25,
      });
    }

    // D. Atmosphere Lungs: Deep rhythmic breathing bellows expansion
    const breath = Math.sin(time * 2.2);
    const bellowOffset = Math.round(breath * 3);
    g.rect(386, 594, 28 + bellowOffset, 3).fill({ color: PALETTE.lifeMint, alpha: 0.6 });
    g.rect(486, 594, 28 - bellowOffset, 3).fill({ color: PALETTE.lifeMint, alpha: 0.6 });

    // E. Engineering: Dynamo rotor rotation & welding arc flash
    const rotPhase = (time * 8.0) % (Math.PI * 2);
    g.moveTo(746, 582)
      .lineTo(746 + Math.cos(rotPhase) * 16, 582 + Math.sin(rotPhase) * 11)
      .stroke({ color: PALETTE.whiteHeat, width: 1, alpha: 0.7 });
    // Engineer welding spark
    if (Math.sin(time * 12.0) > 0.4) {
      g.rect(798, 612, 2, 2).fill({ color: PALETTE.whiteHeat });
      g.rect(799, 610, 1, 1).fill({ color: PALETTE.sunAmber });
    }

    // F. Memory Reef: Cascading server rack LED patterns
    for (const sx of [888, 952, 1048, 1102]) {
      const ledRow = Math.floor(this.animTimer * 0.008) % 8;
      const ly = 228 + ledRow * 7;
      g.rect(sx + 4, ly + 1, 2, 2).fill({ color: PALETTE.whiteHeat, alpha: 0.95 });
    }

    // G. Thermal Choir Crisis Sputter
    if (!isCritical) {
      // Stable: gentle turquoise coolant pulse
      const coolPulse = (Math.sin(time * 2.0) + 1) * 0.5;
      g.rect(1220, 426, 120, 2).fill({ color: PALETTE.coolantLight, alpha: 0.4 + coolPulse * 0.3 });
    } else {
      // Crisis: molten sputtering flame & ember bursts
      if (Math.sin(time * 15.0) > 0.3) {
        const sx = 1276 + Math.sin(time * 9.0) * 14;
        const sy = 380 + Math.cos(time * 11.0) * 20;
        g.rect(Math.round(sx), Math.round(sy), 3, 3).fill({ color: PALETTE.whiteHeat });
        g.rect(Math.round(sx + 1), Math.round(sy - 2), 2, 2).fill({ color: PALETTE.ember });
      }
    }
  }
}
