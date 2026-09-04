import { Container, Graphics, Sprite } from "pixi.js";
import { PALETTE } from "../colors";
import type { ArkCell } from "../../engine/types";
import type { SpriteSheetAtlas } from "./pixelAtlas";
import type { LadderSegment, ShipLayout, WalkwaySegment } from "./shipLayout";

export type CaretakerState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  action: "idle" | "walking" | "climbing" | "working";
  onLadder: boolean;
  cameraFollow: boolean;
  nearestCell: ArkCell | null;
};

export class PlayableCaretaker {
  public readonly container = new Container();
  private sprite: Sprite;
  private atlas: SpriteSheetAtlas;
  private layout: ShipLayout;
  private onSelectCell: (cellId: number) => void;

  // Position & physics
  public x = 240;
  public y = 436;
  public vx = 0;
  public vy = 0;
  public facing: 1 | -1 = 1;
  public action: "idle" | "walking" | "climbing" | "working" = "idle";
  public onLadder = false;
  public cameraFollow = true;
  public nearestCell: ArkCell | null = null;

  // Input states
  private inputLeft = false;
  private inputRight = false;
  private inputUp = false;
  private inputDown = false;
  private inputRun = false;

  // Animation timing
  private animTimer = 0;
  private animFrame = 0;

  // Active walkway/ladder cache
  private currentWalkway: WalkwaySegment | null = null;
  private activeLadder: LadderSegment | null = null;

  constructor(
    atlas: SpriteSheetAtlas,
    layout: ShipLayout,
    onSelectCell: (cellId: number) => void,
  ) {
    this.atlas = atlas;
    this.layout = layout;
    this.onSelectCell = onSelectCell;

    // Initial position on main deck
    const nearest = this.layout.findNearestWalkway(this.x, this.y);
    this.currentWalkway = nearest.walkway;
    this.y = nearest.walkway.y;

    // Ground shadow
    const shadow = new Graphics();
    shadow.ellipse(0, 0, 8, 3).fill({ color: PALETTE.abyss, alpha: 0.6 });
    this.container.addChild(shadow);

    this.sprite = new Sprite(this.atlas.getTexture("caretaker_idle_0"));
    this.sprite.anchor.set(0.5, 1.0); // bottom center
    this.sprite.scale.set(1.35, 1.35); // 24-36px tall on-screen presence
    this.container.addChild(this.sprite);
    this.container.position.set(this.x, this.y);
  }

  public handleKeyDown(code: string): boolean {
    let consumed = true;
    switch (code) {
      case "KeyA":
      case "ArrowLeft":
        this.inputLeft = true;
        this.cameraFollow = true;
        break;
      case "KeyD":
      case "ArrowRight":
        this.inputRight = true;
        this.cameraFollow = true;
        break;
      case "KeyW":
      case "ArrowUp":
        this.inputUp = true;
        this.cameraFollow = true;
        break;
      case "KeyS":
      case "ArrowDown":
        this.inputDown = true;
        this.cameraFollow = true;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this.inputRun = true;
        break;
      case "KeyE":
      case "Space":
        if (this.nearestCell) {
          this.action = "working";
          this.onSelectCell(this.nearestCell.id);
        }
        break;
      case "KeyC":
        this.cameraFollow = true;
        break;
      default:
        consumed = false;
    }
    return consumed;
  }

  public handleKeyUp(code: string): void {
    switch (code) {
      case "KeyA":
      case "ArrowLeft":
        this.inputLeft = false;
        break;
      case "KeyD":
      case "ArrowRight":
        this.inputRight = false;
        break;
      case "KeyW":
      case "ArrowUp":
        this.inputUp = false;
        break;
      case "KeyS":
      case "ArrowDown":
        this.inputDown = false;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this.inputRun = false;
        break;
    }
  }

  /**
   * Called when external input calls panBy(dx, dy)
   */
  public handlePanBy(dx: number, dy: number): void {
    this.cameraFollow = true;
    if (dx < 0) {
      this.facing = -1;
      this.x = Math.max(130, this.x + dx * 0.4);
    } else if (dx > 0) {
      this.facing = 1;
      this.x = Math.min(this.layout.worldWidth - 130, this.x + dx * 0.4);
    }

    if (dy !== 0) {
      const ladder = this.layout.findNearestLadder(this.x, this.y, 48);
      if (ladder) {
        this.x = ladder.x;
        this.y = Math.max(ladder.topY, Math.min(ladder.bottomY, this.y + dy * 0.4));
        this.onLadder = true;
      }
    }
  }

  public update(deltaMS: number): void {
    const dt = Math.min(deltaMS, 64) * 0.001;
    const speed = this.inputRun ? 240 : 140;
    const climbSpeed = 130;

    // 1. Ladder Detection (wider search radius)
    const nearbyLadder = this.layout.findNearestLadder(this.x, this.y, 38);

    // 2. Vertical Ladder Climbing
    if (this.inputUp || this.inputDown) {
      if (nearbyLadder) {
        this.onLadder = true;
        this.activeLadder = nearbyLadder;
        this.x = nearbyLadder.x; // Snap horizontally to ladder center
        if (this.inputUp) {
          this.y = Math.max(nearbyLadder.topY, this.y - climbSpeed * dt);
        } else if (this.inputDown) {
          this.y = Math.min(nearbyLadder.bottomY, this.y + climbSpeed * dt);
        }
      }
    }

    // 3. Horizontal Movement
    let moveX = 0;
    if (this.inputLeft) moveX -= 1;
    if (this.inputRight) moveX += 1;

    if (moveX !== 0) {
      this.facing = moveX > 0 ? 1 : -1;
      this.x += moveX * speed * dt;

      // If on ladder and moving horizontally, step onto nearest deck floor
      if (this.onLadder) {
        const nearest = this.layout.findNearestWalkway(this.x, this.y);
        if (nearest.distY < 32) {
          this.y = nearest.walkway.y;
          this.currentWalkway = nearest.walkway;
          this.onLadder = false;
          this.activeLadder = null;
        } else {
          // In transit between decks, step horizontally is restricted until deck level
          this.x = (nearbyLadder ?? this.activeLadder)?.x ?? this.x;
        }
      }
    }

    // 4. Deck Floor Adherence
    if (!this.onLadder) {
      const nearest = this.layout.findNearestWalkway(this.x, this.y);
      this.currentWalkway = nearest.walkway;
      this.y = nearest.walkway.y;
      this.x = Math.max(nearest.walkway.minX, Math.min(nearest.walkway.maxX, this.x));
    }

    // Update Action State with transition reset
    const prevAction = this.action;
    if (this.onLadder) {
      this.action = this.inputUp || this.inputDown ? "climbing" : "idle";
    } else if (moveX !== 0) {
      this.action = "walking";
    } else if (this.action !== "working") {
      this.action = "idle";
    }

    if (this.action !== prevAction) {
      this.animTimer = 0;
      this.animFrame = 0;
    }

    // Animation frames
    this.animTimer += deltaMS;
    if (this.action === "walking") {
      const frameInterval = this.inputRun ? 90 : 130;
      if (this.animTimer > frameInterval) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 4;
      }
      this.sprite.texture = this.atlas.getTexture(`caretaker_walk_${this.animFrame % 4}`);
    } else if (this.action === "climbing") {
      if (this.animTimer > 150) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 2;
      }
      this.sprite.texture = this.atlas.getTexture(`caretaker_climb_${this.animFrame % 2}`);
    } else if (this.action === "working") {
      this.sprite.texture = this.atlas.getTexture("caretaker_work");
      if (this.animTimer > 800) {
        this.action = "idle";
        this.animTimer = 0;
        this.animFrame = 0;
      }
    } else {
      // Idle (gentle breathing & visor glance)
      if (this.animTimer > 600) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 4;
      }
      this.sprite.texture = this.atlas.getTexture(`caretaker_idle_${this.animFrame % 4}`);
    }

    // Orientation flip with consistent 1.35x scale
    this.sprite.scale.set(this.facing * 1.35, 1.35);

    // Sync container position
    this.container.position.set(Math.round(this.x), Math.round(this.y));

    // Proximity search for nearby interactive ArkCell
    this.nearestCell = this.layout.findCellAt(this.x, this.y - 12, 48);
  }

  public teleportTo(x: number, y: number): void {
    this.x = x;
    const nearest = this.layout.findNearestWalkway(x, y);
    this.y = nearest.walkway.y;
    this.currentWalkway = nearest.walkway;
    this.onLadder = false;
    this.cameraFollow = true;
    this.container.position.set(Math.round(this.x), Math.round(this.y));
  }
}
