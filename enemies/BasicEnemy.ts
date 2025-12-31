import { BaseEnemy, PlayerTarget } from "./BaseEnemy";
import { EnemyType, Enemy as EnemyData } from "../types";

export class BasicEnemy extends BaseEnemy {
  constructor(data: EnemyData) {
    super(data, 6); // Hexagon
  }

  update(ctx: { player: PlayerTarget; frameCount: number }) {
    this.y += this.speed;
  }
}
