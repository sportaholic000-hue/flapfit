export type LevelConfig = {
  id: number;
  name: string;
  speed: number;
  gapFrac: number;
  spawnMs: number;
  movingPipes: boolean;
  moveAmp: number;
  targetScore: number;
  maxScore: number; // 0 = unlimited. Non-final levels are capped at 60 pipes max.
  sky1: string;
  sky2: string;
  pipe: string;
};

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: 'First Flight',
    speed: 130,
    gapFrac: 0.36,
    spawnMs: 2600,
    movingPipes: false,
    moveAmp: 0,
    targetScore: 5,
    maxScore: 60,
    sky1: '#4EC0EA',
    sky2: '#A8E6FF',
    pipe: '#43A047',
  },
  {
    id: 2,
    name: 'Warm Up',
    speed: 145,
    gapFrac: 0.34,
    spawnMs: 2450,
    movingPipes: false,
    moveAmp: 0,
    targetScore: 6,
    maxScore: 60,
    sky1: '#4EC0EA',
    sky2: '#A8E6FF',
    pipe: '#43A047',
  },
  {
    id: 3,
    name: 'Steady Wings',
    speed: 160,
    gapFrac: 0.32,
    spawnMs: 2300,
    movingPipes: false,
    moveAmp: 0,
    targetScore: 7,
    maxScore: 60,
    sky1: '#41B3E0',
    sky2: '#9BDCF5',
    pipe: '#2E7D32',
  },
  {
    id: 4,
    name: 'Rising Heat',
    speed: 175,
    gapFrac: 0.31,
    spawnMs: 2200,
    movingPipes: false,
    moveAmp: 0,
    targetScore: 8,
    maxScore: 60,
    sky1: '#FFB74D',
    sky2: '#FFE0B2',
    pipe: '#6D4C41',
  },
  {
    id: 5,
    name: 'Wind Tunnel',
    speed: 190,
    gapFrac: 0.3,
    spawnMs: 2100,
    movingPipes: false,
    moveAmp: 0,
    targetScore: 10,
    maxScore: 60,
    sky1: '#41B3E0',
    sky2: '#C5ECFA',
    pipe: '#2E7D32',
  },
  {
    id: 6,
    name: 'Pipe Dream',
    speed: 205,
    gapFrac: 0.29,
    spawnMs: 2000,
    movingPipes: false,
    moveAmp: 0,
    targetScore: 10,
    maxScore: 60,
    sky1: '#26A69A',
    sky2: '#B2DFDB',
    pipe: '#00695C',
  },
  {
    id: 7,
    name: 'Full Send',
    speed: 220,
    gapFrac: 0.28,
    spawnMs: 1950,
    movingPipes: false,
    moveAmp: 0,
    targetScore: 12,
    maxScore: 60,
    sky1: '#FF8A65',
    sky2: '#FFD0B0',
    pipe: '#5D4037',
  },
  {
    id: 8,
    name: 'Shifting Gates',
    speed: 230,
    gapFrac: 0.27,
    spawnMs: 1900,
    movingPipes: true,
    moveAmp: 30,
    targetScore: 12,
    maxScore: 60,
    sky1: '#7E57C2',
    sky2: '#D1C4E9',
    pipe: '#4527A0',
  },
  {
    id: 9,
    name: 'Turbulence',
    speed: 245,
    gapFrac: 0.26,
    spawnMs: 1850,
    movingPipes: true,
    moveAmp: 40,
    targetScore: 14,
    maxScore: 60,
    sky1: '#5C6BC0',
    sky2: '#C5CAE9',
    pipe: '#283593',
  },
  {
    id: 10,
    name: 'Storm Front',
    speed: 260,
    gapFrac: 0.25,
    spawnMs: 1800,
    movingPipes: true,
    moveAmp: 50,
    targetScore: 15,
    maxScore: 60,
    sky1: '#546E7A',
    sky2: '#B0BEC5',
    pipe: '#263238',
  },
  {
    id: 11,
    name: 'Night Flight',
    speed: 275,
    gapFrac: 0.245,
    spawnMs: 1750,
    movingPipes: true,
    moveAmp: 55,
    targetScore: 16,
    maxScore: 60,
    sky1: '#1A237E',
    sky2: '#3949AB',
    pipe: '#00E676',
  },
  {
    id: 12,
    name: 'Iron Wings',
    speed: 290,
    gapFrac: 0.24,
    spawnMs: 1700,
    movingPipes: true,
    moveAmp: 60,
    targetScore: 18,
    maxScore: 60,
    sky1: '#263238',
    sky2: '#546E7A',
    pipe: '#FF7043',
  },
  {
    id: 13,
    name: 'Gauntlet',
    speed: 305,
    gapFrac: 0.23,
    spawnMs: 1650,
    movingPipes: true,
    moveAmp: 70,
    targetScore: 20,
    maxScore: 60,
    sky1: '#311B92',
    sky2: '#6A1B9A',
    pipe: '#FFD600',
  },
  {
    id: 14,
    name: 'Maximum Burn',
    speed: 320,
    gapFrac: 0.22,
    spawnMs: 1600,
    movingPipes: true,
    moveAmp: 80,
    targetScore: 22,
    maxScore: 60,
    sky1: '#B71C1C',
    sky2: '#FF7043',
    pipe: '#212121',
  },
  {
    id: 15,
    name: 'Final Ascent',
    speed: 340,
    gapFrac: 0.21,
    spawnMs: 1550,
    movingPipes: true,
    moveAmp: 90,
    targetScore: 25,
    maxScore: 0,
    sky1: '#0D1B2A',
    sky2: '#415A77',
    pipe: '#FFC93C',
  },
];

export const ENDLESS_BASE: LevelConfig = {
  id: 0,
  name: 'Endless',
  speed: 150,
  gapFrac: 0.32,
  spawnMs: 2300,
  movingPipes: false,
  moveAmp: 0,
  targetScore: 0,
  maxScore: 0,
  sky1: '#4EC0EA',
  sky2: '#A8E6FF',
  pipe: '#43A047',
};

// Endless mode unlocks after clearing this level
export const ENDLESS_UNLOCK_LEVEL = 5;

export function getLevel(id: number): LevelConfig {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}

// Deterministic daily challenge derived from the date
export function getDailyChallenge(unlockedLevel: number, day: string) {
  let seed = 0;
  for (let i = 0; i < day.length; i++) {
    seed = (seed * 31 + day.charCodeAt(i)) % 100000;
  }
  const maxLevel = Math.max(1, Math.min(unlockedLevel, LEVELS.length));
  const levelId = 1 + (seed % Math.min(maxLevel, 5));
  const target = 5 + (seed % 8);
  return { levelId, target };
}
