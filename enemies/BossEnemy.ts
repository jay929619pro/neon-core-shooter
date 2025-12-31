import { BaseEnemy, PlayerTarget } from "./BaseEnemy";
import { EnemyType, Enemy as EnemyData } from "../types";

export class BossEnemy extends BaseEnemy {
  private shootInterval: number;
  public bossVariant?: "core" | "sentinel" | "hive";

  constructor(data: EnemyData) {
    super(data, data.bossVariant === "sentinel" ? 3 : data.bossVariant === "hive" ? 12 : 8); // Variant shapes
    this.bossVariant = data.bossVariant;
    this.shootInterval = this.bossVariant === "core" ? 80 : this.bossVariant === "sentinel" ? 100 : 120;
    this.cooldown = 60;
  }

  update(ctx: {
    player: PlayerTarget;
    frameCount: number;
    spawnProjectile: (x: number, y: number, vx: number, vy: number, radius: number, damage: number) => void;
    spawnEnemy?: (type: EnemyType, x: number, y: number) => void;
  }) {
    // Movement Logic
    if (this.bossVariant === "sentinel") {
      // High mobility: Dash mechanism
      if (this.cooldown > 20) {
        // Hover
        this.x += Math.sin(ctx.frameCount * 0.1) * 2;
        this.y = Math.min(this.y + 1, 120 + Math.sin(ctx.frameCount * 0.05) * 30);
      } else if (this.cooldown === 20) {
        // Dash prep
        this.shakeX = 5;
      } else if (this.cooldown === 10) {
        // Dash moves fast to random spot
        const targetX = Math.max(50, Math.min(350, ctx.player.x + (Math.random() - 0.5) * 200));
        this.x += (targetX - this.x) * 0.5; // Lerp fast
      }
    } else if (this.bossVariant === "hive") {
      // Organic wobble
      this.x += Math.cos(ctx.frameCount * 0.02) * 1.5;
      this.y = 100 + Math.sin(ctx.frameCount * 0.03) * 20;
    } else {
      // Core: Slow, heavy fortress
      this.x += Math.sin(ctx.frameCount * 0.02) * 3;
      this.y = Math.min(this.y + 0.5, 100);
    }

    this.cooldown--;
    if (this.cooldown <= 0) {
      this.shoot(ctx);
      this.cooldown = this.shootInterval;
    }
  }

  private shoot(ctx: { player: PlayerTarget; spawnProjectile: any; spawnEnemy?: any }) {
    if (this.bossVariant === "core") {
      // Patterns: Spiral Hell
      for (let i = 0; i < 8; i++) {
        const angle = Date.now() / 300 + i * (Math.PI / 4);
        ctx.spawnProjectile(this.x, this.y, Math.cos(angle) * 4, Math.sin(angle) * 4, 10, 2);
      }
      this.shootInterval = 25; // Continuous stream
    } else if (this.bossVariant === "sentinel") {
      // Targeted Burst (Sniper Shot)
      const dx = ctx.player.x - this.x;
      const dy = ctx.player.y - this.y;
      const baseAngle = Math.atan2(dy, dx);

      // Triple fast snipe
      for (let i = -1; i <= 1; i++) {
        const a = baseAngle + i * 0.05;
        ctx.spawnProjectile(this.x, this.y, Math.cos(a) * 12, Math.sin(a) * 12, 8, 3);
      }
      this.shootInterval = 90;
    } else if (this.bossVariant === "hive") {
      // Summoning + Nova
      if (Math.random() < 0.4 && ctx.spawnEnemy) {
        // Summon minions
        ctx.spawnEnemy(EnemyType.BASIC, this.x - 40, this.y + 20);
        ctx.spawnEnemy(EnemyType.BASIC, this.x + 40, this.y + 20);
      } else {
        // Nova Pulse
        for (let i = 0; i < 16; i++) {
          const angle = ((Math.PI * 2) / 16) * i;
          ctx.spawnProjectile(this.x, this.y, Math.cos(angle) * 5, Math.sin(angle) * 5, 12, 2);
        }
      }
      this.shootInterval = 150; // Slow
    } else {
      // Fallback Random (Legacy support)
      // ... (Existing random logic if needed, or default to Core)
      // Simple circle
      for (let i = 0; i < 12; i++) {
        const angle = i * (Math.PI / 6);
        ctx.spawnProjectile(this.x, this.y, Math.cos(angle) * 5, Math.sin(angle) * 5, 8, 2);
      }
    }
  }
}
