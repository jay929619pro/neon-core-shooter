import { BaseEnemy, PlayerTarget } from "./BaseEnemy";
import { EnemyType, Enemy as EnemyData } from "../types";

export class BossEnemy extends BaseEnemy {
  private shootInterval: number;

  constructor(data: EnemyData) {
    super(data, 8); // Octagon
    this.shootInterval = 110;
    this.cooldown = 60;
  }

  update(ctx: {
    player: PlayerTarget;
    frameCount: number;
    spawnProjectile: (x: number, y: number, vx: number, vy: number, radius: number, damage: number) => void;
  }) {
    this.x += Math.sin(ctx.frameCount * 0.035) * 6;
    this.y = Math.min(this.y + 0.8, 140);

    this.cooldown--;
    if (this.cooldown <= 0) {
      this.shoot(ctx);
      this.cooldown = this.shootInterval;
    }
  }

  private shoot(ctx: { player: PlayerTarget; spawnProjectile: any }) {
    const pattern = Math.floor(Math.random() * 3);

    // Pattern 0: Spiral Hell (Rapid rotating stream)
    if (pattern === 0) {
      for (let i = 0; i < 12; i++) {
        const angle = Date.now() / 200 + i * (Math.PI / 6);
        ctx.spawnProjectile(this.x, this.y, Math.cos(angle) * 5, Math.sin(angle) * 5, 8, 2);
      }
      this.shootInterval = 40; // Fast follow-up
    }
    // Pattern 1: Nova Ring (Explosive ring)
    else if (pattern === 1) {
      const count = 20;
      for (let i = 0; i < count; i++) {
        const angle = ((Math.PI * 2) / count) * i;
        ctx.spawnProjectile(this.x, this.y, Math.cos(angle) * 6, Math.sin(angle) * 6, 10, 2);
      }
      this.shootInterval = 120; // Longer pause
    }
    // Pattern 2: Targeted Burst (Shotgun)
    else {
      const dx = ctx.player.x - this.x;
      const dy = ctx.player.y - this.y;
      const baseAngle = Math.atan2(dy, dx);

      for (let i = -2; i <= 2; i++) {
        const angle = baseAngle + i * 0.15;
        ctx.spawnProjectile(this.x, this.y, Math.cos(angle) * 9, Math.sin(angle) * 9, 12, 3);
      }
      this.shootInterval = 90;
    }
  }
}
