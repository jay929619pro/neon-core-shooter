import { BaseEnemy, PlayerTarget } from "./BaseEnemy";
import { EnemyType, Enemy as EnemyData } from "../types";

export class SplitterEnemy extends BaseEnemy {
  constructor(data: EnemyData) {
    super(data, 6); // Hexagon-like but maybe different if I had more sides available
  }

  update(ctx: { player: PlayerTarget; frameCount: number }) {
    this.y += this.speed;
  }

  // Split logic moved here
  onDeath(ctx: { spawnEnemy: (type: EnemyType, x: number, y: number) => void }) {
    // Spawn 2 minions
    ctx.spawnEnemy(EnemyType.BASIC, this.x - 25, this.y);
    ctx.spawnEnemy(EnemyType.BASIC, this.x + 25, this.y);
  }
}
