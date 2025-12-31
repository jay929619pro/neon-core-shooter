import { BaseEnemy, PlayerTarget } from "./BaseEnemy";
import { EnemyType, Enemy as EnemyData } from "../types";

export class SummonerEnemy extends BaseEnemy {
  private summonCooldown = 300;

  constructor(data: EnemyData) {
    super(data, 7);
    this.summonCooldown = 300;
  }

  update(ctx: { player: PlayerTarget; frameCount: number; spawnEnemy?: (type: EnemyType, x: number, y: number) => void }) {
    // Run away from player if too close
    const dx = this.x - ctx.player.x;
    const dy = this.y - ctx.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 200) {
      this.x += (dx / dist) * 1.5;
      this.y += (dy / dist) * 1.5;
    } else {
      // Strafe
      this.x += Math.sin(ctx.frameCount * 0.02) * 1.0;
    }

    this.x = Math.max(20, Math.min(380, this.x)); // Clamp (assuming width 400 approx, actually CANVAS_WIDTH is 400 in constants)

    this.summonCooldown--;
    if (this.summonCooldown <= 0) {
      if (ctx.spawnEnemy) {
        // Spawn 2 minions
        ctx.spawnEnemy(EnemyType.BASIC, this.x - 30, this.y);
        ctx.spawnEnemy(EnemyType.BASIC, this.x + 30, this.y);
      }
      this.summonCooldown = 300;
    }
  }
}
