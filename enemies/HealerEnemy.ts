import { BaseEnemy, PlayerTarget } from "./BaseEnemy";
import { EnemyType, Enemy as EnemyData } from "../types";
import { EnemyFactory } from "./EnemyFactory"; // Not needed if just logic

export class HealerEnemy extends BaseEnemy {
  constructor(data: EnemyData) {
    super(data, 4); // Cross shape
  }

  update(ctx: { player: PlayerTarget; frameCount: number; enemies: BaseEnemy[]; spawnProjectile: any }) {
    this.y += this.speed;

    // Heal Logic (every 60 frames)
    if (ctx.frameCount % 60 === 0) {
      let target: BaseEnemy | null = null;
      let minDistSq = 250 * 250;

      for (const other of ctx.enemies) {
        if (other === this || other.hp >= other.maxHp) continue;
        const dsq = (this.x - other.x) ** 2 + (this.y - other.y) ** 2;
        if (dsq < minDistSq) {
          target = other;
          minDistSq = dsq;
        }
      }

      if (target) {
        target.hp = Math.min(target.maxHp, target.hp + 50);
        target.hitFlash = -0.5; // Green-ish flash indicator (negative trick? no, hitFlash is 0..1)
        // Just rely on particle or something? BaseEnemy uses hitFlash for white.
        // We'll leave visual simple for now.
      }
    }
  }
}
