import type { ArkCell, ArkSnapshot, SectorName } from "../../engine/types";

export type DeckLevel = "upper" | "main" | "lower";

export type WalkwaySegment = {
  id: string;
  level: DeckLevel;
  y: number; // Floor Y coordinate
  minX: number;
  maxX: number;
};

export type LadderSegment = {
  id: string;
  x: number;
  topY: number;
  bottomY: number;
  topDeck: DeckLevel;
  bottomDeck: DeckLevel;
};

export type RoomDefinition = {
  id: string;
  sector: SectorName;
  deck: DeckLevel;
  bounds: { x: number; y: number; width: number; height: number };
  landmarkType?: string;
  landmarkPos?: { x: number; y: number };
  doors?: Array<{ x: number; y: number; open: boolean }>;
};

export class ShipLayout {
  public readonly worldWidth: number;
  public readonly worldHeight: number;
  public readonly walkways: WalkwaySegment[] = [];
  public readonly ladders: LadderSegment[] = [];
  public readonly rooms: RoomDefinition[] = [];
  private cellMap = new Map<number, ArkCell>();

  constructor(snapshot: ArkSnapshot) {
    this.worldWidth = snapshot.worldWidth;
    this.worldHeight = snapshot.worldHeight;

    for (const cell of snapshot.cells) {
      this.cellMap.set(cell.id, cell);
    }

    this.initializeWalkwaysAndLadders();
    this.initializeRooms();
  }

  private initializeWalkwaysAndLadders(): void {
    // 3 Primary Continuous Decks
    // 1. Upper Deck (y = 296)
    this.walkways.push({
      id: "deck_upper",
      level: "upper",
      y: 296,
      minX: 240,
      maxX: 1390,
    });

    // 2. Main Deck (y = 436) - Primary thoroughfare through bridge, sunwell, reservoirs, and choir
    this.walkways.push({
      id: "deck_main",
      level: "main",
      y: 436,
      minX: 130,
      maxX: 1440,
    });

    // 3. Lower Deck (y = 626) - Industrial deck for Lungs, Fabrication, and Lower Heat Sinks
    this.walkways.push({
      id: "deck_lower",
      level: "lower",
      y: 626,
      minX: 270,
      maxX: 1320,
    });

    // Vertical Transit Ladders & Elevators
    // Ladder 1: Forward Shaft (Navigation / Verdant / Lungs)
    this.ladders.push({
      id: "ladder_fwd",
      x: 332,
      topY: 296,
      bottomY: 626,
      topDeck: "upper",
      bottomDeck: "lower",
    });

    // Ladder 2: Midship Port Shaft (Verdant / Sunwell / Lungs)
    this.ladders.push({
      id: "ladder_mid_port",
      x: 632,
      topY: 296,
      bottomY: 626,
      topDeck: "upper",
      bottomDeck: "lower",
    });

    // Ladder 3: Midship Starboard Shaft (Memory / Reservoirs / Fabrication)
    this.ladders.push({
      id: "ladder_mid_stbd",
      x: 862,
      topY: 296,
      bottomY: 626,
      topDeck: "upper",
      bottomDeck: "lower",
    });

    // Ladder 4: Aft Shaft (Cryovault / Thermal Choir / Fabrication)
    this.ladders.push({
      id: "ladder_aft",
      x: 1152,
      topY: 296,
      bottomY: 626,
      topDeck: "upper",
      bottomDeck: "lower",
    });
  }

  private initializeRooms(): void {
    // Authored Room Chambers spanning the 10 sectors
    this.rooms.push(
      // Navigation Crown (Forward Bridge)
      {
        id: "room_nav_bridge",
        sector: "Navigation Crown",
        deck: "main",
        bounds: { x: 130, y: 340, width: 190, height: 110 },
        landmarkType: "landmark_navigation",
        landmarkPos: { x: 190, y: 400 },
        doors: [{ x: 318, y: 404, open: true }],
      },
      // Verdant Ring - Upper Bio-Dome
      {
        id: "room_verdant_upper",
        sector: "Verdant Ring",
        deck: "upper",
        bounds: { x: 340, y: 200, width: 270, height: 105 },
        landmarkType: "landmark_verdant",
        landmarkPos: { x: 450, y: 260 },
        doors: [
          { x: 342, y: 264, open: true },
          { x: 608, y: 264, open: true },
        ],
      },
      // Atmosphere Lungs - Lower Bellows Chamber
      {
        id: "room_lungs_lower",
        sector: "Atmosphere Lungs",
        deck: "lower",
        bounds: { x: 340, y: 530, width: 270, height: 105 },
        landmarkType: "landmark_lungs",
        landmarkPos: { x: 460, y: 588 },
        doors: [
          { x: 342, y: 594, open: true },
          { x: 608, y: 594, open: true },
        ],
      },
      // Sunwell - Central Toroidal Reactor Organ
      {
        id: "room_sunwell",
        sector: "Sunwell",
        deck: "main",
        bounds: { x: 670, y: 340, width: 180, height: 150 },
        landmarkType: "landmark_sunwell",
        landmarkPos: { x: 736, y: 412 },
        doors: [
          { x: 672, y: 404, open: true },
          { x: 848, y: 404, open: true },
        ],
      },
      // Memory Reef - Crystal Data Archive
      {
        id: "room_memory_reef",
        sector: "Memory Reef",
        deck: "upper",
        bounds: { x: 880, y: 200, width: 260, height: 105 },
        landmarkType: "landmark_memory",
        landmarkPos: { x: 980, y: 254 },
        doors: [
          { x: 882, y: 264, open: true },
          { x: 1138, y: 264, open: true },
        ],
      },
      // Fabrication Reef - Nanite Assembler Gantry
      {
        id: "room_fabrication",
        sector: "Fabrication Reef",
        deck: "lower",
        bounds: { x: 880, y: 530, width: 260, height: 105 },
        landmarkType: "landmark_fabrication",
        landmarkPos: { x: 980, y: 592 },
        doors: [
          { x: 882, y: 594, open: true },
          { x: 1138, y: 594, open: true },
        ],
      },
      // Reservoirs - Primary Coolant Cisterns
      {
        id: "room_reservoirs",
        sector: "Reservoirs",
        deck: "main",
        bounds: { x: 870, y: 360, width: 270, height: 95 },
        landmarkType: "landmark_reservoirs",
        landmarkPos: { x: 980, y: 400 },
        doors: [
          { x: 872, y: 404, open: true },
          { x: 1138, y: 404, open: true },
        ],
      },
      // Cryovault - Stasis Pod Banks
      {
        id: "room_cryovault",
        sector: "Cryovault",
        deck: "upper",
        bounds: { x: 1160, y: 200, width: 230, height: 105 },
        landmarkType: "landmark_cryo",
        landmarkPos: { x: 1260, y: 254 },
        doors: [{ x: 1162, y: 264, open: true }],
      },
      // Thermal Choir - Primary Heat Exchanger & Rupture Zone
      {
        id: "room_thermal_choir",
        sector: "Thermal Choir",
        deck: "main",
        bounds: { x: 1160, y: 350, width: 270, height: 170 },
        landmarkType: "landmark_thermal",
        landmarkPos: { x: 1280, y: 410 },
        doors: [{ x: 1162, y: 404, open: true }],
      },
    );
  }

  public findNearestWalkway(x: number, y: number): { walkway: WalkwaySegment; distY: number } {
    let best = this.walkways[0];
    let bestDist = Math.abs(y - best.y);
    for (const w of this.walkways) {
      const dist = Math.abs(y - w.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = w;
      }
    }
    return { walkway: best, distY: bestDist };
  }

  public findNearestLadder(x: number, y: number, maxDist = 38): LadderSegment | null {
    let best: LadderSegment | null = null;
    let bestDist = maxDist;
    for (const ladder of this.ladders) {
      if (y >= ladder.topY - 16 && y <= ladder.bottomY + 16) {
        const dist = Math.abs(x - ladder.x);
        if (dist < bestDist) {
          bestDist = dist;
          best = ladder;
        }
      }
    }
    return best;
  }

  public findCellAt(worldX: number, worldY: number, hitRadius = 18): ArkCell | null {
    let nearest: ArkCell | null = null;
    let minDistSq = hitRadius * hitRadius;
    for (const cell of this.cellMap.values()) {
      const dx = cell.x - worldX;
      const dy = cell.y - worldY;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        nearest = cell;
      }
    }
    return nearest;
  }
}
