import { Container, Sprite } from "pixi.js";
import type { ArkCell, ArkEdge, ArkSnapshot } from "../../engine/types";
import { OVERHEAT_THRESHOLD } from "../../engine/metrics";
import type { SpriteSheetAtlas } from "./pixelAtlas";

type CoolantPacket = {
  edgeId: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  speed: number;
  sprite: Sprite;
};

type SparkParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  sprite: Sprite;
  active: boolean;
};

type HeatMote = {
  cellId: number;
  baseX: number;
  baseY: number;
  offsetY: number;
  wobblePhase: number;
  speed: number;
  sprite: Sprite;
};

type NaniteParticle = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  sprite: Sprite;
  active: boolean;
};

export class ParticleSystem {
  public readonly container = new Container();
  private atlas: SpriteSheetAtlas;
  private coolantPackets: CoolantPacket[] = [];
  private sparks: SparkParticle[] = [];
  private heatMotes: HeatMote[] = [];
  private nanites: NaniteParticle[] = [];
  private activeSparks = 0;
  private sparkSpawnTimer = 0;

  constructor(atlas: SpriteSheetAtlas) {
    this.atlas = atlas;
    this.container.eventMode = "none";
    this.initializeSparkPool(45);
    this.initializeNanitePool(60);
  }

  private initializeSparkPool(count: number): void {
    for (let i = 0; i < count; i += 1) {
      const sprite = new Sprite(this.atlas.getTexture("fx_spark"));
      sprite.anchor.set(0.5);
      sprite.visible = false;
      this.container.addChild(sprite);
      this.sparks.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        sprite,
        active: false,
      });
    }
  }

  private initializeNanitePool(count: number): void {
    for (let i = 0; i < count; i += 1) {
      const sprite = new Sprite(this.atlas.getTexture("fx_nanite"));
      sprite.anchor.set(0.5);
      sprite.visible = false;
      this.container.addChild(sprite);
      this.nanites.push({
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        progress: 0,
        speed: 1,
        sprite,
        active: false,
      });
    }
  }

  public rebuildFromSnapshot(snapshot: ArkSnapshot): void {
    // 1. Setup Coolant Packets for active thermal edges
    for (const p of this.coolantPackets) {
      this.container.removeChild(p.sprite);
      p.sprite.destroy();
    }
    this.coolantPackets = [];

    const thermalEdges = snapshot.edges.filter(
      (e) => e.network === "thermal" && e.active && !e.fractured && !e.dormant,
    );

    // Limit packet density to maintain 60fps
    const step = Math.max(1, Math.ceil(thermalEdges.length / 85));
    for (let i = 0; i < thermalEdges.length; i += step) {
      const edge = thermalEdges[i];
      const from = snapshot.cells[edge.from];
      const to = snapshot.cells[edge.to];
      if (!from || !to) continue;

      const sprite = new Sprite(this.atlas.getTexture("fx_coolant"));
      sprite.anchor.set(0.5);
      this.container.addChild(sprite);

      this.coolantPackets.push({
        edgeId: edge.id,
        fromX: from.x,
        fromY: from.y,
        toX: to.x,
        toY: to.y,
        progress: ((edge.id * 0.173) % 1),
        speed: 0.4 + (edge.flow / 20) * 0.5,
        sprite,
      });
    }

    // 2. Setup Heat Motes for overheated cells (>85°C)
    for (const m of this.heatMotes) {
      this.container.removeChild(m.sprite);
      m.sprite.destroy();
    }
    this.heatMotes = [];

    const hotCells = snapshot.cells.filter((c) => c.temperature >= OVERHEAT_THRESHOLD);
    for (const cell of hotCells) {
      const sprite = new Sprite(this.atlas.getTexture("fx_steam"));
      sprite.anchor.set(0.5);
      this.container.addChild(sprite);

      this.heatMotes.push({
        cellId: cell.id,
        baseX: cell.x,
        baseY: cell.y,
        offsetY: 0,
        wobblePhase: cell.id * 0.43,
        speed: 16 + (cell.temperature - 85) * 0.4,
        sprite,
      });
    }
  }

  public spawnSpark(x: number, y: number, burstCount = 3): void {
    let spawned = 0;
    for (const spark of this.sparks) {
      if (!spark.active) {
        spark.active = true;
        spark.x = x;
        spark.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 80;
        spark.vx = Math.cos(angle) * speed;
        spark.vy = Math.sin(angle) * speed - 15; // upward drift
        spark.life = 0;
        spark.maxLife = 0.25 + Math.random() * 0.4;
        spark.sprite.visible = true;
        spark.sprite.position.set(x, y);
        spark.sprite.alpha = 1;
        spawned += 1;
        if (spawned >= burstCount) break;
      }
    }
  }

  public spawnNaniteStream(fromX: number, fromY: number, toX: number, toY: number): void {
    for (const nanite of this.nanites) {
      if (!nanite.active) {
        nanite.active = true;
        nanite.x = fromX;
        nanite.y = fromY;
        nanite.targetX = toX;
        nanite.targetY = toY;
        nanite.progress = 0;
        nanite.speed = 0.8 + Math.random() * 0.6;
        nanite.sprite.visible = true;
        nanite.sprite.position.set(fromX, fromY);
        nanite.sprite.alpha = 1;
        break;
      }
    }
  }

  public update(deltaMS: number, fracturedEdges: ArkEdge[], snapshot: ArkSnapshot): void {
    const dt = Math.min(deltaMS, 64) * 0.001;

    // 1. Update Coolant Packets
    for (const p of this.coolantPackets) {
      p.progress = (p.progress + p.speed * dt) % 1;
      const x = p.fromX + (p.toX - p.fromX) * p.progress;
      const y = p.fromY + (p.toY - p.fromY) * p.progress;
      p.sprite.position.set(Math.round(x), Math.round(y));
    }

    // 2. Update Heat Motes
    for (const m of this.heatMotes) {
      m.offsetY = (m.offsetY + m.speed * dt) % 36;
      m.wobblePhase += dt * 3;
      const x = m.baseX + Math.sin(m.wobblePhase) * 6;
      const y = m.baseY - m.offsetY;
      const alpha = Math.max(0, 1 - m.offsetY / 36);
      m.sprite.position.set(Math.round(x), Math.round(y));
      m.sprite.alpha = alpha * 0.65;
    }

    // 3. Update Sparks
    for (const s of this.sparks) {
      if (s.active) {
        s.life += dt;
        if (s.life >= s.maxLife) {
          s.active = false;
          s.sprite.visible = false;
        } else {
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.vy += 80 * dt; // gravity
          s.sprite.position.set(Math.round(s.x), Math.round(s.y));
          s.sprite.alpha = 1 - s.life / s.maxLife;
        }
      }
    }

    // Periodic sparks at fractured edges during crisis
    if (fracturedEdges.length > 0) {
      this.sparkSpawnTimer += deltaMS;
      if (this.sparkSpawnTimer > 180) {
        this.sparkSpawnTimer = 0;
        const randomEdge = fracturedEdges[Math.floor(Math.random() * fracturedEdges.length)];
        const from = snapshot.cells[randomEdge.from];
        const to = snapshot.cells[randomEdge.to];
        if (from && to) {
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          this.spawnSpark(midX, midY, 2);
        }
      }
    }

    // 4. Update Nanites
    for (const n of this.nanites) {
      if (n.active) {
        n.progress += n.speed * dt;
        if (n.progress >= 1) {
          n.active = false;
          n.sprite.visible = false;
        } else {
          const curX = n.x + (n.targetX - n.x) * n.progress;
          const curY = n.y + (n.targetY - n.y) * n.progress + Math.sin(n.progress * Math.PI * 4) * 8;
          n.sprite.position.set(Math.round(curX), Math.round(curY));
          n.sprite.alpha = Math.sin(n.progress * Math.PI);
        }
      }
    }
  }
}
