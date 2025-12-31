import { EnemyType, Enemy as EnemyData } from "../types";
import { BalanceController } from "../gameData";

export interface PlayerTarget {
  x: number;
  y: number;
  radius: number;
}

export abstract class BaseEnemy implements EnemyData {
  type: EnemyType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  size: number;
  color: string;
  shakeX: number = 0;
  shakeY: number = 0;
  hitFlash: number = 0;
  speed: number;
  cooldown: number = 0;
  sides: number; // For drawing

  constructor(data: EnemyData, sides: number) {
    this.type = data.type;
    this.x = data.x;
    this.y = data.y;
    this.hp = data.hp;
    this.maxHp = data.maxHp;
    this.size = data.size;
    this.color = data.color;
    this.speed = data.speed;
    this.sides = sides;
  }

  abstract update(context: {
    player: PlayerTarget;
    frameCount: number;
    enemies: BaseEnemy[]; // For Healer
    spawnProjectile: (x: number, y: number, vx: number, vy: number, radius: number, damage: number) => void;
    spawnEnemy?: (type: EnemyType, x: number, y: number) => void; // For Summoner
  }): void;

  onDeath(context: { spawnEnemy: (type: EnemyType, x: number, y: number) => void }): void {
    // Default empty
  }

  draw(ctx: CanvasRenderingContext2D) {
    const x = this.x + this.shakeX;
    const y = this.y + this.shakeY;

    ctx.fillStyle = this.hitFlash > 0.45 ? "white" : this.color;
    if (this.type === EnemyType.BOSS) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.color;
    }

    ctx.beginPath();
    for (let i = 0; i < this.sides; i++) {
      const a = ((Math.PI * 2) / this.sides) * i;
      const px = x + this.size * Math.cos(a);
      const py = y + this.size * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Health Bar
    const barW = this.size * 1.5;
    const barH = 5;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x - barW / 2, y - this.size - 15, barW, barH);
    const hpRatio = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = this.color;
    ctx.fillRect(x - barW / 2, y - this.size - 15, barW * hpRatio, barH);

    // Debug HP Text (Non-Boss)
    if (this.type !== EnemyType.BOSS) {
      ctx.fillStyle = "white";
      ctx.font = "900 18px Monospace";
      ctx.textAlign = "center";
      ctx.fillText(BalanceController.formatValue(this.hp), x, y + 6);
    }
  }
}
