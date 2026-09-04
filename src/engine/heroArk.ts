import { createPrng, randomBetween } from "./prng";
import type { ArkCell, ArkEdge, ArkSnapshot, SectorName } from "./types";

const WORLD_WIDTH = 1_536;
const WORLD_HEIGHT = 864;
const GRID_COLUMNS = 46;
const GRID_ROWS = 25;
const CELL_SPACING = 29;
const ORIGIN_X = 104;
const ORIGIN_Y = 83;

function insideArk(nx: number, ny: number): boolean {
  const asymmetry = 1 - Math.max(0, nx) * 0.16;
  const body = Math.pow(Math.abs(nx + 0.04), 1.72) + Math.pow(Math.abs(ny) / asymmetry, 2.12);
  const dorsalWing = nx > -0.2 && nx < 0.78 && ny < -0.35 && ny > -0.77 + nx * 0.18;
  const ventralWing = nx > -0.05 && nx < 0.84 && ny > 0.35 && ny < 0.8 - nx * 0.2;
  const prow = nx < -0.84 && Math.abs(ny) < 0.2 + (nx + 1) * 1.9;
  return body < 0.92 || dorsalWing || ventralWing || prow;
}

function sectorFor(nx: number, ny: number): SectorName {
  const radius = Math.hypot(nx, ny);
  if (radius > 0.82) return "Hull Skin";
  if (nx < -0.66) return "Navigation Crown";
  if (Math.hypot(nx + 0.05, ny) < 0.18) return "Sunwell";
  if (nx > 0.52 && ny < -0.08) return "Cryovault";
  if (nx > 0.43 && ny >= -0.08) return "Thermal Choir";
  if (nx < -0.18 && ny < -0.2) return "Verdant Ring";
  if (nx < -0.2 && ny > 0.25) return "Atmosphere Lungs";
  if (nx > 0.13 && ny > 0.24) return "Fabrication Reef";
  if (nx > 0.12 && ny < -0.2) return "Memory Reef";
  return "Reservoirs";
}

function kindFor(sector: SectorName, random: () => number): ArkCell["kind"] {
  if (sector === "Sunwell") return "reactor";
  if (sector === "Cryovault") return "cryo";
  if (sector === "Verdant Ring") return "garden";
  if (sector === "Fabrication Reef") return "fabricator";
  if (sector === "Memory Reef") return "memory";
  if (sector === "Reservoirs" && random() > 0.62) return "reservoir";
  if (sector === "Thermal Choir" && random() > 0.76) return "reservoir";
  if (sector === "Hull Skin") return "shell";
  return "habitat";
}

function key(gx: number, gy: number): string {
  return `${gx}:${gy}`;
}

export function createHeroArk(seed = 0xa7c0ffee): ArkSnapshot {
  const random = createPrng(seed);
  const cells: ArkCell[] = [];
  const byGrid = new Map<string, number>();

  for (let gy = 0; gy < GRID_ROWS; gy += 1) {
    for (let gx = 0; gx < GRID_COLUMNS; gx += 1) {
      const nx = (gx / (GRID_COLUMNS - 1)) * 2 - 1;
      const ny = (gy / (GRID_ROWS - 1)) * 2 - 1;
      const organicJitter = Math.sin(gx * 1.71 + gy * 0.83) * 0.025;
      if (!insideArk(nx, ny + organicJitter)) continue;

      const sector = sectorFor(nx, ny);
      const kind = kindFor(sector, random);
      const crisisStrength = Math.max(0, (nx - 0.18) / 0.82) * (0.72 + 0.28 * Math.cos(ny * 4.2));
      const critical = kind === "reactor" || kind === "cryo";
      const id = cells.length;

      cells.push({
        id,
        gx,
        gy,
        x: ORIGIN_X + gx * CELL_SPACING + (gy % 2) * (CELL_SPACING / 2) + randomBetween(random, -2.4, 2.4),
        y: ORIGIN_Y + gy * CELL_SPACING + randomBetween(random, -2.4, 2.4),
        sector,
        kind,
        critical,
        temperature: 31 + randomBetween(random, -3, 4) + crisisStrength * randomBetween(random, 65, 112),
        coolant: kind === "reservoir" ? randomBetween(random, 72, 118) : randomBetween(random, 4, 22),
        energy: randomBetween(random, 54, 98) - crisisStrength * randomBetween(random, 12, 32),
        atmosphere: randomBetween(random, 89, 100),
        matter: kind === "fabricator" ? randomBetween(random, 40, 78) : randomBetween(random, 1, 12),
        integrity: Math.max(0.18, randomBetween(random, 0.86, 1) - crisisStrength * randomBetween(random, 0.18, 0.68)),
      });
      byGrid.set(key(gx, gy), id);
    }
  }

  const edges: ArkEdge[] = [];
  const offsets = [
    [1, 0],
    [0, 1],
  ] as const;

  for (const cell of cells) {
    for (const [dx, dy] of offsets) {
      const neighborId = byGrid.get(key(cell.gx + dx, cell.gy + dy));
      if (neighborId === undefined) continue;
      const neighbor = cells[neighborId];
      const middleX = (cell.x + neighbor.x) / 2;
      const fractureBand = middleX > WORLD_WIDTH * 0.61 && middleX < WORLD_WIDTH * 0.73;
      const fractureChance = fractureBand ? 0.43 : 0.025;
      const fractured = random() < fractureChance;
      const networkRoll = random();
      const network: ArkEdge["network"] =
        networkRoll < 0.45
          ? "thermal"
          : networkRoll < 0.69
            ? "energy"
            : networkRoll < 0.84
              ? "atmosphere"
              : "structural";

      edges.push({
        id: edges.length,
        from: cell.id,
        to: neighborId,
        network,
        active: !fractured,
        fractured,
        dormant: !fractured && network === "thermal" && random() < 0.12,
        capacity: randomBetween(random, 18, 54),
        flow: fractured ? 0 : randomBetween(random, 2, 18),
        integrity: fractured ? 0 : randomBetween(random, 0.74, 1),
      });
    }
  }

  const fracturedIds = edges.filter((edge) => edge.fractured).map((edge) => edge.id);
  const hotIds = cells.filter((cell) => cell.temperature >= 85).map((cell) => cell.id);

  return {
    seed,
    tick: 184,
    revision: 1,
    phase: "critical",
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    cells,
    edges,
    events: [
      {
        sequence: 1,
        tick: 163,
        type: "ION_STORM",
        message: "Ion front struck the starboard Hull Skin.",
      },
      {
        sequence: 2,
        tick: 171,
        type: "EDGE_FRACTURED",
        message: `${fracturedIds.length} network fibers fractured across the Thermal Choir.`,
        edgeIds: fracturedIds,
      },
      {
        sequence: 3,
        tick: 179,
        type: "HEAT_CASCADE_STARTED",
        message: "A thermal cascade is moving toward the Cryovault and Sunwell.",
        cellIds: hotIds,
      },
      {
        sequence: 4,
        tick: 184,
        type: "EMERGENCY_STASIS",
        message: "Emergency stasis is holding the Ark at a critical but recoverable boundary.",
      },
    ],
  };
}
