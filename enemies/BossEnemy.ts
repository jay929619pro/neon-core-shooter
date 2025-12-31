import { BaseEnemy, PlayerTarget } from "./BaseEnemy";
import { EnemyType, Enemy as EnemyData } from "../types";

export class BossEnemy extends BaseEnemy {
  private shootInterval: number;
  public bossVariant?: "core" | "sentinel" | "hive" | "phantom" | "colossus" | "tempest" | "weaver" | "singularity";
  private frameSeed = 0; // Internal timer for custom patterns

  constructor(data: EnemyData) {
    // Dynamic sides based on variant
    let sides = 8;
    if (data.bossVariant === "sentinel") sides = 3;
    else if (data.bossVariant === "hive") sides = 12;
    else if (data.bossVariant === "colossus") sides = 10; // Decagon
    else if (data.bossVariant === "phantom") sides = 4; // Rhombus?
    else if (data.bossVariant === "tempest") sides = 5; // Pentagon
    else if (data.bossVariant === "weaver") sides = 6; // Hexagon
    else if (data.bossVariant === "singularity") sides = 30; // Circle-ish

    super(data, sides);
    this.bossVariant = data.bossVariant;
    this.shootInterval = 80; // Default, overriden in update
    this.cooldown = 60;
    this.frameSeed = Math.random() * 1000;
  }

  update(ctx: {
    player: PlayerTarget;
    frameCount: number;
    spawnProjectile: (x: number, y: number, vx: number, vy: number, radius: number, damage: number) => void;
    spawnEnemy?: (type: EnemyType, x: number, y: number) => void;
  }) {
    this.frameSeed++;

    // Movement Logic
    if (this.bossVariant === "sentinel") {
      // [BUFFED] High mobility: Faster Dash
      if (this.cooldown > 15) {
        this.x += Math.sin(this.frameSeed * 0.1) * 3;
        this.y = Math.min(this.y + 1, 150 + Math.sin(this.frameSeed * 0.05) * 40);
      } else if (this.cooldown === 15) {
        this.shakeX = 10; // Telegraph
      } else if (this.cooldown === 5) {
        // Instant Dash
        const targetX = Math.max(50, Math.min(350, ctx.player.x + (Math.random() - 0.5) * 300));
        this.x += (targetX - this.x) * 0.8;
      }
    } else if (this.bossVariant === "phantom") {
      // [NEW] Teleporter
      // Invisibly drifts? Or just simple hover then SNAP
      this.x += Math.cos(this.frameSeed * 0.05) * 2;
      this.y = 100 + Math.sin(this.frameSeed * 0.04) * 20;

      if (this.cooldown === 20) {
        // Vanish effect? (Shake)
        this.shakeX = 20;
        this.hitFlash = 0.5;
      }
      if (this.cooldown === 1) {
        // Teleport behind player (or flank)
        this.x = Math.max(40, Math.min(360, ctx.player.x + (Math.random() > 0.5 ? 100 : -100)));
        this.y = Math.max(50, ctx.player.y - 150);
      }
    } else if (this.bossVariant === "tempest") {
      // [NEW] Storm
      // Drifts left right top
      this.x = 200 + Math.sin(this.frameSeed * 0.02) * 150;
      this.y = 60 + Math.cos(this.frameSeed * 0.03) * 20;
    } else if (this.bossVariant === "weaver") {
      // [NEW] Grid Builder
      // Zigzag
      this.x = 200 + Math.cos(this.frameSeed * 0.01) * 100;
      this.y = 100 + Math.sin(this.frameSeed * 0.02) * 50;
    } else if (this.bossVariant === "singularity") {
      // [NEW] Void
      // Center hover, slow pulsing approach
      this.x += (200 - this.x) * 0.05;
      this.y = 120 + Math.sin(this.frameSeed * 0.05) * 5;
    } else if (this.bossVariant === "colossus") {
      // [NEW] Static Behemoth
      // Moves very slowly to center
      this.x += (200 - this.x) * 0.01;
      this.y = Math.min(this.y + 0.2, 80);
    } else if (this.bossVariant === "hive") {
      this.x += Math.cos(this.frameSeed * 0.02) * 1.5;
      this.y = 100 + Math.sin(this.frameSeed * 0.03) * 20;
    } else {
      // Core
      this.x += Math.sin(this.frameSeed * 0.02) * 3;
      this.y = Math.min(this.y + 0.5, 100);
    }

    this.cooldown--;
    if (this.cooldown <= 0) {
      this.shoot(ctx);
      // Dynamic intervals
      if (this.bossVariant === "phantom") this.shootInterval = 120; // 2s teleport cycle
      else if (this.bossVariant === "colossus") this.shootInterval = 180; // 3s laser cycle
      else if (this.bossVariant === "sentinel") this.shootInterval = 70; // Faster
      else if (this.bossVariant === "tempest") this.shootInterval = 30; // Rain is continuous but slower
      else if (this.bossVariant === "weaver") this.shootInterval = 60;
      else if (this.bossVariant === "singularity") this.shootInterval = 140;
      else this.shootInterval = 100;

      this.cooldown = this.shootInterval;
    }
  }

  private shoot(ctx: { player: PlayerTarget; spawnProjectile: any; spawnEnemy?: any }) {
    if (this.bossVariant === "tempest") {
      // Bullet Rain: Spawns from top edge (y=0) at random x
      // Guaranteed every shootInterval
      ctx.spawnProjectile(Math.random() * 400, -20, 0, 4 + Math.random() * 2, 5, 2);
      ctx.spawnProjectile(Math.random() * 400, -20, 0, 4 + Math.random() * 2, 5, 2);

      // Boss Shot (Occasional)
      if (Math.random() < 0.3) {
        const dx = ctx.player.x - this.x;
        const dy = ctx.player.y - this.y;
        const a = Math.atan2(dy, dx);
        ctx.spawnProjectile(this.x, this.y, Math.cos(a) * 6, Math.sin(a) * 6, 12, 2);
      }
    } else if (this.bossVariant === "weaver") {
      // Static Mines / Grid
      // Spawns projectiles with near 0 velocity that last long?
      // Engine projectiles die if offscreen, so it works.
      // Spider pattern
      for (let i = 0; i < 6; i++) {
        const a = this.frameSeed * 0.1 + (i * Math.PI) / 3;
        // Very slow moving "Web"
        ctx.spawnProjectile(this.x, this.y, Math.cos(a) * 1.5, Math.sin(a) * 1.5, 8, 2);
      }
    } else if (this.bossVariant === "singularity") {
      // Implosion Ring
      // Spawns ring that expands OUT then could reverse?
      // Engine bullets simple move.
      // Let's do: Massive Pulse that pulls? No logic for Pull on player yet.
      // Let's do: "Event Horizon" - Dense ring that expands slowly
      for (let i = 0; i < 36; i++) {
        const a = ((Math.PI * 2) / 36) * i;
        ctx.spawnProjectile(this.x, this.y, Math.cos(a) * 3, Math.sin(a) * 3, 6, 3);
      }
    } else if (this.bossVariant === "phantom") {
      // Backstab: Ring of fast daggers
      for (let i = 0; i < 8; i++) {
        const a = ((Math.PI * 2) / 8) * i;
        ctx.spawnProjectile(this.x, this.y, Math.cos(a) * 8, Math.sin(a) * 8, 6, 3);
      }
    } else if (this.bossVariant === "colossus") {
      // Giant Laser (Stream of bullets vertically)
      const laserX = this.x; // Center
      // Visual warning? handled by shake/sound elsewhere or implicit
      for (let j = 0; j < 20; j++) {
        // Stream
        // Add slight spread
        ctx.spawnProjectile(laserX - 10 + Math.random() * 20, this.y, 0, 8 + Math.random() * 2, 16, 4);
        ctx.spawnProjectile(laserX - 40, this.y, -2, 6, 8, 2); // Side scatter
        ctx.spawnProjectile(laserX + 40, this.y, 2, 6, 8, 2);
      }
    } else if (this.bossVariant === "sentinel") {
      // Predict movement?
      const dt = 15; // Predict 15 frames ahead
      const px = ctx.player.x; // + player.vx * dt (if we had access)
      const py = ctx.player.y;

      const dx = px - this.x;
      const dy = py - this.y;
      const baseAngle = Math.atan2(dy, dx);

      for (let i = -2; i <= 2; i++) {
        const a = baseAngle + i * 0.12;
        ctx.spawnProjectile(this.x, this.y, Math.cos(a) * 14, Math.sin(a) * 14, 9, 3);
      }
    } else if (this.bossVariant === "hive") {
      if (Math.random() < 0.6 && ctx.spawnEnemy) {
        // [BUFF] More summons
        ctx.spawnEnemy(EnemyType.BASIC, this.x - 50, this.y + 30);
        ctx.spawnEnemy(EnemyType.BASIC, this.x + 50, this.y + 30);
        ctx.spawnEnemy(EnemyType.KAMIKAZE, this.x, this.y + 50); // Surprise!
      } else {
        // Rapid Nova
        for (let i = 0; i < 24; i++) {
          const angle = ((Math.PI * 2) / 24) * i;
          ctx.spawnProjectile(this.x, this.y, Math.cos(angle) * 7, Math.sin(angle) * 7, 12, 2);
        }
      }
    } else {
      // Core: Spiral Hell
      for (let i = 0; i < 12; i++) {
        const angle = this.frameSeed / 20 + i * (Math.PI / 6);
        ctx.spawnProjectile(this.x, this.y, Math.cos(angle) * 5, Math.sin(angle) * 5, 10, 2);
      }
    }
  }
}
