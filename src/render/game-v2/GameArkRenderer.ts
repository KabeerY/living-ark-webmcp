import { Application, Container, Graphics, Sprite, type Texture } from "pixi.js";
import { Viewport } from "pixi-viewport";
import type { ArkCell, ArkEdge, ArkSnapshot, SystemLens } from "../../engine/types";
import { OVERHEAT_THRESHOLD } from "../../engine/metrics";
import { mixColor, PALETTE } from "../colors";
import { loadArkAtlas, type ArkAtlas } from "../atlas";
import type { ArkRendererContract, ArkRendererOptions } from "../contract";
import { PlayableCaretaker } from "./caretaker";
import { DroneSystem } from "./drones";
import { LensVisualizer } from "./lenses";
import { LightingSystem } from "./lighting";
import { ParticleSystem } from "./particles";
import { PixelArtAtlasGenerator, type SpriteSheetAtlas } from "./pixelAtlas";
import { RecoveryWaveController } from "./recoveryWave";
import { RoomTileRenderer } from "./roomTiles";
import { ShipLayout } from "./shipLayout";
import { StarfieldBackground } from "./starfield";

type LivingLandmarkSprite = {
  sprite: Sprite;
  role: "hull" | "garden" | "lungs" | "sunwell" | "memory" | "fabrication" | "cryo" | "reservoir" | "thermal";
  baseScale: number;
  baseY: number;
  phase: number;
};

export class GameArkRenderer implements ArkRendererContract {
  private readonly host: HTMLElement;
  private snapshot: ArkSnapshot;
  private lens: SystemLens;
  private readonly onSelectCell: (cellId: number) => void;

  // Pixi & Viewport
  private app = new Application();
  private viewport: Viewport | null = null;
  private world = new Container();

  // Atlases & Modular Tilemap Renderer
  private arkAtlas: ArkAtlas | null = null;
  private spriteAtlas: SpriteSheetAtlas | null = null;
  private roomTileRenderer: RoomTileRenderer | null = null;

  // Subsystems
  private layout: ShipLayout | null = null;
  private starfield: StarfieldBackground | null = null;
  private caretaker: PlayableCaretaker | null = null;
  private drones: DroneSystem | null = null;
  private particles: ParticleSystem | null = null;
  private lighting: LightingSystem | null = null;
  private recovery: RecoveryWaveController | null = null;

  // Visual Layers (ordered back-to-front)
  private hullLayer = new Container();
  private sectorMassLayer = new Container();
  private deckIslandLayer = new Container();
  private walkwayLayer = new Container();
  private landmarkAtlasLayer = new Container();
  private networkLayer = new Graphics();
  private cellsLayer = new Container();
  private flowLayer = new Graphics();
  private effectLayer = new Graphics();
  private selectionLayer = new Graphics();
  private uiPromptLayer = new Graphics();

  // State
  private selectedId: number | null = null;
  private cellGraphics = new Map<number, Graphics>();
  private livingLandmarks: LivingLandmarkSprite[] = [];
  private elapsed = 0;
  private animationFrame = 0;
  private resizeObserver: ResizeObserver | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private keyupHandler: ((e: KeyboardEvent) => void) | null = null;
  private wheelHandler: ((e: WheelEvent) => void) | null = null;

  constructor(options: ArkRendererOptions) {
    this.host = options.host;
    this.snapshot = options.snapshot;
    this.lens = options.lens;
    this.onSelectCell = options.onSelectCell;
  }

  public async init(): Promise<void> {
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

    // 1. Load the pre-rendered Living Ark 2.5D Sprite Atlas
    try {
      this.arkAtlas = await loadArkAtlas();
    } catch (err) {
      console.warn("Could not load Living Ark sprite atlas; falling back to code sprites.", err);
      this.arkAtlas = null;
    }

    // 2. Generate original character & particle textures
    const generator = new PixelArtAtlasGenerator();
    this.spriteAtlas = generator.generate();
    this.roomTileRenderer = new RoomTileRenderer(this.spriteAtlas);

    // 3. Initialize Ship Layout
    this.layout = new ShipLayout(this.snapshot);

    // 4. Viewport Setup
    const viewport = new Viewport({
      screenWidth: this.host.clientWidth,
      screenHeight: this.host.clientHeight,
      worldWidth: this.snapshot.worldWidth,
      worldHeight: this.snapshot.worldHeight,
      events: this.app.renderer.events,
    });
    this.viewport = viewport;
    viewport
      .drag()
      .pinch()
      .wheel({ smooth: 5 })
      .decelerate({ friction: 0.92 });
    viewport.clampZoom({ minScale: 0.44, maxScale: 2.8 });
    viewport.clamp({ direction: "all", underflow: "center" });

    // Robust native trackpad 2-finger pinch & scroll zoom handler
    this.wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      if (!this.viewport) return;
      if (this.caretaker) {
        this.caretaker.cameraFollow = false;
      }
      // On trackpad pinch, ctrlKey is true with fine deltaY. On normal wheel/scroll, ctrlKey is false.
      const factor = e.ctrlKey ? 0.015 : 0.0018;
      const zoomMultiplier = Math.exp(-e.deltaY * factor);
      const curScale = this.viewport.scale.x;
      const targetScale = Math.max(0.44, Math.min(2.8, curScale * zoomMultiplier));

      const rect = this.host.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldPoint = this.viewport.toWorld(mouseX, mouseY);

      this.viewport.scale.set(targetScale);
      const newScreenPoint = this.viewport.toScreen(worldPoint.x, worldPoint.y);
      this.viewport.x += mouseX - newScreenPoint.x;
      this.viewport.y += mouseY - newScreenPoint.y;
    };
    this.host.addEventListener("wheel", this.wheelHandler, { passive: false });

    // When user drags manually, unlock camera follow so they can explore freely
    viewport.on("drag-start", () => {
      if (this.caretaker) {
        this.caretaker.cameraFollow = false;
      }
    });

    this.app.stage.addChild(viewport);

    // 5. Parallax Starfield Backdrop
    this.starfield = new StarfieldBackground(
      this.snapshot.worldWidth,
      this.snapshot.worldHeight,
      this.snapshot.seed,
    );
    viewport.addChild(this.starfield.container);

    // 6. Build Master World Layer Hierarchy
    this.world.addChild(
      this.hullLayer,
      this.sectorMassLayer,
      this.deckIslandLayer,
      this.walkwayLayer,
      this.landmarkAtlasLayer,
      this.networkLayer,
      this.flowLayer,
      this.cellsLayer,
    );

    // Particle System
    this.particles = new ParticleSystem(this.spriteAtlas);
    this.particles.rebuildFromSnapshot(this.snapshot);
    this.world.addChild(this.particles.container);

    // Drones System
    this.drones = new DroneSystem(this.spriteAtlas);
    this.world.addChild(this.drones.container);

    // Playable Caretaker
    this.caretaker = new PlayableCaretaker(this.spriteAtlas, this.layout, (cellId) => {
      this.setSelectedCell(cellId);
      this.onSelectCell(cellId);
    });
    this.world.addChild(this.caretaker.container);

    // Lighting System
    this.lighting = new LightingSystem();
    this.world.addChild(this.lighting.container);

    // Recovery & Effects
    this.world.addChild(this.effectLayer);
    this.recovery = new RecoveryWaveController();
    this.world.addChild(this.recovery.container);

    // Selection Reticle & UI Prompts
    this.world.addChild(this.selectionLayer, this.uiPromptLayer);
    viewport.addChild(this.world);

    // 7. Render Core World Architecture
    this.drawShipHull();
    this.drawSectorMasses();
    this.drawDeckIslands();
    this.drawWalkwaysAndLadders();
    this.drawLandmarkAtlasSprites();
    this.drawNetworkConduits();
    this.buildCellInteractiveTargets();

    // 8. Lens & Initial Framing: Starship dominates 82-88% of viewport width and 65-75% of height
    this.setLens(this.lens);
    this.frameArk();

    // 9. Keyboard Controls for Caretaker
    this.setupKeyboardControls();

    // 10. Ticker Loop (60fps) with crash-proof guard
    this.app.ticker.add((ticker) => {
      this.elapsed += ticker.deltaMS;
      try {
        this.animate(ticker.deltaMS);
      } catch (err) {
        console.error("[GameArkRenderer] Render loop error:", err);
      }
    });

    // 11. Resize Observer
    this.resizeObserver = new ResizeObserver(() => {
      if (!this.viewport) return;
      this.viewport.resize(
        this.host.clientWidth,
        this.host.clientHeight,
        this.snapshot.worldWidth,
        this.snapshot.worldHeight,
      );
    });
    this.resizeObserver.observe(this.host);
  }

  private setupKeyboardControls(): void {
    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "KeyH") {
        this.frameArk();
        return;
      }
      if (e.code === "KeyC") {
        if (this.caretaker && this.viewport) {
          this.caretaker.cameraFollow = !this.caretaker.cameraFollow;
          if (this.caretaker.cameraFollow) {
            this.viewport.animate({
              scale: 1.35,
              position: { x: this.caretaker.x, y: this.caretaker.y - 20 },
              time: 400,
              ease: "easeOutCubic",
            });
          }
        }
        return;
      }
      if (this.caretaker) {
        const handled = this.caretaker.handleKeyDown(e.code);
        if (handled) {
          this.caretaker.cameraFollow = true;
          // If zoomed out in overview, smoothly re-zoom to gameplay view
          if (this.viewport && this.viewport.scale.x < 0.85) {
            this.viewport.animate({
              scale: 1.35,
              position: { x: this.caretaker.x, y: this.caretaker.y - 20 },
              time: 450,
              ease: "easeOutCubic",
            });
          }
          if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
            e.preventDefault();
          }
        }
      }
    };

    this.keyupHandler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (this.caretaker) {
        this.caretaker.handleKeyUp(e.code);
      }
    };

    window.addEventListener("keydown", this.keydownHandler);
    window.addEventListener("keyup", this.keyupHandler);
  }

  private drawShipHull(): void {
    this.hullLayer.removeChildren();
    if (this.roomTileRenderer) {
      this.roomTileRenderer.renderOuterHull(this.hullLayer, this.snapshot.worldWidth, this.snapshot.worldHeight);
    }
  }

  private drawSectorMasses(): void {
    this.sectorMassLayer.removeChildren();
    if (this.roomTileRenderer) {
      this.roomTileRenderer.renderRoomBackgrounds(this.sectorMassLayer);
    }
  }

  private drawDeckIslands(): void {
    this.deckIslandLayer.removeChildren();
    if (this.roomTileRenderer) {
      this.roomTileRenderer.renderFloorsAndCeilings(this.deckIslandLayer);
    }
  }

  private drawWalkwaysAndLadders(): void {
    this.walkwayLayer.removeChildren();
    if (this.roomTileRenderer) {
      this.roomTileRenderer.renderBulkheadsAndShafts(this.walkwayLayer);
    }
  }

  private drawLandmarkAtlasSprites(): void {
    this.landmarkAtlasLayer.removeChildren();
    this.livingLandmarks = [];
    if (this.roomTileRenderer) {
      this.roomTileRenderer.renderRoomFurnishings(this.landmarkAtlasLayer, this.snapshot);
    }
  }

  private drawNetworkConduits(): void {
    this.networkLayer.clear();
    const g = this.networkLayer;

    // In Living mode, draw the real canonical thermal crisis story along true topology
    if (this.lens === "living") {
      const isCritical = this.snapshot.phase !== "stable";
      if (!isCritical) return;

      // 1. Real canonical fractures, rendered by semantic salience. Every
      // fracture remains represented in the metrics; thermal/critical routes
      // stay prominent while background damage is sampled as dim hull noise.
      for (const edge of this.snapshot.edges) {
        if (!edge.fractured) continue;
        const from = this.snapshot.cells[edge.from];
        const to = this.snapshot.cells[edge.to];
        if (!from || !to) continue;

        const isStoryEdge = edge.network === "thermal" || from.critical || to.critical;
        if (!isStoryEdge && edge.id % 5 !== 0) continue;

        const midX = (from.x + to.x) / 2 + Math.sin(edge.id * 17) * 7;
        const midY = (from.y + to.y) / 2 + Math.cos(edge.id * 23) * 7;

        g.moveTo(from.x, from.y)
          .lineTo(midX, midY)
          .lineTo(to.x, to.y)
          .stroke({
            color: PALETTE.alarmRed,
            width: isStoryEdge ? 3.25 : 1.25,
            alpha: isStoryEdge ? 0.92 : 0.24,
          });

        if (isStoryEdge) {
          g.moveTo(from.x, from.y)
            .lineTo(midX, midY)
            .lineTo(to.x, to.y)
            .stroke({ color: PALETTE.whiteHeat, width: 0.8, alpha: 0.78 });
        }
      }

      // 2. Real canonical thermal conduction paths spreading heat toward Cryovault and Sunwell
      for (const edge of this.snapshot.edges) {
        if (edge.network !== "thermal" || edge.fractured) continue;
        const from = this.snapshot.cells[edge.from];
        const to = this.snapshot.cells[edge.to];
        if (!from || !to) continue;

        const maxTemp = Math.max(from.temperature, to.temperature);
        if (maxTemp > 85 || from.critical || to.critical) {
          const pulse = (Math.sin(this.elapsed * 0.005 + edge.id) + 1) * 0.5;
          g.moveTo(from.x, from.y)
            .lineTo(to.x, to.y)
            .stroke({
              color: PALETTE.ember,
              width: 2,
              alpha: 0.35 + pulse * 0.45,
            });
        }
      }
      return;
    }

    // Analytical Lenses (thermal, energy, atmosphere, structure):
    // Render the technical diagnostic network graph overlay.
    for (const edge of this.snapshot.edges) {
      const from = this.snapshot.cells[edge.from];
      const to = this.snapshot.cells[edge.to];
      if (!from || !to) continue;

      const color = LensVisualizer.getEdgeColor(edge, this.lens);
      const isRelevant = this.lens === edge.network;

      if (!isRelevant && edge.id % 9 !== 0) continue;

      if (edge.fractured) {
        g.moveTo(from.x, from.y)
          .lineTo(to.x, to.y)
          .stroke({ color: PALETTE.alarmRed, width: isRelevant ? 3 : 1, alpha: isRelevant ? 0.85 : 0.2 });
      } else {
        g.moveTo(from.x, from.y)
          .lineTo(to.x, to.y)
          .stroke({
            color,
            width: isRelevant ? (edge.network === "thermal" ? 3 : 2) : 1,
            alpha: isRelevant ? (edge.dormant ? 0.24 : 0.65) : 0.08,
          });
      }
    }
  }

  private buildCellInteractiveTargets(): void {
    this.cellsLayer.removeChildren();
    this.cellGraphics.clear();

    for (const cell of this.snapshot.cells) {
      const g = new Graphics();
      g.eventMode = "static";
      g.cursor = "pointer";
      g.on("pointertap", () => {
        this.setSelectedCell(cell.id);
        this.onSelectCell(cell.id);
      });

      this.cellGraphics.set(cell.id, g);
      this.cellsLayer.addChild(g);
      this.redrawCell(cell, g);
    }
  }

  private redrawCell(cell: ArkCell, g: Graphics): void {
    g.clear();
    const isSelected = cell.id === this.selectedId;
    const heat = Math.max(0, Math.min(1, (cell.temperature - OVERHEAT_THRESHOLD) / 55));
    const isOverheated = heat > 0;

    // In Living mode, display subtle indicators only for selected or overheated cells
    if (this.lens === "living") {
      const isLandmark =
        isSelected ||
        (cell.critical && isOverheated) ||
        (cell.kind === "habitat" ? cell.id % 83 === 0 :
          cell.kind === "shell" ? cell.id % 109 === 0 :
            cell.id % 47 === 0);

      g.visible = isLandmark;
      if (!isLandmark) return;

      // 5 Critical-Hot Systems: prominent emergency distress marker
      if (cell.critical && isOverheated) {
        const pulse = (Math.sin(this.elapsed * 0.006 + cell.id) + 1) * 0.5;
        g.rect(cell.x - 12, cell.y - 12, 24, 24).fill({ color: PALETTE.alarmRed, alpha: 0.25 + pulse * 0.2 });
        g.rect(cell.x - 12, cell.y - 12, 24, 24).stroke({ color: PALETTE.alarmRed, width: 2, alpha: 0.85 });
        g.rect(cell.x - 6, cell.y - 6, 12, 12).fill({ color: PALETTE.whiteHeat, alpha: 0.95 });
        g.rect(cell.x - 2, cell.y - 2, 4, 4).fill({ color: PALETTE.ember, alpha: 1.0 });
        return;
      }

      const base = isOverheated ? LensVisualizer.getCellColor(cell, this.lens) : PALETTE.brass;
      const lampSize = isSelected ? 7 : isOverheated ? 6 : 4;

      g.rect(cell.x - 11, cell.y - 11, 22, 22).fill({ color: PALETTE.abyss, alpha: 0.001 });
      if (isOverheated) {
        g.rect(cell.x - 9, cell.y - 9, 18, 18).fill({ color: PALETTE.ember, alpha: 0.1 + heat * 0.2 });
      }

      g.poly([
        cell.x, cell.y - lampSize,
        cell.x + lampSize, cell.y,
        cell.x, cell.y + lampSize,
        cell.x - lampSize, cell.y,
      ])
        .fill({ color: base, alpha: 0.92 })
        .stroke({ color: isSelected ? PALETTE.coolantLight : PALETTE.warmCream, width: isSelected ? 2 : 1, alpha: isSelected ? 0.92 : 0.34 });

      g.rect(cell.x - 1, cell.y - 1, 2, 2).fill({ color: PALETTE.whiteHeat, alpha: 0.76 });
      return;
    }

    // Analytical Lenses: display full diagnostic 766-cell nodes
    g.visible = true;
    const size = cell.kind === "reactor" ? 28 : cell.critical ? 24 : 20;
    const half = size / 2;
    const base = LensVisualizer.getCellColor(cell, this.lens);

    g.rect(cell.x - half, cell.y - half, size, size).fill({ color: base, alpha: 0.88 });
    g.rect(cell.x - half, cell.y - half, size, size).stroke({
      color: isSelected ? PALETTE.coolantLight : cell.critical ? PALETTE.warmCream : PALETTE.hullInk,
      width: isSelected ? 3 : 1,
      alpha: 0.85,
    });

    if (cell.critical) {
      g.rect(cell.x - 3, cell.y - 3, 6, 6).fill({ color: PALETTE.whiteHeat, alpha: 0.95 });
    }
  }

  private animate(deltaMS: number): void {
    this.animationFrame += 1;
    const isCritical = this.snapshot.phase !== "stable";
    const isStable = this.snapshot.phase === "stable";

    // 1. Update Starfield
    this.starfield?.update(this.elapsed, isCritical);

    // 2. Animate Living Sector Landmarks (breathing, expansion)
    for (const item of this.livingLandmarks) {
      const wave = Math.sin(this.elapsed / (item.role === "lungs" ? 1280 : 1760) + item.phase);
      const shimmer = (wave + 1) / 2;
      item.sprite.y = item.baseY + (item.role === "hull" ? 0 : Math.round(wave * 1.4));
      if (item.role === "lungs") {
        item.sprite.scale.set(item.baseScale * (0.985 + shimmer * 0.03), item.baseScale * (0.97 + shimmer * 0.06));
      } else if (item.role === "sunwell") {
        item.sprite.scale.set(item.baseScale * (0.99 + shimmer * 0.02));
      }
      if (item.role === "thermal" && !isStable) {
        item.sprite.alpha = 0.86 + shimmer * 0.14;
      }
    }

    // 2B. Update Dynamic Starship Room Animations (Crew, Radar, Plasma, Bubbles)
    this.roomTileRenderer?.update(deltaMS, isCritical, isStable);

    // 3. Update Playable Caretaker
    if (this.caretaker) {
      this.caretaker.update(deltaMS);
      // Smooth Camera Follow
      if (this.caretaker.cameraFollow && this.viewport) {
        const center = this.viewport.center;
        const targetX = this.caretaker.x;
        const targetY = this.caretaker.y - 24;
        const lerp = 0.08;
        this.viewport.moveCenter(
          center.x + (targetX - center.x) * lerp,
          center.y + (targetY - center.y) * lerp,
        );
      }
    }

    // 4. Update Drones
    this.drones?.update(deltaMS, isCritical);

    // 5. Update Particles (coolant packets, sparks, steam)
    if (this.particles) {
      const fracturedEdges = this.snapshot.edges.filter((e) => e.fractured);
      this.particles.update(deltaMS, fracturedEdges, this.snapshot);
    }

    // 6. Update Lighting
    if (this.lighting && this.caretaker) {
      this.lighting.update(deltaMS, isCritical, isStable, this.caretaker);
    }

    // 7. Update Recovery Wave Controller
    if (this.recovery && this.particles) {
      this.recovery.update(
        deltaMS,
        this.particles,
        (progress, from, to) => {
          for (let i = 0; i < to.cells.length; i += 1) {
            const fCell = from.cells[i];
            const tCell = to.cells[i];
            const g = this.cellGraphics.get(tCell.id);
            if (fCell && g) {
              this.redrawCell(
                {
                  ...tCell,
                  temperature: fCell.temperature + (tCell.temperature - fCell.temperature) * progress,
                  coolant: fCell.coolant + (tCell.coolant - fCell.coolant) * progress,
                  integrity: fCell.integrity + (tCell.integrity - fCell.integrity) * progress,
                },
                g,
              );
            }
          }
          this.drawNetworkConduits();
        },
        (finalSnapshot) => {
          this.snapshot = finalSnapshot;
          this.drawDeckIslands();
          this.drawLandmarkAtlasSprites();
          this.drawNetworkConduits();
          this.particles?.rebuildFromSnapshot(finalSnapshot);
          for (const cell of finalSnapshot.cells) {
            const g = this.cellGraphics.get(cell.id);
            if (g) this.redrawCell(cell, g);
          }
        },
      );
    }

    // 8. Update Selection Reticle
    this.updateSelectionAndPrompts();
  }

  private updateSelectionAndPrompts(): void {
    this.selectionLayer.clear();
    this.uiPromptLayer.clear();

    if (this.selectedId !== null) {
      const cell = this.snapshot.cells[this.selectedId];
      if (cell) {
        const rad = 14;
        const g = this.selectionLayer;
        const pulse = (Math.sin(this.elapsed * 0.006) + 1) * 0.5;

        // Pixel Corner Brackets
        g.rect(cell.x - rad - 2, cell.y - rad - 2, 7, 2).fill({ color: PALETTE.coolantLight });
        g.rect(cell.x - rad - 2, cell.y - rad - 2, 2, 7).fill({ color: PALETTE.coolantLight });

        g.rect(cell.x + rad - 5, cell.y - rad - 2, 7, 2).fill({ color: PALETTE.coolantLight });
        g.rect(cell.x + rad, cell.y - rad - 2, 2, 7).fill({ color: PALETTE.coolantLight });

        g.rect(cell.x - rad - 2, cell.y + rad, 7, 2).fill({ color: PALETTE.coolantLight });
        g.rect(cell.x - rad - 2, cell.y + rad - 5, 2, 7).fill({ color: PALETTE.coolantLight });

        g.rect(cell.x + rad - 5, cell.y + rad, 7, 2).fill({ color: PALETTE.coolantLight });
        g.rect(cell.x + rad, cell.y + rad - 5, 2, 7).fill({ color: PALETTE.coolantLight });

        g.ellipse(cell.x, cell.y, rad + pulse * 4, rad + pulse * 4)
          .stroke({ color: PALETTE.coolantLight, width: 1, alpha: 0.35 + pulse * 0.3 });
      }
    }

    // Caretaker proximity cell target prompt
    if (this.caretaker && this.caretaker.nearestCell) {
      const cell = this.caretaker.nearestCell;
      const g = this.uiPromptLayer;
      g.rect(cell.x - 2, cell.y - 18, 4, 4).fill({ color: PALETTE.sunAmber, alpha: 0.85 });
      g.rect(cell.x - 1, cell.y - 17, 2, 2).fill({ color: PALETTE.whiteHeat, alpha: 0.95 });
    }
  }

  // --- ArkRendererContract Methods ---

  public transitionToSnapshot(next: ArkSnapshot): void {
    if (next.revision === this.snapshot.revision && next.tick === this.snapshot.tick) return;
    if (this.recovery) {
      this.recovery.startTransition(this.snapshot, next);
    } else {
      this.snapshot = next;
      this.drawDeckIslands();
      this.drawLandmarkAtlasSprites();
      this.drawNetworkConduits();
    }
  }

  public setLens(lens: SystemLens): void {
    this.lens = lens;
    this.deckIslandLayer.alpha = lens === "living" ? 1.0 : 0.18;
    this.landmarkAtlasLayer.alpha = lens === "living" ? 1.0 : 0.12;
    this.sectorMassLayer.alpha = lens === "living" ? 0.16 : 0.35;
    this.walkwayLayer.alpha = lens === "living" ? 1.0 : 0.25;

    this.drawNetworkConduits();
    for (const cell of this.snapshot.cells) {
      const g = this.cellGraphics.get(cell.id);
      if (g) this.redrawCell(cell, g);
    }
  }

  public setSelectedCell(cellId: number | null): void {
    const previous = this.selectedId;
    this.selectedId = cellId;
    if (previous !== null) {
      const prevCell = this.snapshot.cells[previous];
      const g = this.cellGraphics.get(previous);
      if (prevCell && g) this.redrawCell(prevCell, g);
    }
    if (cellId !== null) {
      const cell = this.snapshot.cells[cellId];
      const g = this.cellGraphics.get(cellId);
      if (cell && g) this.redrawCell(cell, g);
    }
  }

  public frameCell(cellId: number): void {
    const cell = this.snapshot.cells[cellId];
    if (!cell || !this.viewport) return;
    if (this.caretaker) {
      this.caretaker.cameraFollow = false;
    }
    this.viewport.animate({
      position: { x: cell.x, y: cell.y },
      scale: 1.6,
      time: 700,
      ease: "easeInOutSine",
    });
  }

  public frameArk(): void {
    if (!this.viewport) return;
    if (this.caretaker) {
      this.caretaker.cameraFollow = false;
    }
    const fitScaleX = (this.host.clientWidth * 0.86) / 1400;
    const fitScaleY = (this.host.clientHeight * 0.72) / 580;
    const targetScale = Math.max(0.68, Math.min(1.15, Math.min(fitScaleX, fitScaleY)));

    this.viewport.animate({
      position: {
        x: this.snapshot.worldWidth / 2,
        y: this.snapshot.worldHeight / 2 - 12,
      },
      scale: targetScale,
      time: 650,
      ease: "easeInOutSine",
    });
  }

  public panBy(dx: number, dy: number): void {
    if (this.caretaker) {
      this.caretaker.handlePanBy(dx, dy);
    }
    if (!this.caretaker?.cameraFollow && this.viewport) {
      const center = this.viewport.center;
      this.viewport.moveCenter(
        center.x + dx / this.viewport.scale.x,
        center.y + dy / this.viewport.scale.y,
      );
    }
  }

  public destroy(): void {
    if (this.keydownHandler) window.removeEventListener("keydown", this.keydownHandler);
    if (this.keyupHandler) window.removeEventListener("keyup", this.keyupHandler);
    if (this.wheelHandler) this.host.removeEventListener("wheel", this.wheelHandler);
    this.resizeObserver?.disconnect();
    this.app.destroy(true, { children: true, texture: true });
  }
}
