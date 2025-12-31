import { BaseEnemy, PlayerTarget } from "./BaseEnemy";
import { EnemyType, Enemy as EnemyData } from "../types";

export class ShooterEnemy extends BaseEnemy {
  private shootInterval: number;

  constructor(data: EnemyData) {
    super(data, 4); // Square
    this.shootInterval = 90;
    this.cooldown = Math.random() * 50;
  }

  update(ctx: {
    player: PlayerTarget;
    frameCount: number;
    spawnProjectile: (x: number, y: number, vx: number, vy: number, radius: number, damage: number) => void;
  }) {
    if (this.y < 180) this.y += this.speed;
    else this.x += Math.sin(ctx.frameCount * 0.02) * 2.5;

    this.cooldown--;
    if (this.cooldown <= 0) {
      if (ctx.spawnProjectile) {
        ctx.spawnProjectile(this.x, this.y, 0, 6.5, 8, 1);
      }
      this.cooldown = this.shootInterval;
    }
  }
}
