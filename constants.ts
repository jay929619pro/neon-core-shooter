
import { UpgradeType, UpgradeOption, UpgradeTag } from './types';

export const CANVAS_WIDTH = 450;
export const CANVAS_HEIGHT = 800;
export const INITIAL_FIRE_RATE = 200; 
export const INITIAL_DAMAGE = 2.0;
export const INITIAL_BULLET_SIZE = 5;
export const INVINCIBLE_TIME = 1500;

export const UPGRADE_POOL: UpgradeOption[] = [
  {
    id: UpgradeType.FIRE_RATE,
    type: UpgradeType.FIRE_RATE,
    title: '核心超频',
    description: '显著提升射击频率',
    icon: '⚡',
    tag: UpgradeTag.KINETIC
  },
  {
    id: UpgradeType.SIDE_GUNS,
    type: UpgradeType.SIDE_GUNS,
    title: '侧舷挂架',
    description: '增加两侧武器发射位',
    icon: '⚔️',
    tag: UpgradeTag.KINETIC
  },
  {
    id: UpgradeType.BIG_BULLET,
    type: UpgradeType.BIG_BULLET,
    title: '泰坦弹头',
    description: '子弹巨大化并获得贯穿潜能',
    icon: '💥',
    tag: UpgradeTag.BLAST
  },
  {
    id: UpgradeType.CANNON,
    type: UpgradeType.CANNON,
    title: '重型加农炮',
    description: '发射高威力的动能弹药',
    icon: '🚀',
    tag: UpgradeTag.BLAST
  },
  {
    id: UpgradeType.RANGE_BOOST,
    type: UpgradeType.RANGE_BOOST,
    title: '折射透镜',
    description: '增加弹道稳定度与能量上限',
    icon: '🔍',
    tag: UpgradeTag.ENERGY
  },
  {
    id: UpgradeType.VOLT_SHOT,
    type: UpgradeType.VOLT_SHOT,
    title: '高压线圈',
    description: '使攻击具有传导破坏力',
    icon: '💡',
    tag: UpgradeTag.ENERGY
  },
  {
    id: UpgradeType.HEALTH_UP,
    type: UpgradeType.HEALTH_UP,
    title: '生命扩容',
    description: '增加一个心之容器并补满生命',
    icon: '❤️',
    tag: UpgradeTag.VITALITY
  }
];

export const COLORS = {
  BACKGROUND: '#0a0a0a',
  PLAYER: '#00d4ff', // Electric Blue
  BULLET: '#00ff00', // Fluorescent Green
  ENEMY_BULLET: '#ff3366',
  EXP: '#00ff00',
  OBSTACLE: '#1a1a1a',
  GRAVITY: 'rgba(191, 0, 255, 0.15)', // Neon Purple
  ENERGY: '#00d4ff',
  BLAST: '#ff6600',
  HEART: '#ff0044',
  HEART_EMPTY: '#333333',
  ENEMIES: {
    BASIC: '#bf00ff', // Neon Purple
    CHARGER: '#ffcc00',
    SPLITTER: '#00ff00',
    SHOOTER: '#00d4ff',
    BOSS: '#ffffff'
  }
};
