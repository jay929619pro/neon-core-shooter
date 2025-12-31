import { BaseEnemy, PlayerTarget } from "./BaseEnemy";
import { EnemyType, Enemy as EnemyData } from "../types";

export class ShielderEnemy extends BaseEnemy {
  constructor(data: EnemyData) {
    super(data, 5); // Pent
    // High HP is set in Factory
  }

  update(ctx: { player: PlayerTarget; frameCount: number }) {
    // Moves very slow
    this.y += this.speed;
    this.x += Math.sin(ctx.frameCount * 0.01) * 0.5;
  }
}
