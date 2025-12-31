import { BaseEnemy, PlayerTarget } from "./BaseEnemy";
import { EnemyType, Enemy as EnemyData } from "../types";

export class KamikazeEnemy extends BaseEnemy {
  constructor(data: EnemyData) {
    super(data, 3); // Tri
  }

  private state: "tracking" | "charging" = "tracking";
  private vx = 0;
  private vy = 0;

  update(ctx: { player: PlayerTarget; frameCount: number }) {
    if (this.state === "tracking") {
      const dx = ctx.player.x - this.x;
      const dy = ctx.player.y - this.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;

      // Moderate steering
      this.vx += (dx / d) * 0.5;
      this.vy += (dy / d) * 0.5;

      // Cap speed
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (speed > this.speed) {
        this.vx = (this.vx / speed) * this.speed;
        this.vy = (this.vy / speed) * this.speed;
      }

      this.x += this.vx;
      this.y += this.vy;

      // Trigger Charge
      if (d < 180) {
        this.state = "charging";
        // Boost speed for charge
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const boost = 10 / (currentSpeed || 1);
        this.vx *= boost;
        this.vy *= boost;
        // Visual Cue? Color change in draw if we had it.
      }
    } else {
      // Charging: Constant velocity, no tracking
      this.x += this.vx;
      this.y += this.vy;
    }
  }
}
