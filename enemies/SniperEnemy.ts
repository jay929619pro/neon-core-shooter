import { BaseEnemy, PlayerTarget } from "./BaseEnemy";
import { EnemyType, Enemy as EnemyData } from "../types";

export class SniperEnemy extends BaseEnemy {
  private state: "moving" | "aiming" | "cooldown" = "moving";
  private aimTimer = 0;
  private targetLoc = { x: 0, y: 0 };

  constructor(data: EnemyData) {
    super(data, 3);
    this.cooldown = 120;
  }

  update(ctx: {
    player: PlayerTarget;
    frameCount: number;
    spawnProjectile: (x: number, y: number, vx: number, vy: number, radius: number, damage: number) => void;
  }) {
    if (this.state === "moving") {
      this.y += this.speed;
      if (this.y > 100 && Math.random() < 0.05) {
        this.state = "aiming";
        this.aimTimer = 60;
        // Lock target
        this.targetLoc = { x: ctx.player.x, y: ctx.player.y };
      }
    } else if (this.state === "aiming") {
      this.aimTimer--;
      // Track player slowly? or Lock? standard sniper locks then shoots.
      // Let's track slowly
      this.targetLoc.x += (ctx.player.x - this.targetLoc.x) * 0.1;
      this.targetLoc.y += (ctx.player.y - this.targetLoc.y) * 0.1;

      if (this.aimTimer <= 0) {
        // Shoot
        const dx = this.targetLoc.x - this.x;
        const dy = this.targetLoc.y - this.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (ctx.spawnProjectile) {
          ctx.spawnProjectile(this.x, this.y, (dx / d) * 15, (dy / d) * 15, 6, 2); // Fast bullet
        }
        this.state = "cooldown";
        this.cooldown = 120;
      }
    } else if (this.state === "cooldown") {
      this.y -= 0.5; // Recoil/Back up
      this.cooldown--;
      if (this.cooldown <= 0) this.state = "moving";
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    super.draw(ctx);
    if (this.state === "aiming") {
      ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.targetLoc.x, this.targetLoc.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
