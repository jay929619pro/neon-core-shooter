import { EnemyType, WeaponMode } from "./types";
import { COLORS } from "./constants";

export class BalanceController {
  static getXPRequired(level: number): number {
    // Formula: InitialXP * (1.15)^(Level-1)
    return Math.floor(100 * Math.pow(1.15, level - 1));
  }

  static getEnemyHP(type: EnemyType, level: number): number {
    const arch = ENEMY_ARCHETYPES[type];
    const baseHP = arch.hpMultiplier * 3; // [NERF] 5 -> 3
    // Formula: BaseHP * (1 + (Level-1) * 0.5 + (Level-1)^1.4 * 0.1)
    // This is smoother than previous 1.2^L
    const scaledHP = baseHP * (1 + (level - 1) * 0.5 + Math.pow(level - 1, 1.4) * 0.1);

    // Boss HP jump at level 5/10/15...
    if (type === EnemyType.BOSS) {
      return Math.floor(scaledHP * 2.5);
    }
    return Math.floor(scaledHP);
  }

  static formatValue(num: number): string {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + "G";
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return Math.ceil(num).toString();
  }

  static getAvailableEnemies(level: number): EnemyType[] {
    const types = [EnemyType.BASIC];
    if (level >= 2) types.push(EnemyType.CHARGER);
    if (level >= 4) types.push(EnemyType.SHOOTER);
    if (level >= 6) types.push(EnemyType.SPLITTER);
    if (level >= 8) types.push(EnemyType.HEALER);
    if (level >= 10) types.push(EnemyType.KAMIKAZE);
    if (level >= 12) types.push(EnemyType.SHIELDER);
    if (level >= 15) types.push(EnemyType.SNIPER);
    if (level >= 18) types.push(EnemyType.SUMMONER);
    return types;
  }

  static getSpawnInterval(level: number): number {
    // Start at 45 frames (0.75s)
    // Cap at 15 frames (0.25s) approx level 20
    return Math.max(15, 45 - Math.floor(level * 1.5));
  }
}

export const WEAPON_CONFIG = {
  [WeaponMode.STANDARD]: {
    baseDamage: 2.0,
    bulletSpeed: -20,
    bulletRadius: 5,
    trailLength: 6
  },
  [WeaponMode.BLACK_HOLE]: {
    baseDamage: 4.5,
    bulletSpeed: -4,
    bulletRadius: 32,
    trailLength: 10,
    pullRadius: 120,
    pullStrength: 3.5,
    maxLife: 90 // [NEW] Frames to live
  }
};

export interface EnemyArchetype {
  hpMultiplier: number;
  speedBase: number;
  size: number;
  color: string;
  sides: number;
  chargeSpeedMult?: number;
  shootInterval?: number;
}

export const ENEMY_ARCHETYPES: Record<EnemyType, EnemyArchetype> = {
  [EnemyType.BASIC]: {
    hpMultiplier: 4,
    speedBase: 2.5,
    size: 35,
    color: COLORS.ENEMIES.BASIC,
    sides: 6
  },
  [EnemyType.CHARGER]: {
    hpMultiplier: 3.5,
    speedBase: 2.5,
    chargeSpeedMult: 3,
    size: 35,
    color: COLORS.ENEMIES.CHARGER,
    sides: 3
  },
  [EnemyType.SPLITTER]: {
    hpMultiplier: 6,
    speedBase: 2.0,
    size: 40,
    color: COLORS.ENEMIES.SPLITTER,
    sides: 6
  },
  [EnemyType.SHOOTER]: {
    hpMultiplier: 5,
    speedBase: 1.5,
    size: 40,
    color: COLORS.ENEMIES.SHOOTER,
    sides: 4,
    shootInterval: 90
  },
  [EnemyType.BOSS]: {
    hpMultiplier: 120,
    speedBase: 1.5,
    size: 85,
    color: COLORS.ENEMIES.BOSS,
    sides: 8,
    shootInterval: 110
  },
  [EnemyType.HEALER]: {
    hpMultiplier: 6,
    speedBase: 2.0,
    size: 30,
    color: "#00ffaa", // Green-ish
    sides: 4 // Cross shape visually? Or just square
  },
  [EnemyType.SHIELDER]: {
    hpMultiplier: 12,
    speedBase: 1.0,
    size: 45,
    color: "#0088ff", // Blue
    sides: 5
  },
  [EnemyType.KAMIKAZE]: {
    hpMultiplier: 2,
    speedBase: 5.0,
    size: 20,
    color: "#ff4400", // Red-Orange
    sides: 3
  },
  [EnemyType.SNIPER]: {
    hpMultiplier: 4,
    speedBase: 1.5,
    size: 30,
    color: "#aa00ff", // Purple
    sides: 3
  },
  [EnemyType.SUMMONER]: {
    hpMultiplier: 8,
    speedBase: 1.2,
    size: 40,
    color: "#ff00ff", // Magenta
    sides: 7,
    shootInterval: 300 // Summon cooldown
  }
};

export const ENVIRONMENT_CONFIG = {
  gravityField: {
    radius: 110,
    strength: 2.5,
    color: "rgba(138, 43, 226, 0.4)"
  },
  obstacle: {
    hp: 25,
    width: 90,
    height: 45
  }
};
