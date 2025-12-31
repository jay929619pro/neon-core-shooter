
import { EnemyType, WeaponMode } from './types';
import { COLORS } from './constants';

export class BalanceController {
  static getXPRequired(level: number): number {
    // Formula: InitialXP * (1.15)^(Level-1)
    return Math.floor(100 * Math.pow(1.15, level - 1));
  }

  static getEnemyHP(type: EnemyType, level: number): number {
    const arch = ENEMY_ARCHETYPES[type];
    const baseHP = arch.hpMultiplier * 5; // Base normalization
    // Formula: BaseHP * (1.25)^(Level-1)
    const scaledHP = baseHP * Math.pow(1.25, level - 1);
    
    // Boss HP jump at level 5/10/15...
    if (type === EnemyType.BOSS) {
      return Math.floor(scaledHP * 2.5);
    }
    return Math.floor(scaledHP);
  }

  static formatValue(num: number): string {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'G';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return Math.ceil(num).toString();
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
    pullRadius: 180,
    pullStrength: 3.5
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
  }
};

export const ENVIRONMENT_CONFIG = {
  gravityField: {
    radius: 110,
    strength: 2.5,
    color: 'rgba(138, 43, 226, 0.4)'
  },
  obstacle: {
    hp: 25,
    width: 90,
    height: 45
  }
};
