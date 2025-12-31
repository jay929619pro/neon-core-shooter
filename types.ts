export enum GameState {
  START = "START",
  PLAYING = "PLAYING",
  UPGRADING = "UPGRADING",
  GAME_OVER = "GAME_OVER"
}

export enum UpgradeTag {
  KINETIC = "实弹",
  ENERGY = "能量",
  BLAST = "爆炸",
  VITALITY = "生命"
}

export enum UpgradeType {
  FIRE_RATE = "FIRE_RATE",
  SIDE_GUNS = "SIDE_GUNS",
  BIG_BULLET = "BIG_BULLET",
  CANNON = "CANNON",
  RANGE_BOOST = "RANGE_BOOST",
  VOLT_SHOT = "VOLT_SHOT",
  HEALTH_UP = "HEALTH_UP"
}

export enum WeaponMode {
  STANDARD = "STANDARD",
  BLACK_HOLE = "BLACK_HOLE"
}

export enum EnemyType {
  BASIC = "BASIC",
  CHARGER = "CHARGER",
  SPLITTER = "SPLITTER",
  SHOOTER = "SHOOTER",
  BOSS = "BOSS",
  HEALER = "HEALER",
  SHIELDER = "SHIELDER",
  KAMIKAZE = "KAMIKAZE",
  SNIPER = "SNIPER",
  SUMMONER = "SUMMONER"
}

export interface UpgradeOption {
  id: UpgradeType;
  type: UpgradeType;
  title: string;
  description: string;
  icon: string;
  tag: UpgradeTag;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  glow?: boolean;
}

export interface DamageNumber {
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  isCrit: boolean;
}

export interface Bullet {
  x: number;
  y: number;
  damage: number;
  radius: number;
  vx: number;
  vy: number;
  trail: { x: number; y: number }[];
  isBlackHole?: boolean;
  life?: number; // [NEW] For Black Hole decay
}

export interface EnemyBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
}

export interface Enemy {
  type: EnemyType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  size: number;
  color: string;
  shakeX: number;
  shakeY: number;
  hitFlash: number;
  speed: number;
  cooldown?: number;
  bossVariant?: "core" | "sentinel" | "hive"; // [NEW] Boss Variant
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
}

export interface GravityField {
  x: number;
  y: number;
  radius: number;
  strength: number;
}

export interface ExpGem {
  x: number;
  y: number;
  value: number;
  size: number;
}

export interface HeartItem {
  x: number;
  y: number;
  size: number;
  pulse: number;
}
