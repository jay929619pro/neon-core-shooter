import { BaseEnemy, PlayerTarget } from "./BaseEnemy";
import { EnemyType, Enemy as EnemyData } from "../types";

export class ChargerEnemy extends BaseEnemy {
  private chargeSpeedMult: number;

  constructor(data: EnemyData) {
    super(data, 3); // Triangle
    this.chargeSpeedMult = 3; // Hardcoded or passed from config
  }

  update(ctx: { player: PlayerTarget; frameCount: number }) {
    const dsq = (this.x - ctx.player.x) ** 2 + (this.y - ctx.player.y) ** 2;
    this.y += dsq < 280 * 280 ? this.speed * this.chargeSpeedMult : this.speed;
  }
}
