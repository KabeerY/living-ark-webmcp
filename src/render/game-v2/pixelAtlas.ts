import { Rectangle, Texture } from "pixi.js";
import { mixColor, PALETTE } from "../colors";

/**
 * Converts a hex integer color (0xRRGGBB) to a CSS color string (#rrggbb or rgba).
 */
export function hexToCss(hex: number, alpha = 1): string {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

export type SpriteSheetAtlas = {
  getTexture(id: string): Texture;
  hasTexture(id: string): boolean;
};

/**
 * Procedural Pixel Art Generator that crafts original 16/32-bit textures
 * matching the authentic aesthetic of premium pixel cutaway games (e.g. FTL, Eastward,
 * Pixel Starships, Kingdom Two Crowns) while strictly respecting the 18-color palette.
 */
export class PixelArtAtlasGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private textures = new Map<string, Texture>();
  private masterTexture: Texture | null = null;
  private layout = new Map<string, { x: number; y: number; width: number; height: number }>();
  private cursorX = 2;
  private cursorY = 2;
  private rowHeight = 0;
  private readonly sheetWidth = 1024;
  private readonly sheetHeight = 1024;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.sheetWidth;
    this.canvas.height = this.sheetHeight;
    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Unable to create 2D canvas context for pixel atlas.");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  private allocateSlot(width: number, height: number): { x: number; y: number } {
    if (this.cursorX + width + 2 > this.sheetWidth) {
      this.cursorX = 2;
      this.cursorY += this.rowHeight + 2;
      this.rowHeight = 0;
    }
    if (this.cursorY + height + 2 > this.sheetHeight) {
      throw new Error(`Pixel atlas sheet overflow: cannot fit ${width}x${height}`);
    }
    const pos = { x: this.cursorX, y: this.cursorY };
    this.cursorX += width + 2;
    this.rowHeight = Math.max(this.rowHeight, height);
    return pos;
  }

  private drawSprite(id: string, width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): void {
    const slot = this.allocateSlot(width, height);
    this.ctx.save();
    this.ctx.translate(slot.x, slot.y);
    // Clear slot
    this.ctx.clearRect(0, 0, width, height);
    draw(this.ctx, width, height);
    this.ctx.restore();
    this.layout.set(id, { x: slot.x, y: slot.y, width, height });
  }

  // --- Drawing Helpers ---
  private p(ctx: CanvasRenderingContext2D, x: number, y: number, color: number, alpha = 1): void {
    ctx.fillStyle = hexToCss(color, alpha);
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  private rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: number, alpha = 1): void {
    ctx.fillStyle = hexToCss(color, alpha);
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  private border(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: number): void {
    this.rect(ctx, x, y, w, 1, color);
    this.rect(ctx, x, y + h - 1, w, 1, color);
    this.rect(ctx, x, y, 1, h, color);
    this.rect(ctx, x + w - 1, y, 1, h, color);
  }

  // --- Generation Methods ---

  public generate(): SpriteSheetAtlas {
    this.generateStructuralTiles();
    this.generateMachineryLandmarks();
    this.generateCaretakerFrames();
    this.generateDroneFrames();
    this.generateCrewFrames();
    this.generateEffectsAndUI();

    // Create the master texture with nearest-neighbor filtering
    this.masterTexture = Texture.from(this.canvas);
    this.masterTexture.source.scaleMode = "nearest";

    // Slice individual textures from the master sheet
    for (const [id, rect] of this.layout.entries()) {
      const tex = new Texture({
        source: this.masterTexture.source,
        frame: new Rectangle(rect.x, rect.y, rect.width, rect.height),
      });
      this.textures.set(id, tex);
    }

    return {
      getTexture: (id: string) => {
        const tex = this.textures.get(id);
        if (!tex) {
          console.warn(`[PixelAtlas] Missing sprite texture: "${id}", using fallback`);
          return this.textures.get("caretaker_idle_0") ?? Texture.WHITE;
        }
        return tex;
      },
      hasTexture: (id: string) => this.textures.has(id),
    };
  }

  private generateStructuralTiles(): void {
    // 1. Exterior Hull Tile (16x16)
    this.drawSprite("tile_hull_exterior", 16, 16, (ctx) => {
      this.rect(ctx, 0, 0, 16, 16, PALETTE.hullInk);
      this.border(ctx, 0, 0, 16, 16, PALETTE.warmShadow);
      // Highlights & rivets
      this.rect(ctx, 1, 1, 14, 1, PALETTE.warmCream, 0.25);
      this.rect(ctx, 1, 1, 1, 14, PALETTE.warmCream, 0.2);
      this.rect(ctx, 1, 14, 14, 1, PALETTE.abyss, 0.7);
      this.rect(ctx, 14, 1, 1, 14, PALETTE.abyss, 0.7);
      // Rivets at corners
      this.p(ctx, 2, 2, PALETTE.brass);
      this.p(ctx, 13, 2, PALETTE.brass);
      this.p(ctx, 2, 13, PALETTE.brass);
      this.p(ctx, 13, 13, PALETTE.brass);
    });

    // 2. Interior Bulkhead Wall (16x16)
    this.drawSprite("tile_bulkhead_wall", 16, 16, (ctx) => {
      this.rect(ctx, 0, 0, 16, 16, PALETTE.nightBlue);
      // Vertical structural rib
      this.rect(ctx, 3, 0, 3, 16, PALETTE.hullInk);
      this.rect(ctx, 3, 0, 1, 16, PALETTE.warmCream, 0.15);
      this.rect(ctx, 5, 0, 1, 16, PALETTE.abyss, 0.5);
      // Recessed panel
      this.rect(ctx, 8, 2, 6, 12, PALETTE.abyss, 0.4);
      this.border(ctx, 8, 2, 6, 12, PALETTE.warmShadow);
      // Status conduit wire
      this.rect(ctx, 10, 0, 1, 16, PALETTE.brass, 0.5);
    });

    // 3. Deck Walkway Floor (16x16)
    this.drawSprite("tile_deck_floor", 16, 16, (ctx) => {
      // Base dark substructure
      this.rect(ctx, 0, 0, 16, 16, PALETTE.abyss);
      // Walkway grating top 4 pixels
      this.rect(ctx, 0, 0, 16, 4, PALETTE.hullInk);
      this.rect(ctx, 0, 0, 16, 1, PALETTE.warmCream, 0.6); // walking surface highlight
      // Grate slots
      for (let i = 1; i < 15; i += 3) {
        this.rect(ctx, i, 1, 1, 3, PALETTE.nightBlue);
        this.p(ctx, i + 1, 3, PALETTE.warmShadow);
      }
      // Subfloor support girders
      this.rect(ctx, 0, 4, 16, 1, PALETTE.brass, 0.6);
      this.rect(ctx, 4, 5, 2, 11, PALETTE.warmShadow);
      this.rect(ctx, 11, 5, 2, 11, PALETTE.warmShadow);
    });

    // 4. Catwalk Platform (16x8)
    this.drawSprite("tile_platform", 16, 8, (ctx) => {
      this.rect(ctx, 0, 0, 16, 3, PALETTE.hullInk);
      this.rect(ctx, 0, 0, 16, 1, PALETTE.warmCream, 0.7);
      // Hazard stripe lip
      for (let x = 0; x < 16; x += 4) {
        this.rect(ctx, x, 3, 2, 2, PALETTE.sunAmber);
        this.rect(ctx, x + 2, 3, 2, 2, PALETTE.hullInk);
      }
      // Suspension bracket
      this.rect(ctx, 2, 5, 2, 3, PALETTE.brass);
      this.rect(ctx, 12, 5, 2, 3, PALETTE.brass);
    });

    // 5. Ladder Shaft (16x16)
    this.drawSprite("tile_ladder", 16, 16, (ctx) => {
      // Background shaft
      this.rect(ctx, 0, 0, 16, 16, PALETTE.abyss, 0.6);
      // Vertical rails
      this.rect(ctx, 3, 0, 2, 16, PALETTE.brass);
      this.rect(ctx, 3, 0, 1, 16, PALETTE.warmCream, 0.4);
      this.rect(ctx, 11, 0, 2, 16, PALETTE.brass);
      this.rect(ctx, 11, 0, 1, 16, PALETTE.warmCream, 0.4);
      // Rungs
      for (let y = 2; y < 16; y += 4) {
        this.rect(ctx, 5, y, 6, 2, PALETTE.warmShadow);
        this.rect(ctx, 5, y, 6, 1, PALETTE.warmCream, 0.5);
      }
    });

    // 6. Sliding Bulkhead Door - Closed (16x32)
    this.drawSprite("door_closed", 16, 32, (ctx) => {
      // Frame
      this.rect(ctx, 0, 0, 16, 32, PALETTE.hullInk);
      this.border(ctx, 0, 0, 16, 32, PALETTE.warmShadow);
      // Door slabs (split in middle)
      this.rect(ctx, 3, 2, 10, 13, PALETTE.nightBlue);
      this.rect(ctx, 3, 17, 10, 13, PALETTE.nightBlue);
      this.border(ctx, 3, 2, 10, 13, PALETTE.brass);
      this.border(ctx, 3, 17, 10, 13, PALETTE.brass);
      // Center seam & lock
      this.rect(ctx, 2, 15, 12, 2, PALETTE.abyss);
      this.rect(ctx, 6, 14, 4, 4, PALETTE.sunAmber); // Status lamp
      this.p(ctx, 7, 15, PALETTE.whiteHeat);
      // Hydraulic pistons at top/bottom
      this.rect(ctx, 6, 0, 4, 2, PALETTE.brass);
      this.rect(ctx, 6, 30, 4, 2, PALETTE.brass);
    });

    // 7. Sliding Bulkhead Door - Open (16x32)
    this.drawSprite("door_open", 16, 32, (ctx) => {
      // Walkable open portal showing background corridor
      this.rect(ctx, 0, 0, 16, 32, PALETTE.abyss, 0.85);
      // Outer frame
      this.rect(ctx, 0, 0, 3, 32, PALETTE.hullInk);
      this.rect(ctx, 13, 0, 3, 32, PALETTE.hullInk);
      this.rect(ctx, 0, 0, 16, 3, PALETTE.hullInk);
      // Recessed door edges visible in pockets
      this.rect(ctx, 1, 3, 2, 26, PALETTE.brass);
      this.rect(ctx, 13, 3, 2, 26, PALETTE.brass);
      // Green clear light
      this.rect(ctx, 6, 1, 4, 2, PALETTE.coolantTeal);
      this.p(ctx, 7, 1, PALETTE.coolantLight);
    });

    // 8. Horizontal Pipe (16x8)
    this.drawSprite("pipe_h", 16, 8, (ctx) => {
      this.rect(ctx, 0, 2, 16, 4, PALETTE.coolantDark);
      this.rect(ctx, 0, 2, 16, 1, PALETTE.coolantLight, 0.7); // top reflection
      this.rect(ctx, 0, 5, 16, 1, PALETTE.abyss, 0.6); // shadow
      // Coupling ring
      this.rect(ctx, 7, 1, 2, 6, PALETTE.brass);
      this.rect(ctx, 7, 1, 1, 6, PALETTE.warmCream, 0.4);
    });

    // 9. Horizontal Fractured Pipe (16x8)
    this.drawSprite("pipe_h_fractured", 16, 8, (ctx) => {
      this.rect(ctx, 0, 2, 5, 4, PALETTE.coolantDark);
      this.rect(ctx, 0, 2, 5, 1, PALETTE.coolantLight, 0.7);
      this.p(ctx, 5, 2, PALETTE.ember);
      this.p(ctx, 6, 3, PALETTE.whiteHeat);
      this.p(ctx, 5, 5, PALETTE.ember);
      this.rect(ctx, 11, 2, 5, 4, PALETTE.coolantDark);
      this.rect(ctx, 11, 2, 5, 1, PALETTE.coolantLight, 0.7);
      this.p(ctx, 10, 3, PALETTE.ember);
      this.p(ctx, 10, 4, PALETTE.whiteHeat);
      this.p(ctx, 7, 3, PALETTE.alarmRed);
      this.p(ctx, 8, 4, PALETTE.ember);
    });

    // 10. Modular Wall - Standard Bulkhead Panel (16x16)
    this.drawSprite("tile_wall_panel", 16, 16, (ctx) => {
      this.rect(ctx, 0, 0, 16, 16, PALETTE.nightBlue);
      this.border(ctx, 0, 0, 16, 16, PALETTE.hullInk);
      this.rect(ctx, 1, 1, 14, 1, PALETTE.warmCream, 0.12);
      this.rect(ctx, 1, 14, 14, 1, PALETTE.abyss, 0.6);
      this.p(ctx, 2, 2, PALETTE.warmShadow);
      this.p(ctx, 13, 2, PALETTE.warmShadow);
      this.p(ctx, 2, 13, PALETTE.warmShadow);
      this.p(ctx, 13, 13, PALETTE.warmShadow);
    });

    // 11. Modular Wall - Corrugated Industrial (16x16)
    this.drawSprite("tile_wall_corrugated", 16, 16, (ctx) => {
      this.rect(ctx, 0, 0, 16, 16, PALETTE.hullInk);
      for (let x = 0; x < 16; x += 4) {
        this.rect(ctx, x, 0, 2, 16, PALETTE.nightBlue);
        this.rect(ctx, x, 0, 1, 16, PALETTE.warmCream, 0.18);
        this.rect(ctx, x + 2, 0, 2, 16, PALETTE.abyss, 0.5);
      }
    });

    // 12. Modular Wall - Bio Hydroponics Wall (16x16)
    this.drawSprite("tile_wall_bio", 16, 16, (ctx) => {
      this.rect(ctx, 0, 0, 16, 16, PALETTE.mossDark);
      this.border(ctx, 0, 0, 16, 16, PALETTE.abyss);
      // Tendrils and moss
      this.rect(ctx, 3, 2, 2, 8, PALETTE.moss);
      this.rect(ctx, 4, 6, 6, 2, PALETTE.moss);
      this.p(ctx, 10, 5, PALETTE.lifeMint);
      this.rect(ctx, 8, 9, 2, 6, PALETTE.moss);
      this.p(ctx, 9, 14, PALETTE.lifeMint);
      this.rect(ctx, 12, 1, 2, 4, PALETTE.lifeMint, 0.7);
    });

    // 13. Modular Wall - Server Computer Rack (16x16)
    this.drawSprite("tile_wall_server", 16, 16, (ctx) => {
      this.rect(ctx, 0, 0, 16, 16, PALETTE.hullInk);
      this.border(ctx, 0, 0, 16, 16, PALETTE.abyss);
      // Horizontal rack trays
      for (let y = 1; y < 15; y += 4) {
        this.rect(ctx, 1, y, 14, 3, PALETTE.nightBlue);
        this.rect(ctx, 1, y, 14, 1, PALETTE.warmShadow);
        // Blinking LEDs
        this.p(ctx, 3, y + 1, PALETTE.coolantLight);
        this.p(ctx, 6, y + 1, PALETTE.sunAmber);
        this.p(ctx, 10, y + 1, PALETTE.lifeMint);
        this.p(ctx, 13, y + 1, PALETTE.coolantLight);
      }
    });

    // 14. Modular Wall - Cryo Insulation Frost Wall (16x16)
    this.drawSprite("tile_wall_cryo", 16, 16, (ctx) => {
      this.rect(ctx, 0, 0, 16, 16, PALETTE.nightBlue);
      this.border(ctx, 0, 0, 16, 16, PALETTE.coolantDark);
      // Frost crystal patterns
      this.rect(ctx, 4, 2, 8, 1, PALETTE.coolantLight, 0.6);
      this.rect(ctx, 7, 1, 2, 6, PALETTE.coolantLight, 0.6);
      this.p(ctx, 7, 3, PALETTE.whiteHeat);
      this.rect(ctx, 2, 9, 6, 1, PALETTE.coolantLight, 0.4);
      this.rect(ctx, 10, 11, 4, 1, PALETTE.coolantLight, 0.4);
      this.p(ctx, 12, 11, PALETTE.whiteHeat);
    });

    // 15. Modular Floor - Steel Diamond Tread (16x16)
    this.drawSprite("tile_floor_diamond", 16, 16, (ctx) => {
      this.rect(ctx, 0, 0, 16, 16, PALETTE.hullInk);
      this.rect(ctx, 0, 0, 16, 2, PALETTE.warmCream, 0.4); // walking edge highlight
      this.rect(ctx, 0, 14, 16, 2, PALETTE.abyss, 0.8);
      // Diamond pattern
      for (let y = 3; y < 14; y += 4) {
        for (let x = 2; x < 14; x += 4) {
          this.p(ctx, x, y, PALETTE.warmShadow);
          this.p(ctx, x + 1, y, PALETTE.warmCream);
          this.p(ctx, x + 2, y + 2, PALETTE.warmShadow);
        }
      }
    });

    // 16. Modular Floor - Open Steel Grate (16x16)
    this.drawSprite("tile_floor_grate", 16, 16, (ctx) => {
      this.rect(ctx, 0, 0, 16, 16, PALETTE.abyss);
      this.rect(ctx, 0, 0, 16, 3, PALETTE.hullInk);
      this.rect(ctx, 0, 0, 16, 1, PALETTE.warmCream, 0.6);
      for (let x = 1; x < 15; x += 3) {
        this.rect(ctx, x, 1, 1, 4, PALETTE.nightBlue);
        this.p(ctx, x + 1, 3, PALETTE.warmShadow);
      }
      // Subfloor support beams
      this.rect(ctx, 3, 5, 2, 11, PALETTE.warmShadow);
      this.rect(ctx, 11, 5, 2, 11, PALETTE.warmShadow);
      this.rect(ctx, 0, 11, 16, 2, PALETTE.hullInk);
    });

    // 17. Modular Floor - Bio Terrarium Turf (16x16)
    this.drawSprite("tile_floor_bio", 16, 16, (ctx) => {
      this.rect(ctx, 0, 0, 16, 16, PALETTE.terracotta);
      this.rect(ctx, 0, 0, 16, 4, PALETTE.mossDark);
      this.rect(ctx, 0, 0, 16, 1, PALETTE.moss);
      // Grass tufts and soil speckles
      for (let x = 1; x < 15; x += 3) {
        this.p(ctx, x, 1, PALETTE.lifeMint);
        this.p(ctx, x + 1, 0, PALETTE.lifeMint);
        this.p(ctx, x, 6, PALETTE.warmShadow);
      }
      this.rect(ctx, 0, 14, 16, 2, PALETTE.abyss, 0.7);
    });

    // 18. Modular Floor - Cryo Frosted Deck (16x16)
    this.drawSprite("tile_floor_cryo", 16, 16, (ctx) => {
      this.rect(ctx, 0, 0, 16, 16, PALETTE.coolantDark);
      this.rect(ctx, 0, 0, 16, 3, PALETTE.nightBlue);
      this.rect(ctx, 0, 0, 16, 1, PALETTE.coolantLight, 0.9);
      this.border(ctx, 0, 0, 16, 16, PALETTE.hullInk);
      // Frost patches
      this.rect(ctx, 3, 3, 4, 3, PALETTE.coolantLight, 0.5);
      this.p(ctx, 5, 4, PALETTE.whiteHeat);
      this.rect(ctx, 10, 8, 3, 3, PALETTE.coolantLight, 0.4);
    });

    // 19. Modular Floor - Hazard Caution Trim (16x16)
    this.drawSprite("tile_floor_hazard", 16, 16, (ctx) => {
      this.rect(ctx, 0, 0, 16, 16, PALETTE.hullInk);
      this.rect(ctx, 0, 0, 16, 1, PALETTE.warmCream, 0.5);
      for (let x = -8; x < 24; x += 6) {
        ctx.fillStyle = hexToCss(PALETTE.sunAmber);
        ctx.beginPath();
        ctx.moveTo(x, 1);
        ctx.lineTo(x + 4, 1);
        ctx.lineTo(x - 2, 7);
        ctx.lineTo(x - 6, 7);
        ctx.closePath();
        ctx.fill();
      }
      this.rect(ctx, 0, 8, 16, 8, PALETTE.warmShadow);
      this.rect(ctx, 0, 14, 16, 2, PALETTE.abyss, 0.8);
    });

    // 20. Ceiling - Structural Girder Beam (16x8)
    this.drawSprite("tile_ceiling_beam", 16, 8, (ctx) => {
      this.rect(ctx, 0, 0, 16, 3, PALETTE.hullInk);
      this.rect(ctx, 0, 0, 16, 1, PALETTE.brass, 0.7);
      this.rect(ctx, 3, 3, 10, 2, PALETTE.warmShadow);
      this.rect(ctx, 0, 5, 16, 3, PALETTE.hullInk);
      this.rect(ctx, 0, 7, 16, 1, PALETTE.abyss, 0.9);
    });

    // 21. Ceiling - Conduit Cable Tray (16x8)
    this.drawSprite("tile_ceiling_conduit", 16, 8, (ctx) => {
      this.rect(ctx, 0, 0, 16, 2, PALETTE.abyss);
      // Power cables running through tray
      this.rect(ctx, 0, 2, 16, 2, PALETTE.brass);
      this.rect(ctx, 0, 4, 16, 1, PALETTE.coolantTeal);
      this.rect(ctx, 0, 5, 16, 2, PALETTE.sunAmber);
      // Metal hanger brackets
      this.rect(ctx, 4, 0, 2, 8, PALETTE.warmShadow);
      this.rect(ctx, 12, 0, 2, 8, PALETTE.warmShadow);
    });

    // 22. Ceiling - Fluorescent / Neon Lamp Fixture (16x8)
    this.drawSprite("tile_ceiling_lamp", 16, 8, (ctx) => {
      this.rect(ctx, 2, 0, 12, 3, PALETTE.hullInk);
      this.rect(ctx, 2, 0, 12, 1, PALETTE.warmShadow);
      // Lamp tube
      this.rect(ctx, 3, 3, 10, 3, PALETTE.sunAmber);
      this.rect(ctx, 4, 4, 8, 1, PALETTE.whiteHeat);
      // End caps
      this.rect(ctx, 2, 3, 1, 3, PALETTE.brass);
      this.rect(ctx, 13, 3, 1, 3, PALETTE.brass);
    });

    // 23. Wall-Mounted Diagnostic Terminal Node (14x16)
    this.drawSprite("prop_wall_terminal", 14, 16, (ctx) => {
      this.rect(ctx, 1, 2, 12, 12, PALETTE.hullInk);
      this.border(ctx, 1, 2, 12, 12, PALETTE.brass);
      // Screen display
      this.rect(ctx, 3, 4, 8, 6, PALETTE.nightBlue);
      this.rect(ctx, 4, 5, 6, 2, PALETTE.coolantLight);
      this.p(ctx, 4, 8, PALETTE.sunAmber);
      this.p(ctx, 6, 8, PALETTE.lifeMint);
      // Keyboard ledge
      this.rect(ctx, 2, 12, 10, 2, PALETTE.warmShadow);
      this.rect(ctx, 3, 12, 8, 1, PALETTE.warmCream, 0.4);
    });

    // 24. Cargo Supply Crates (16x14)
    this.drawSprite("prop_cargo_crate", 16, 14, (ctx) => {
      this.rect(ctx, 0, 0, 16, 14, PALETTE.terracotta);
      this.border(ctx, 0, 0, 16, 14, PALETTE.brass);
      this.rect(ctx, 1, 1, 14, 1, PALETTE.warmCream, 0.3);
      this.rect(ctx, 1, 12, 14, 1, PALETTE.abyss, 0.7);
      // Diagonal reinforcement brace
      this.rect(ctx, 3, 3, 10, 8, PALETTE.warmShadow);
      this.rect(ctx, 5, 5, 6, 4, PALETTE.terracotta);
      this.p(ctx, 2, 2, PALETTE.brass);
      this.p(ctx, 13, 2, PALETTE.brass);
      this.p(ctx, 2, 11, PALETTE.brass);
      this.p(ctx, 13, 11, PALETTE.brass);
    });
  }

  private generateMachineryLandmarks(): void {
    // 1. Navigation Crown - Helm & Bridge Console (40x28)
    this.drawSprite("landmark_navigation", 40, 28, (ctx) => {
      // Dark command deck backdrop
      this.rect(ctx, 0, 0, 40, 28, PALETTE.abyss, 0.3);
      // Raised captain's dais
      this.rect(ctx, 4, 24, 32, 4, PALETTE.hullInk);
      this.rect(ctx, 4, 24, 32, 1, PALETTE.brass);
      // Command chair
      this.rect(ctx, 8, 12, 8, 12, PALETTE.warmShadow);
      this.rect(ctx, 10, 8, 6, 6, PALETTE.brass); // headrest
      this.rect(ctx, 6, 18, 2, 6, PALETTE.brass); // armrest
      // Main Holotable console (center)
      this.rect(ctx, 20, 16, 16, 8, PALETTE.hullInk);
      this.border(ctx, 20, 16, 16, 8, PALETTE.brass);
      this.rect(ctx, 22, 17, 12, 4, PALETTE.nightBlue);
      // Holo projector emitter
      this.rect(ctx, 26, 14, 4, 2, PALETTE.coolantLight);
      // Holographic star map projection
      this.p(ctx, 28, 9, PALETTE.coolantLight);
      this.p(ctx, 24, 11, PALETTE.sunAmber);
      this.p(ctx, 32, 10, PALETTE.lifeMint);
      this.p(ctx, 27, 6, PALETTE.whiteHeat);
      // Tactical displays
      this.rect(ctx, 22, 2, 7, 5, PALETTE.nightBlue);
      this.border(ctx, 22, 2, 7, 5, PALETTE.brass);
      this.p(ctx, 24, 4, PALETTE.coolantLight);
      this.rect(ctx, 31, 2, 7, 5, PALETTE.nightBlue);
      this.border(ctx, 31, 2, 7, 5, PALETTE.brass);
      this.p(ctx, 33, 4, PALETTE.sunAmber);
    });

    // 2. Sunwell Core - Toroidal Fusion Organ (48x48)
    this.drawSprite("landmark_sunwell", 48, 48, (ctx) => {
      // Outer magnetic containment ring
      const cx = 24;
      const cy = 24;
      for (let r = 22; r >= 18; r -= 1) {
        ctx.strokeStyle = hexToCss(PALETTE.brass, r === 22 ? 0.9 : 0.5);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 8 Radial choke coil pods
      for (let a = 0; a < 8; a += 1) {
        const rad = (a * Math.PI) / 4;
        const px = cx + Math.cos(rad) * 20;
        const py = cy + Math.sin(rad) * 20;
        this.rect(ctx, px - 2, py - 2, 4, 4, PALETTE.warmShadow);
        this.border(ctx, px - 2, py - 2, 4, 4, PALETTE.brass);
        this.p(ctx, px, py, PALETTE.sunAmber);
      }
      // Inner glowing plasma chamber
      this.rect(ctx, 14, 14, 20, 20, PALETTE.hullInk);
      this.border(ctx, 14, 14, 20, 20, PALETTE.sunAmber);
      this.rect(ctx, 17, 17, 14, 14, PALETTE.ember);
      this.rect(ctx, 20, 20, 8, 8, PALETTE.sunAmber);
      this.rect(ctx, 22, 22, 4, 4, PALETTE.whiteHeat); // Core singularity
      // Power conduit injectors
      this.rect(ctx, 22, 0, 4, 8, PALETTE.brass);
      this.rect(ctx, 22, 40, 4, 8, PALETTE.brass);
      this.rect(ctx, 0, 22, 8, 4, PALETTE.brass);
      this.rect(ctx, 40, 22, 8, 4, PALETTE.brass);
    });

    // 3. Verdant Ring - Hydroponic Bio-Terrace (40x30)
    this.drawSprite("landmark_verdant", 40, 30, (ctx) => {
      // Terraced planter boxes
      this.rect(ctx, 2, 20, 36, 10, PALETTE.terracotta);
      this.rect(ctx, 2, 20, 36, 1, PALETTE.brass);
      this.rect(ctx, 4, 12, 32, 8, PALETTE.mossDark);
      this.rect(ctx, 4, 12, 32, 1, PALETTE.brass);
      // Lush vegetation & algae moss
      for (let x = 5; x < 35; x += 3) {
        this.rect(ctx, x, 10, 2, 3, PALETTE.moss);
        this.p(ctx, x + 1, 9, PALETTE.lifeMint);
        this.rect(ctx, x - 1, 18, 3, 3, PALETTE.lifeMint);
      }
      // Vertical algae cylinder (left)
      this.rect(ctx, 6, 2, 8, 12, PALETTE.coolantDark);
      this.border(ctx, 6, 2, 8, 12, PALETTE.brass);
      this.rect(ctx, 8, 4, 4, 8, PALETTE.lifeMint, 0.7);
      this.p(ctx, 9, 6, PALETTE.whiteHeat);
      // Grow light gantry overhead
      this.rect(ctx, 16, 2, 22, 3, PALETTE.hullInk);
      this.rect(ctx, 18, 5, 4, 2, PALETTE.sunAmber);
      this.rect(ctx, 26, 5, 4, 2, PALETTE.sunAmber);
      this.rect(ctx, 33, 5, 4, 2, PALETTE.sunAmber);
      // Watering mist tube
      this.rect(ctx, 16, 6, 22, 1, PALETTE.coolantTeal, 0.5);
    });

    // 4. Thermal Choir - Heat Exchanger / Radiator (40x32)
    this.drawSprite("landmark_thermal", 40, 32, (ctx) => {
      // Massive turbine casing
      this.rect(ctx, 4, 6, 32, 22, PALETTE.nightBlue);
      this.border(ctx, 4, 6, 32, 22, PALETTE.brass);
      // Radiator cooling fins
      for (let x = 8; x < 32; x += 4) {
        this.rect(ctx, x, 8, 2, 18, PALETTE.hullInk);
        this.rect(ctx, x, 8, 1, 18, PALETTE.coolantDark);
      }
      // Central flow manifold
      this.rect(ctx, 16, 12, 8, 10, PALETTE.coolantDark);
      this.border(ctx, 16, 12, 8, 10, PALETTE.coolantTeal);
      this.rect(ctx, 18, 14, 4, 6, PALETTE.coolantLight);
      // Heavy high-pressure pipe flanges
      this.rect(ctx, 0, 14, 4, 6, PALETTE.brass);
      this.rect(ctx, 36, 14, 4, 6, PALETTE.brass);
      // Pressure gauges
      this.rect(ctx, 10, 2, 6, 6, PALETTE.warmShadow);
      this.border(ctx, 10, 2, 6, 6, PALETTE.brass);
      this.p(ctx, 12, 4, PALETTE.coolantLight);
      this.rect(ctx, 24, 2, 6, 6, PALETTE.warmShadow);
      this.border(ctx, 24, 2, 6, 6, PALETTE.brass);
      this.p(ctx, 26, 4, PALETTE.coolantLight);
    });

    // 5. Thermal Choir - Broken/Scorched Exchanger (40x32)
    this.drawSprite("landmark_thermal_broken", 40, 32, (ctx) => {
      // Scorched casing with soot
      this.rect(ctx, 4, 6, 32, 22, PALETTE.warmShadow);
      this.border(ctx, 4, 6, 32, 22, PALETTE.ember);
      // Broken distorted fins
      for (let x = 8; x < 32; x += 4) {
        this.rect(ctx, x, 8, 2, 16, PALETTE.abyss);
        this.p(ctx, x, 14, PALETTE.ember);
      }
      // Fissure rupture spilling molten heat
      this.rect(ctx, 14, 10, 12, 14, PALETTE.abyss);
      this.p(ctx, 16, 12, PALETTE.ember);
      this.p(ctx, 17, 13, PALETTE.whiteHeat);
      this.p(ctx, 19, 15, PALETTE.alarmRed);
      this.p(ctx, 22, 18, PALETTE.ember);
      this.p(ctx, 24, 21, PALETTE.whiteHeat);
      // Sputtering left flange
      this.rect(ctx, 0, 14, 4, 6, PALETTE.warmShadow);
      this.p(ctx, 3, 13, PALETTE.ember);
      this.p(ctx, 1, 12, PALETTE.whiteHeat);
      // Blown pressure gauge
      this.rect(ctx, 10, 2, 6, 6, PALETTE.abyss);
      this.border(ctx, 10, 2, 6, 6, PALETTE.alarmRed);
      this.p(ctx, 12, 4, PALETTE.alarmRed);
    });

    // 6. Cryovault - Stasis Pod Chamber (36x36)
    this.drawSprite("landmark_cryo", 36, 36, (ctx) => {
      this.rect(ctx, 0, 0, 36, 36, PALETTE.abyss, 0.4);
      // Overhead cryogenic distribution rail
      this.rect(ctx, 0, 2, 36, 4, PALETTE.hullInk);
      this.rect(ctx, 0, 3, 36, 1, PALETTE.coolantLight, 0.6);
      // 3 Vertical Cryo Pods
      const podPositions = [4, 15, 26];
      for (const px of podPositions) {
        // Outer pod casing
        this.rect(ctx, px, 8, 7, 24, PALETTE.warmShadow);
        this.border(ctx, px, 8, 7, 24, PALETTE.brass);
        // Frosted blue glass
        this.rect(ctx, px + 2, 12, 3, 14, PALETTE.coolantDark);
        this.rect(ctx, px + 2, 13, 1, 12, PALETTE.coolantLight, 0.8); // frost reflection
        // Colonist silhouette inside
        this.p(ctx, px + 3, 16, PALETTE.nightBlue);
        this.p(ctx, px + 3, 19, PALETTE.nightBlue);
        // Pod base vent & LED
        this.rect(ctx, px + 1, 28, 5, 3, PALETTE.hullInk);
        this.p(ctx, px + 3, 29, PALETTE.coolantLight);
        // Coolant feed tube connecting to ceiling
        this.rect(ctx, px + 3, 5, 1, 3, PALETTE.coolantTeal);
      }
      // Subzero floor frost mist
      this.rect(ctx, 0, 32, 36, 2, PALETTE.coolantLight, 0.2);
    });

    // 7. Atmosphere Lungs - Bellows & Scrubbers (36x32)
    this.drawSprite("landmark_lungs", 36, 32, (ctx) => {
      // Outer housing
      this.rect(ctx, 2, 4, 32, 24, PALETTE.hullInk);
      this.border(ctx, 2, 4, 32, 24, PALETTE.brass);
      // Dual accordion breathing bellows (left & right)
      for (const bx of [6, 20]) {
        this.rect(ctx, bx, 8, 10, 16, PALETTE.nightBlue);
        // Pleated rubber folds
        for (let y = 9; y < 24; y += 3) {
          this.rect(ctx, bx, y, 10, 1, PALETTE.warmShadow);
          this.rect(ctx, bx + 1, y, 8, 1, PALETTE.lifeMint, 0.4);
        }
        this.border(ctx, bx, 8, 10, 16, PALETTE.lifeMint);
      }
      // Central intake turbine fan
      this.rect(ctx, 16, 12, 4, 8, PALETTE.brass);
      this.p(ctx, 17, 15, PALETTE.whiteHeat);
      // Vent grills at bottom
      for (let x = 5; x < 31; x += 3) {
        this.rect(ctx, x, 25, 2, 2, PALETTE.abyss);
      }
    });

    // 8. Fabrication Reef - 3D Nanite Assembler (36x28)
    this.drawSprite("landmark_fabrication", 36, 28, (ctx) => {
      // Base gantry bed
      this.rect(ctx, 2, 18, 32, 8, PALETTE.terracotta);
      this.rect(ctx, 2, 18, 32, 1, PALETTE.brass);
      // Conveyor belt with matter blocks
      this.rect(ctx, 4, 20, 28, 3, PALETTE.hullInk);
      this.rect(ctx, 8, 17, 4, 3, PALETTE.sunAmber); // matter cube 1
      this.rect(ctx, 22, 17, 5, 3, PALETTE.sunAmber); // matter cube 2
      // Overhead gantry arm
      this.rect(ctx, 2, 4, 32, 3, PALETTE.brass);
      this.rect(ctx, 2, 4, 3, 14, PALETTE.warmShadow);
      this.rect(ctx, 31, 4, 3, 14, PALETTE.warmShadow);
      // Articulated extruder head
      this.rect(ctx, 14, 7, 8, 4, PALETTE.hullInk);
      this.rect(ctx, 17, 11, 2, 4, PALETTE.brass); // nozzle
      this.p(ctx, 17, 15, PALETTE.whiteHeat); // laser spark
    });

    // 9. Memory Reef - Crystal Data Monoliths (32x36)
    this.drawSprite("landmark_memory", 32, 36, (ctx) => {
      this.rect(ctx, 0, 0, 32, 36, PALETTE.abyss, 0.4);
      // Main faceted crystal obelisk (center)
      this.rect(ctx, 12, 6, 8, 24, PALETTE.hullInk);
      this.border(ctx, 12, 6, 8, 24, PALETTE.brass);
      // Amber data runes / facets inside crystal
      this.rect(ctx, 14, 10, 4, 2, PALETTE.sunAmber);
      this.rect(ctx, 15, 14, 2, 5, PALETTE.sunAmber);
      this.rect(ctx, 14, 21, 4, 2, PALETTE.whiteHeat);
      // Flanking server racks
      this.rect(ctx, 2, 12, 7, 18, PALETTE.nightBlue);
      this.border(ctx, 2, 12, 7, 18, PALETTE.warmShadow);
      for (let y = 14; y < 28; y += 3) {
        this.p(ctx, 4, y, PALETTE.coolantLight);
        this.p(ctx, 6, y, PALETTE.sunAmber);
      }
      this.rect(ctx, 23, 12, 7, 18, PALETTE.nightBlue);
      this.border(ctx, 23, 12, 7, 18, PALETTE.warmShadow);
      for (let y = 14; y < 28; y += 3) {
        this.p(ctx, 25, y, PALETTE.lifeMint);
        this.p(ctx, 27, y, PALETTE.coolantLight);
      }
      // Optical waveguide bus at base
      this.rect(ctx, 0, 30, 32, 4, PALETTE.hullInk);
      this.rect(ctx, 0, 31, 32, 1, PALETTE.sunAmber, 0.7);
    });

    // 10. Reservoirs - Coolant Cistern Tank (36x30)
    this.drawSprite("landmark_reservoirs", 36, 30, (ctx) => {
      // Cylindrical heavy tank body
      this.rect(ctx, 4, 4, 28, 22, PALETTE.coolantDark);
      this.border(ctx, 4, 4, 28, 22, PALETTE.brass);
      // Sight glass level gauge
      this.rect(ctx, 16, 7, 4, 16, PALETTE.abyss);
      this.border(ctx, 16, 7, 4, 16, PALETTE.warmCream);
      this.rect(ctx, 17, 11, 2, 11, PALETTE.coolantLight); // 75% coolant level
      // High-pressure reinforcement bands
      this.rect(ctx, 4, 10, 28, 2, PALETTE.brass);
      this.rect(ctx, 4, 20, 28, 2, PALETTE.brass);
      // Top pressure wheel & valve
      this.rect(ctx, 15, 0, 6, 4, PALETTE.brass);
      this.p(ctx, 17, 1, PALETTE.warmCream);
      // Drainage manifold
      this.rect(ctx, 0, 22, 4, 4, PALETTE.brass);
      this.rect(ctx, 32, 22, 4, 4, PALETTE.brass);
    });
  }

  private generateCaretakerFrames(): void {
    // 16x24 Caretaker sprite
    const drawBaseCaretaker = (
      ctx: CanvasRenderingContext2D,
      legOffsetL: number,
      legOffsetR: number,
      armOffset: number,
      facing: "side" | "back" = "side",
    ) => {
      // 1. Helmet (y: 2 to 9)
      this.rect(ctx, 5, 2, 6, 7, PALETTE.warmCream);
      this.border(ctx, 5, 2, 6, 7, PALETTE.warmShadow);
      if (facing === "side") {
        // Visor glow
        this.rect(ctx, 8, 4, 3, 3, PALETTE.coolantLight);
        this.p(ctx, 9, 5, PALETTE.whiteHeat);
        // Helmet antenna
        this.rect(ctx, 4, 1, 1, 3, PALETTE.brass);
        this.p(ctx, 4, 0, PALETTE.sunAmber);
      } else {
        // Back of helmet
        this.rect(ctx, 6, 4, 4, 3, PALETTE.hullInk);
      }

      // 2. Torso / Spacesuit (y: 9 to 16)
      this.rect(ctx, 5, 9, 6, 7, PALETTE.hullInk);
      this.border(ctx, 5, 9, 6, 7, PALETTE.brass);
      // Life-support chest rig / backpack
      if (facing === "side") {
        this.rect(ctx, 3, 10, 2, 5, PALETTE.warmShadow); // backpack
        this.p(ctx, 3, 11, PALETTE.lifeMint); // battery indicator
        this.rect(ctx, 7, 11, 2, 2, PALETTE.sunAmber); // chest control
      } else {
        this.rect(ctx, 5, 10, 6, 5, PALETTE.warmShadow); // twin oxygen tanks
        this.p(ctx, 6, 11, PALETTE.lifeMint);
        this.p(ctx, 9, 11, PALETTE.lifeMint);
      }

      // 3. Arms
      if (facing === "side") {
        this.rect(ctx, 6 + armOffset, 11, 2, 5, PALETTE.brass);
        this.p(ctx, 6 + armOffset, 16, PALETTE.warmCream); // glove
      } else {
        this.rect(ctx, 3, 10 + armOffset, 2, 5, PALETTE.brass);
        this.rect(ctx, 11, 10 - armOffset, 2, 5, PALETTE.brass);
      }

      // 4. Legs & Boots (y: 16 to 23)
      // Left leg
      this.rect(ctx, 5, 16, 2, 5 + legOffsetL, PALETTE.brass);
      this.rect(ctx, 4, 21 + legOffsetL, 3, 2, PALETTE.warmShadow); // boot
      // Right leg
      this.rect(ctx, 9, 16, 2, 5 + legOffsetR, PALETTE.brass);
      this.rect(ctx, 9, 21 + legOffsetR, 3, 2, PALETTE.warmShadow); // boot
    };

    // Idle 0 (Neutral stance)
    this.drawSprite("caretaker_idle_0", 16, 24, (ctx) => drawBaseCaretaker(ctx, 0, 0, 0));
    // Idle 1 (Subtle breathing bob)
    this.drawSprite("caretaker_idle_1", 16, 24, (ctx) => {
      ctx.translate(0, 1);
      drawBaseCaretaker(ctx, 0, 0, 0);
    });
    // Idle 2 (Visor scan left)
    this.drawSprite("caretaker_idle_2", 16, 24, (ctx) => {
      drawBaseCaretaker(ctx, 0, 0, 0);
      this.p(ctx, 8, 4, PALETTE.whiteHeat);
    });
    // Idle 3 (Visor glint right)
    this.drawSprite("caretaker_idle_3", 16, 24, (ctx) => {
      drawBaseCaretaker(ctx, 0, 0, 0);
      this.p(ctx, 10, 5, PALETTE.whiteHeat);
    });

    // Walk 0 (Contact phase left)
    this.drawSprite("caretaker_walk_0", 16, 24, (ctx) => drawBaseCaretaker(ctx, 1, -1, 1));
    // Walk 1 (Pass phase)
    this.drawSprite("caretaker_walk_1", 16, 24, (ctx) => drawBaseCaretaker(ctx, 0, 0, 0));
    // Walk 2 (Contact phase right)
    this.drawSprite("caretaker_walk_2", 16, 24, (ctx) => drawBaseCaretaker(ctx, -1, 1, -1));
    // Walk 3 (Pass phase)
    this.drawSprite("caretaker_walk_3", 16, 24, (ctx) => drawBaseCaretaker(ctx, 0, 0, 0));

    // Climb 0
    this.drawSprite("caretaker_climb_0", 16, 24, (ctx) => drawBaseCaretaker(ctx, 1, -1, 1, "back"));
    // Climb 1
    this.drawSprite("caretaker_climb_1", 16, 24, (ctx) => drawBaseCaretaker(ctx, -1, 1, -1, "back"));

    // Work / Inspect pose
    this.drawSprite("caretaker_work", 16, 24, (ctx) => {
      drawBaseCaretaker(ctx, 0, 0, 2);
      // Handheld diagnostic scanner emitter
      this.rect(ctx, 10, 14, 4, 2, PALETTE.coolantLight);
      this.p(ctx, 14, 15, PALETTE.whiteHeat);
    });
  }

  private generateCrewFrames(): void {
    // 1. Pilot (16x20 seated at flight console)
    this.drawSprite("crew_pilot_0", 16, 20, (ctx) => {
      // Head & flight headset
      this.rect(ctx, 6, 2, 5, 5, PALETTE.warmCream);
      this.rect(ctx, 5, 1, 7, 2, PALETTE.nightBlue); // headset band
      this.p(ctx, 5, 3, PALETTE.sunAmber); // earpiece
      this.p(ctx, 10, 4, PALETTE.coolantLight); // eye visor
      // Navy flight jacket
      this.rect(ctx, 5, 7, 7, 6, PALETTE.nightBlue);
      this.rect(ctx, 7, 8, 3, 2, PALETTE.brass); // chest insignia
      // Hands on joystick controls
      this.rect(ctx, 10, 10, 4, 3, PALETTE.brass);
      this.p(ctx, 13, 9, PALETTE.whiteHeat); // joystick knob
      // Seated legs
      this.rect(ctx, 5, 13, 6, 5, PALETTE.hullInk);
      this.rect(ctx, 8, 17, 4, 3, PALETTE.warmShadow);
    });
    this.drawSprite("crew_pilot_1", 16, 20, (ctx) => {
      ctx.translate(0, 1);
      // Frame 1 with head slight nod and screen reflection
      this.rect(ctx, 6, 2, 5, 5, PALETTE.warmCream);
      this.rect(ctx, 5, 1, 7, 2, PALETTE.nightBlue);
      this.p(ctx, 5, 3, PALETTE.sunAmber);
      this.p(ctx, 10, 4, PALETTE.whiteHeat); // brighter screen reflection
      this.rect(ctx, 5, 7, 7, 6, PALETTE.nightBlue);
      this.rect(ctx, 7, 8, 3, 2, PALETTE.brass);
      this.rect(ctx, 10, 10, 4, 3, PALETTE.brass);
      this.p(ctx, 13, 9, PALETTE.sunAmber);
      this.rect(ctx, 5, 13, 6, 5, PALETTE.hullInk);
      this.rect(ctx, 8, 17, 4, 3, PALETTE.warmShadow);
    });

    // 2. Botanist (16x22 in Verdant Concourse)
    this.drawSprite("crew_botanist_0", 16, 22, (ctx) => {
      // Hat/Hair
      this.rect(ctx, 5, 2, 6, 5, PALETTE.mossDark);
      this.p(ctx, 9, 4, PALETTE.warmCream); // face profile
      // Olive apron
      this.rect(ctx, 5, 7, 6, 8, PALETTE.moss);
      this.rect(ctx, 6, 7, 4, 6, PALETTE.terracotta);
      // Pruning wand
      this.rect(ctx, 10, 10, 4, 2, PALETTE.brass);
      this.p(ctx, 13, 10, PALETTE.lifeMint);
      // Legs
      this.rect(ctx, 5, 15, 2, 6, PALETTE.hullInk);
      this.rect(ctx, 9, 15, 2, 6, PALETTE.hullInk);
    });
    this.drawSprite("crew_botanist_1", 16, 22, (ctx) => {
      ctx.translate(0, 1);
      this.rect(ctx, 5, 2, 6, 5, PALETTE.mossDark);
      this.p(ctx, 9, 4, PALETTE.warmCream);
      this.rect(ctx, 5, 7, 6, 8, PALETTE.moss);
      this.rect(ctx, 6, 7, 4, 6, PALETTE.terracotta);
      this.rect(ctx, 10, 9, 4, 2, PALETTE.brass); // raised shears
      this.p(ctx, 14, 9, PALETTE.whiteHeat);
      this.rect(ctx, 5, 15, 2, 6, PALETTE.hullInk);
      this.rect(ctx, 9, 15, 2, 6, PALETTE.hullInk);
    });

    // 3. Engineer (16x22 in Engineering / Lower Decks)
    this.drawSprite("crew_engineer_0", 16, 22, (ctx) => {
      // Hardhat & visor
      this.rect(ctx, 5, 2, 6, 4, PALETTE.sunAmber);
      this.p(ctx, 9, 4, PALETTE.coolantLight); // protective visor
      // Orange hazmat / coveralls
      this.rect(ctx, 5, 6, 6, 9, PALETTE.ember);
      this.rect(ctx, 6, 7, 4, 2, PALETTE.warmCream, 0.7); // reflective safety stripe
      // Heavy torque tool
      this.rect(ctx, 10, 10, 4, 3, PALETTE.brass);
      this.p(ctx, 13, 12, PALETTE.sunAmber);
      // Work boots
      this.rect(ctx, 4, 15, 3, 6, PALETTE.warmShadow);
      this.rect(ctx, 9, 15, 3, 6, PALETTE.warmShadow);
    });
    this.drawSprite("crew_engineer_1", 16, 22, (ctx) => {
      ctx.translate(0, 1);
      this.rect(ctx, 5, 2, 6, 4, PALETTE.sunAmber);
      this.p(ctx, 9, 4, PALETTE.whiteHeat);
      this.rect(ctx, 5, 6, 6, 9, PALETTE.ember);
      this.rect(ctx, 6, 7, 4, 2, PALETTE.warmCream, 0.7);
      this.rect(ctx, 10, 8, 4, 3, PALETTE.brass); // welding posture
      this.p(ctx, 14, 8, PALETTE.whiteHeat); // welding arc flash
      this.rect(ctx, 4, 15, 3, 6, PALETTE.warmShadow);
      this.rect(ctx, 9, 15, 3, 6, PALETTE.warmShadow);
    });

    // 4. Scientist (16x22 in Memory Reef)
    this.drawSprite("crew_scientist_0", 16, 22, (ctx) => {
      // Hair & glasses
      this.rect(ctx, 5, 2, 6, 5, PALETTE.warmShadow);
      this.p(ctx, 9, 4, PALETTE.coolantTeal);
      // White lab coat
      this.rect(ctx, 5, 7, 6, 9, PALETTE.warmCream);
      this.rect(ctx, 7, 7, 2, 7, PALETTE.nightBlue); // inner shirt
      // Glowing datapad tablet
      this.rect(ctx, 10, 9, 5, 5, PALETTE.coolantLight);
      this.p(ctx, 11, 10, PALETTE.whiteHeat);
      this.p(ctx, 12, 12, PALETTE.nightBlue);
      // Trousers
      this.rect(ctx, 5, 16, 2, 5, PALETTE.hullInk);
      this.rect(ctx, 9, 16, 2, 5, PALETTE.hullInk);
    });
    this.drawSprite("crew_scientist_1", 16, 22, (ctx) => {
      ctx.translate(0, 1);
      this.rect(ctx, 5, 2, 6, 5, PALETTE.warmShadow);
      this.p(ctx, 9, 4, PALETTE.coolantTeal);
      this.rect(ctx, 5, 7, 6, 9, PALETTE.warmCream);
      this.rect(ctx, 7, 7, 2, 7, PALETTE.nightBlue);
      this.rect(ctx, 10, 10, 5, 5, PALETTE.coolantLight);
      this.p(ctx, 12, 11, PALETTE.whiteHeat);
      this.rect(ctx, 5, 16, 2, 5, PALETTE.hullInk);
      this.rect(ctx, 9, 16, 2, 5, PALETTE.hullInk);
    });
  }

  private generateDroneFrames(): void {
    // 12x12 Flying Drone
    const drawDrone = (ctx: CanvasRenderingContext2D, thrusterPulse: number) => {
      // Spherical hull
      this.rect(ctx, 3, 2, 6, 6, PALETTE.hullInk);
      this.border(ctx, 3, 2, 6, 6, PALETTE.brass);
      // Sensor eye
      this.rect(ctx, 5, 4, 2, 2, PALETTE.coolantLight);
      this.p(ctx, 5, 4, PALETTE.whiteHeat);
      // Dual side stabilizers
      this.rect(ctx, 1, 4, 2, 2, PALETTE.warmShadow);
      this.rect(ctx, 9, 4, 2, 2, PALETTE.warmShadow);
      // Bottom thruster plume
      this.rect(ctx, 5, 8, 2, 2 + thrusterPulse, PALETTE.sunAmber);
      this.p(ctx, 5, 8, PALETTE.whiteHeat);
    };

    this.drawSprite("drone_0", 12, 12, (ctx) => drawDrone(ctx, 1));
    this.drawSprite("drone_1", 12, 12, (ctx) => drawDrone(ctx, 2));
  }

  private generateEffectsAndUI(): void {
    // 1. Spark Particle (4x4)
    this.drawSprite("fx_spark", 4, 4, (ctx) => {
      this.rect(ctx, 1, 0, 2, 4, PALETTE.ember);
      this.rect(ctx, 0, 1, 4, 2, PALETTE.ember);
      this.rect(ctx, 1, 1, 2, 2, PALETTE.whiteHeat);
    });

    // 2. Steam Smoke (8x8)
    this.drawSprite("fx_steam", 8, 8, (ctx) => {
      this.rect(ctx, 2, 1, 4, 6, PALETTE.warmCream, 0.4);
      this.rect(ctx, 1, 2, 6, 4, PALETTE.warmCream, 0.4);
      this.rect(ctx, 2, 2, 4, 4, PALETTE.whiteHeat, 0.7);
    });

    // 3. Coolant Packet (4x4)
    this.drawSprite("fx_coolant", 4, 4, (ctx) => {
      this.rect(ctx, 1, 0, 2, 4, PALETTE.coolantTeal);
      this.rect(ctx, 0, 1, 4, 2, PALETTE.coolantTeal);
      this.rect(ctx, 1, 1, 2, 2, PALETTE.coolantLight);
      this.p(ctx, 1, 1, PALETTE.whiteHeat);
    });

    // 4. Nanite Repair Particle (4x4)
    this.drawSprite("fx_nanite", 4, 4, (ctx) => {
      this.p(ctx, 1, 0, PALETTE.sunAmber);
      this.p(ctx, 2, 0, PALETTE.sunAmber);
      this.p(ctx, 0, 1, PALETTE.sunAmber);
      this.p(ctx, 3, 1, PALETTE.sunAmber);
      this.rect(ctx, 1, 1, 2, 2, PALETTE.whiteHeat);
      this.p(ctx, 1, 3, PALETTE.sunAmber);
      this.p(ctx, 2, 3, PALETTE.sunAmber);
    });

    // 5. Selection Reticle Bracket (10x10)
    this.drawSprite("ui_reticle_corner", 10, 10, (ctx) => {
      this.rect(ctx, 0, 0, 10, 2, PALETTE.coolantLight);
      this.rect(ctx, 0, 0, 2, 10, PALETTE.coolantLight);
      this.rect(ctx, 1, 1, 2, 2, PALETTE.whiteHeat);
    });
  }
}
