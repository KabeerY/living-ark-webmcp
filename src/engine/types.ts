export const SECTOR_NAMES = [
  "Hull Skin",
  "Navigation Crown",
  "Verdant Ring",
  "Sunwell",
  "Thermal Choir",
  "Cryovault",
  "Atmosphere Lungs",
  "Fabrication Reef",
  "Memory Reef",
  "Reservoirs",
] as const;

export type SectorName = (typeof SECTOR_NAMES)[number];
export type SystemLens = "living" | "thermal" | "energy" | "atmosphere" | "structure";
export type ArkPhase = "critical" | "recovering" | "stable" | "lost";

export type ArkCell = {
  id: number;
  gx: number;
  gy: number;
  x: number;
  y: number;
  sector: SectorName;
  kind: "shell" | "habitat" | "garden" | "reactor" | "reservoir" | "cryo" | "fabricator" | "memory";
  critical: boolean;
  temperature: number;
  coolant: number;
  energy: number;
  atmosphere: number;
  matter: number;
  integrity: number;
};

export type ArkEdge = {
  id: number;
  from: number;
  to: number;
  network: "thermal" | "energy" | "atmosphere" | "structural";
  active: boolean;
  fractured: boolean;
  dormant: boolean;
  capacity: number;
  flow: number;
  integrity: number;
};

export type ArkEvent = {
  sequence: number;
  tick: number;
  type:
    | "ION_STORM"
    | "EDGE_FRACTURED"
    | "HEAT_CASCADE_STARTED"
    | "EMERGENCY_STASIS"
    | "CANDIDATE_AUTHORED"
    | "CANDIDATE_FALSIFIED"
    | "CAPABILITY_CERTIFIED"
    | "CAPABILITY_BORN"
    | "FIBER_REGROWN"
    | "ARK_STABILIZED";
  message: string;
  cellIds?: number[];
  edgeIds?: number[];
};

export type ArkSnapshot = {
  seed: number;
  tick: number;
  revision: number;
  phase: ArkPhase;
  worldWidth: number;
  worldHeight: number;
  cells: ArkCell[];
  edges: ArkEdge[];
  events: ArkEvent[];
};

export type ArkMetrics = {
  phase: ArkPhase;
  cellCount: number;
  criticalCells: number;
  overheatedCells: number;
  overheatedCriticalCells: number;
  fracturedEdges: number;
  peakTemperature: number;
  peakCriticalTemperature: number;
  averageIntegrity: number;
  totalCoolant: number;
  stability: number;
};
