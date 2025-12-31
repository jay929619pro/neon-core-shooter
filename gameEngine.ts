import { CANVAS_WIDTH, CANVAS_HEIGHT, INITIAL_FIRE_RATE, COLORS, INITIAL_DAMAGE, INITIAL_BULLET_SIZE, INVINCIBLE_TIME } from "./constants";
import {
  Bullet,
  Enemy,
  Particle,
  DamageNumber,
  ExpGem,
  UpgradeType,
  UpgradeTag,
  UpgradeOption,
  WeaponMode,
  EnemyType,
  EnemyBullet,
  Obstacle,
  GravityField,
  HeartItem
} from "./types";
import { eventBus, EVENTS } from "./eventBus";
import { WEAPON_CONFIG, ENEMY_ARCHETYPES, ENVIRONMENT_CONFIG, BalanceController } from "./gameData";

export class GameEngine {
  private ctx: CanvasRenderingContext2D;

  private player = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT * 0.8,
    radius: 20,
    targetX: CANVAS_WIDTH / 2,
    targetY: CANVAS_HEIGHT * 0.8,
    fireRate: INITIAL_FIRE_RATE,
    lastFired: 0,
    sideGuns: 0,
    bulletScale: 1,
    damageBase: INITIAL_DAMAGE,
    damageAdditive: 0,
    damageMultiplicative: 1,
    weaponMode: WeaponMode.STANDARD,
    // 心形系统字段
    maxHearts: 3,
    currentHealth: 6,
    invincibleTimer: 0,
    heartScaleAnims: [] as number[]
  };

  private bullets: Bullet[] = [];
  private enemyBullets: EnemyBullet[] = [];
  private enemies: Enemy[] = [];
  private obstacles: Obstacle[] = [];
  private gravityFields: GravityField[] = [];
  private particles: Particle[] = [];
  private damageNumbers: DamageNumber[] = [];
  private gems: ExpGem[] = [];
  private hearts: HeartItem[] = [];
  private upgradeLevels: Map<UpgradeType, number> = new Map();
  private tagCounts: Map<UpgradeTag, number> = new Map();

  private score = 0;
  private level = 1;
  private exp = 0;
  private maxExp = 100;
  private frameCount = 0;
  private shakeTimer = 0;
  private isPaused = false;
  private bossActive = false;
  private animationId: number | null = null;
  private maxParticles = 180;

  private lastKillFrame = 0;
  private mercyBoost = 0;

  // Juice Mechanics
  private hitStopTimer = 0;
  private cameraZoom = 1.0;
  private zoomTarget = 1.0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.initEvents();
  }

  private initEvents() {
    const handleInput = (e: MouseEvent | TouchEvent) => {
      const rect = this.ctx.canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      let clientX, clientY;
      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      this.player.targetX = (clientX - rect.left) * scaleX;
      this.player.targetY = (clientY - rect.top) * scaleY;
    };
    this.ctx.canvas.addEventListener("mousemove", handleInput);
    this.ctx.canvas.addEventListener(
      "touchmove",
      e => {
        e.preventDefault();
        handleInput(e);
      },
      { passive: false }
    );
  }

  public takeDamage(amount: number) {
    if (this.player.invincibleTimer > 0 || this.isPaused) return;

    const prevHealth = this.player.currentHealth;
    this.player.currentHealth = Math.max(0, this.player.currentHealth - amount);
    this.player.invincibleTimer = INVINCIBLE_TIME;
    this.shake(20);
    eventBus.emit(EVENTS.TRIGGER_SOUND, "explosion");

    // 触发受击对应位置心的弹性动画
    const heartIndex = Math.floor((prevHealth - 1) / 2);
    if (this.player.heartScaleAnims[heartIndex] !== undefined) {
      this.player.heartScaleAnims[heartIndex] = 1.4;
    }

    if (this.player.currentHealth <= 0) {
      this.gameOver();
    }
  }

  public applyUpgrade(upgrade: UpgradeOption) {
    const currentLevel = (this.upgradeLevels.get(upgrade.type) || 0) + 1;
    this.upgradeLevels.set(upgrade.type, currentLevel);
    const currentTagCount = (this.tagCounts.get(upgrade.tag) || 0) + 1;
    this.tagCounts.set(upgrade.tag, currentTagCount);

    switch (upgrade.type) {
      case UpgradeType.FIRE_RATE:
        this.player.fireRate = Math.max(40, this.player.fireRate - 15);
        break;
      case UpgradeType.SIDE_GUNS:
        this.player.sideGuns++;
        break;
      case UpgradeType.BIG_BULLET:
        this.player.damageAdditive += 0.4;
        this.player.bulletScale += 0.2;
        break;
      case UpgradeType.CANNON:
        this.player.damageAdditive += 0.6;
        break;
      case UpgradeType.RANGE_BOOST:
        this.player.bulletScale += 0.1;
        break;
      case UpgradeType.VOLT_SHOT:
        this.player.damageAdditive += 0.2;
        break;
      case UpgradeType.HEALTH_UP:
        if (this.player.maxHearts < 10) {
          // Limit max hearts to 10
          this.player.maxHearts++;
          this.player.currentHealth = this.player.maxHearts * 2;
          this.player.heartScaleAnims.push(1.0);
        } else {
          // Fallback heal if maxed
          this.player.currentHealth = this.player.maxHearts * 2;
        }
        break;
    }

    const cannonLevel = this.upgradeLevels.get(UpgradeType.CANNON) || 0;
    const rangeLevel = this.upgradeLevels.get(UpgradeType.RANGE_BOOST) || 0;

    if (cannonLevel >= 5 && rangeLevel >= 1 && this.player.weaponMode !== WeaponMode.BLACK_HOLE) {
      this.player.weaponMode = WeaponMode.BLACK_HOLE;
      this.player.damageMultiplicative *= 2.0;
      eventBus.emit(EVENTS.TRIGGER_SOUND, "evo");
      this.shake(60);
      for (let i = 0; i < 30; i++)
        this.spawnParticle(this.player.x, this.player.y, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15, 8, "#bf00ff", 40, true);
    }
  }

  private calculateDamage(): number {
    return this.player.damageBase * (1 + this.player.damageAdditive) * this.player.damageMultiplicative * (1 + this.mercyBoost);
  }

  private spawnParticle(x: number, y: number, vx: number, vy: number, size: number, color: string, life: number, glow = false) {
    if (this.particles.length > this.maxParticles) return;
    this.particles.push({ x, y, vx, vy, size, color, life, maxLife: life, glow });
  }

  public reset() {
    this.player = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT * 0.8,
      radius: 20,
      targetX: CANVAS_WIDTH / 2,
      targetY: CANVAS_HEIGHT * 0.8,
      fireRate: INITIAL_FIRE_RATE,
      lastFired: 0,
      sideGuns: 0,
      bulletScale: 1,
      damageBase: INITIAL_DAMAGE,
      damageAdditive: 0,
      damageMultiplicative: 1,
      weaponMode: WeaponMode.STANDARD,
      maxHearts: 3,
      currentHealth: 6,
      invincibleTimer: 0,
      heartScaleAnims: [1, 1, 1]
    };
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.obstacles = [];
    this.gravityFields = [];
    this.particles = [];
    this.gems = [];
    this.damageNumbers = [];
    this.hearts = [];
    this.upgradeLevels.clear();
    this.tagCounts.clear();
    this.score = 0;
    this.level = 1;
    this.exp = 0;
    this.maxExp = BalanceController.getXPRequired(1);
    this.shakeTimer = 0;
    this.isPaused = false;
    this.bossActive = false;
    this.lastKillFrame = this.frameCount;
    this.mercyBoost = 0;
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }

  public start() {
    this.isPaused = false;
    this.loop();
  }
  public resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this.zoomTarget = 1.0; // Reset zoom on resume
      this.loop();
    }
  }

  public togglePause(): boolean {
    if (this.isPaused) {
      this.resume();
    } else {
      this.isPaused = true;
    }
    return this.isPaused;
  }

  private loop = () => {
    if (this.isPaused) return;
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private update() {
    this.frameCount++;
    const deltaTime = 1000 / 60; // Assuming 60fps

    if (this.player.invincibleTimer > 0) {
      this.player.invincibleTimer -= deltaTime;
    }

    // 更新心的缩放动画
    for (let i = 0; i < this.player.heartScaleAnims.length; i++) {
      if (this.player.heartScaleAnims[i] > 1.0) {
        this.player.heartScaleAnims[i] -= 0.02;
      } else {
        this.player.heartScaleAnims[i] = 1.0;
      }
    }

    const framesSinceKill = this.frameCount - this.lastKillFrame;
    if (framesSinceKill > 1800 && this.frameCount % 300 === 0) this.mercyBoost += 0.1;

    let moveScale = 1;
    for (let i = this.gravityFields.length - 1; i >= 0; i--) {
      const f = this.gravityFields[i];
      f.y += 1.2;
      const dx = f.x - this.player.x;
      const dy = f.y - this.player.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < f.radius * f.radius) {
        moveScale = 0.5;
        const d = Math.sqrt(distSq) || 1;
        this.player.targetX += (dx / d) * f.strength;
        this.player.targetY += (dy / d) * f.strength;
      }
      if (f.y > CANVAS_HEIGHT + f.radius) this.gravityFields.splice(i, 1);
    }

    this.player.x += (this.player.targetX - this.player.x) * moveScale;
    this.player.y += (this.player.targetY - this.player.y) * moveScale;
    this.player.x = Math.max(this.player.radius, Math.min(CANVAS_WIDTH - this.player.radius, this.player.x));
    this.player.y = Math.max(this.player.radius, Math.min(CANVAS_HEIGHT - this.player.radius, this.player.y));

    if (this.shakeTimer > 0) this.shakeTimer--;

    if (Date.now() - this.player.lastFired > this.player.fireRate) {
      this.fire();
      this.player.lastFired = Date.now();
    }

    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const eb = this.enemyBullets[i];
      eb.x += eb.vx;
      eb.y += eb.vy;
      if ((eb.x - this.player.x) ** 2 + (eb.y - this.player.y) ** 2 < (eb.radius + this.player.radius * 0.6) ** 2) {
        this.takeDamage(eb.damage);
        this.enemyBullets.splice(i, 1);
        continue;
      }
      if (eb.y > CANVAS_HEIGHT + 100) this.enemyBullets.splice(i, 1);
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.y += 1.5;
      if (this.player.x > o.x && this.player.x < o.x + o.width && this.player.y > o.y && this.player.y < o.y + o.height) {
        this.takeDamage(1);
      }
      if (o.hp <= 0) {
        this.score += 50;
        eventBus.emit(EVENTS.TRIGGER_SOUND, "explosion");
        for (let j = 0; j < 15; j++)
          this.spawnParticle(
            o.x + o.width / 2,
            o.y + o.height / 2,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            4,
            COLORS.OBSTACLE,
            30
          );
        this.obstacles.splice(i, 1);
        continue;
      }
      if (o.y > CANVAS_HEIGHT + 100) this.obstacles.splice(i, 1);
    }

    const hasVoltShot = (this.upgradeLevels.get(UpgradeType.VOLT_SHOT) || 0) > 0;
    const energySynergy = (this.tagCounts.get(UpgradeTag.ENERGY) || 0) >= 3;
    const blastSynergy = (this.tagCounts.get(UpgradeTag.BLAST) || 0) >= 3;

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.trail.unshift({ x: b.x, y: b.y });
      if (b.trail.length > (b.isBlackHole ? 10 : 6)) b.trail.pop();

      if (b.isBlackHole) {
        const bhConf = WEAPON_CONFIG[WeaponMode.BLACK_HOLE];
        this.enemies.forEach(e => {
          const dx = b.x - e.x;
          const dy = b.y - e.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < bhConf.pullRadius! * bhConf.pullRadius!) {
            const d = Math.sqrt(distSq) || 1;
            e.x += (dx / d) * bhConf.pullStrength!;
            e.y += (dy / d) * bhConf.pullStrength!;
          }
        });
      }

      this.obstacles.forEach(o => {
        if (b.x > o.x && b.x < o.x + o.width && b.y > o.y && b.y < o.y + o.height) {
          o.hp -= b.damage;
          this.spawnDamageNumber(b.x, b.y, b.damage, false);
          if (!b.isBlackHole) this.bullets.splice(i, 1);
        }
      });
      if (b.y < -120 || b.y > CANVAS_HEIGHT + 120) this.bullets.splice(i, 1);
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const arch = ENEMY_ARCHETYPES[e.type];
      e.shakeX *= 0.8;
      e.shakeY *= 0.8;

      switch (e.type) {
        case EnemyType.CHARGER:
          const dsq = (e.x - this.player.x) ** 2 + (e.y - this.player.y) ** 2;
          e.y += dsq < 280 * 280 ? e.speed * (arch.chargeSpeedMult || 1) : e.speed;
          break;
        case EnemyType.SHOOTER:
          if (e.y < 180) e.y += e.speed;
          else e.x += Math.sin(this.frameCount * 0.02) * 2.5;
          e.cooldown = (e.cooldown || 0) - 1;
          if (e.cooldown <= 0) {
            this.enemyBullets.push({ x: e.x, y: e.y, vx: 0, vy: 6.5, radius: 8, damage: 1 });
            e.cooldown = arch.shootInterval || 100;
          }
          break;
        case EnemyType.BOSS:
          e.x += Math.sin(this.frameCount * 0.035) * 6;
          e.y = Math.min(e.y + 0.8, 140);
          e.cooldown = (e.cooldown || 0) - 1;
          if (e.cooldown <= 0) {
            this.bossAttack(e);
            e.cooldown = arch.shootInterval || 100;
          }
          break;
        default:
          e.y += e.speed;
      }

      if (e.hitFlash > 0) e.hitFlash -= 0.15;

      for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
        const b = this.bullets[bi];
        const dx = e.x - b.x;
        const dy = e.y - b.y;
        const hitDistSq = dx * dx + dy * dy;
        const combinedRadius = e.size + b.radius;
        if (hitDistSq < combinedRadius * combinedRadius) {
          const isCrit = Math.random() < 0.12;
          const finalDamage = b.damage * (isCrit ? 1.6 : 1);
          e.hp -= finalDamage;
          e.hitFlash = 1;
          e.shakeX = (Math.random() - 0.5) * 15;
          this.spawnDamageNumber(b.x, b.y, finalDamage, isCrit);

          if (hasVoltShot && Math.random() < (energySynergy ? 0.6 : 0.35)) {
            this.chainLightning(e, b.damage, energySynergy ? 450 : 300);
          }
          if (blastSynergy) this.createExplosion(b.x, b.y, 90, b.damage);

          if (!b.isBlackHole) this.bullets.splice(bi, 1);
          if (e.hp <= 0) {
            this.handleEnemyDeath(e, i);
            break;
          }
        }
      }

      if (i < this.enemies.length && (e.x - this.player.x) ** 2 + (e.y - this.player.y) ** 2 < (e.size * 0.7 + this.player.radius) ** 2) {
        this.takeDamage(e.type === EnemyType.BOSS ? 2 : 1);
      }
      if (i < this.enemies.length && e.y > CANVAS_HEIGHT + 150) this.enemies.splice(i, 1);
    }

    if (!this.bossActive) {
      if (this.level % 5 === 0) this.spawnBoss();
      else if (this.frameCount % 45 === 0) this.spawnEnemy();
      if (this.frameCount % 300 === 0) this.spawnEnvironment();
    }

    // 磁吸效果同步给血包
    for (let i = this.hearts.length - 1; i >= 0; i--) {
      const h = this.hearts[i];
      const dx = this.player.x - h.x;
      const dy = this.player.y - h.y;
      const dsq = dx * dx + dy * dy;
      if (dsq < 220 * 220) {
        const d = Math.sqrt(dsq) || 1;
        h.x += (dx / d) * 10;
        h.y += (dy / d) * 10;
      }
      if (dsq < (this.player.radius + h.size) ** 2) {
        this.player.currentHealth = Math.min(this.player.currentHealth + 2, this.player.maxHearts * 2);
        eventBus.emit(EVENTS.TRIGGER_SOUND, "levelup");
        this.hearts.splice(i, 1);
        continue;
      }
      // Resource Cleanup: Remove hearts that fall off screen
      if (h.y > CANVAS_HEIGHT + 100) this.hearts.splice(i, 1);
    }

    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      const dx = this.player.x - g.x;
      const dy = this.player.y - g.y;
      if (dx * dx + dy * dy < 220 * 220) {
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        g.x += (dx / d) * 16;
        g.y += (dy / d) * 16;
      }
      if (dx * dx + dy * dy < (this.player.radius + g.size) ** 2) {
        this.exp += g.value;
        this.gems.splice(i, 1);
        eventBus.emit(EVENTS.EXP_UPDATED, { exp: this.exp, maxExp: this.maxExp });
        if (this.exp >= this.maxExp) this.levelUp();
      }
    }

    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.x += dn.vx;
      dn.y += dn.vy;
      dn.vy += 0.3;
      dn.life--;
      if (dn.life <= 0) this.damageNumbers.splice(i, 1);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  private spawnDamageNumber(x: number, y: number, damage: number, isCrit: boolean) {
    this.damageNumbers.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y - 20,
      vx: (Math.random() - 0.5) * 5,
      vy: -6 - Math.random() * 5,
      text: BalanceController.formatValue(damage),
      color: isCrit ? "#ff0000" : damage > 0 ? "#ffff00" : "#ffffff",
      life: 45,
      maxLife: 45,
      isCrit
    });
    if (isCrit) this.shake(8);
  }

  private gameOver() {
    this.isPaused = true;
    eventBus.emit(EVENTS.GAME_OVER);
  }

  private levelUp() {
    this.isPaused = true;
    this.level++;
    this.exp = 0;
    this.maxExp = BalanceController.getXPRequired(this.level);
    eventBus.emit(EVENTS.TRIGGER_SOUND, "levelup");
    eventBus.emit(EVENTS.LEVEL_UP, this.level);
    eventBus.emit(EVENTS.EXP_UPDATED, { exp: this.exp, maxExp: this.maxExp });
  }

  private handleEnemyDeath(e: Enemy, index: number) {
    this.lastKillFrame = this.frameCount;
    this.mercyBoost = 0;
    eventBus.emit(EVENTS.TRIGGER_SOUND, "kill");

    if (e.type === EnemyType.SPLITTER) {
      const subHp = BalanceController.getEnemyHP(EnemyType.BASIC, this.level) * 0.7;
      for (let j = 0; j < 2; j++) {
        this.enemies.push({
          type: EnemyType.BASIC,
          x: e.x + (j === 0 ? -25 : 25),
          y: e.y,
          hp: subHp,
          maxHp: subHp,
          size: 24,
          color: COLORS.ENEMIES.BASIC,
          shakeX: 0,
          shakeY: 0,
          hitFlash: 0,
          speed: 4
        });
      }
    }

    if (e.type === EnemyType.BOSS) {
      this.bossActive = false;
      this.score += 2000;
      for (let k = 0; k < 15; k++)
        this.gems.push({ x: e.x + (Math.random() - 0.5) * 180, y: e.y + (Math.random() - 0.5) * 180, value: 70, size: 10 });
      // BOSS 必掉血包
      this.hearts.push({ x: e.x, y: e.y, size: 12, pulse: 0 });
    } else {
      this.score += 25;
      this.gems.push({ x: e.x, y: e.y, value: 30, size: 9 });
      // 普通怪低概率掉血包
      if (Math.random() < 0.05) {
        this.hearts.push({ x: e.x, y: e.y, size: 12, pulse: 0 });
      }
    }
    eventBus.emit(EVENTS.SCORE_UPDATED, this.score);
    eventBus.emit(EVENTS.ENEMY_KILLED); // 补充：触发杀敌事件
    this.explodeEnemy(e);
    this.enemies.splice(index, 1);
    this.shake(e.type === EnemyType.BOSS ? 50 : 12);
  }

  private bossAttack(boss: Enemy) {
    eventBus.emit(EVENTS.TRIGGER_SOUND, "boss_fire");
    const pattern = Math.floor(Math.random() * 3);
    if (pattern === 0) {
      for (let i = 0; i < 18; i++) {
        const a = ((Math.PI * 2) / 18) * i;
        this.enemyBullets.push({ x: boss.x, y: boss.y, vx: Math.cos(a) * 6.5, vy: Math.sin(a) * 6.5, radius: 10, damage: 2 });
      }
    } else if (pattern === 1) {
      for (let i = -5; i <= 5; i++) this.enemyBullets.push({ x: boss.x, y: boss.y, vx: i * 1.6, vy: 8, radius: 10, damage: 1 });
    } else {
      const dx = this.player.x - boss.x;
      const dy = this.player.y - boss.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      this.enemyBullets.push({ x: boss.x, y: boss.y, vx: (dx / d) * 10, vy: (dy / d) * 10, radius: 12, damage: 2 });
    }
  }

  private fire() {
    eventBus.emit(EVENTS.TRIGGER_SOUND, "fire");
    const currentDamage = this.calculateDamage();
    const createB = (ox: number, isS = false) => {
      const mode = this.player.weaponMode === WeaponMode.BLACK_HOLE && !isS ? WeaponMode.BLACK_HOLE : WeaponMode.STANDARD;
      const conf = WEAPON_CONFIG[mode];
      this.bullets.push({
        x: this.player.x + ox,
        y: this.player.y - (mode === WeaponMode.BLACK_HOLE ? 40 : 20),
        vx: 0,
        vy: conf.bulletSpeed,
        radius: (mode === WeaponMode.BLACK_HOLE ? conf.bulletRadius : INITIAL_BULLET_SIZE) * this.player.bulletScale,
        damage: currentDamage * (mode === WeaponMode.BLACK_HOLE ? 1.5 : 1),
        trail: [],
        isBlackHole: mode === WeaponMode.BLACK_HOLE
      });
    };
    createB(0);
    for (let i = 1; i <= this.player.sideGuns; i++) {
      createB(-35 * i, true);
      createB(35 * i, true);
    }
  }

  private spawnEnemy() {
    const types = [EnemyType.BASIC, EnemyType.CHARGER, EnemyType.SPLITTER, EnemyType.SHOOTER];
    const t = types[Math.floor(Math.random() * types.length)];
    const arch = ENEMY_ARCHETYPES[t];
    const hp = BalanceController.getEnemyHP(t, this.level);
    this.enemies.push({
      type: t,
      x: arch.size + Math.random() * (CANVAS_WIDTH - arch.size * 2),
      y: -arch.size,
      hp,
      maxHp: hp,
      size: arch.size,
      color: arch.color,
      shakeX: 0,
      shakeY: 0,
      hitFlash: 0,
      speed: arch.speedBase + Math.random() * 2,
      cooldown: 0
    });
  }

  private spawnBoss() {
    this.bossActive = true;
    const arch = ENEMY_ARCHETYPES[EnemyType.BOSS];
    const hp = BalanceController.getEnemyHP(EnemyType.BOSS, this.level);
    this.enemies.push({
      type: EnemyType.BOSS,
      x: CANVAS_WIDTH / 2,
      y: -150,
      hp,
      maxHp: hp,
      size: arch.size,
      color: arch.color,
      shakeX: 0,
      shakeY: 0,
      hitFlash: 0,
      speed: arch.speedBase,
      cooldown: 60
    });
  }

  private spawnEnvironment() {
    if (Math.random() > 0.5) {
      const conf = ENVIRONMENT_CONFIG.obstacle;
      const hp = conf.hp * (1 + this.level / 10);
      this.obstacles.push({ x: Math.random() * (CANVAS_WIDTH - 100), y: -100, width: conf.width, height: conf.height, hp, maxHp: hp });
    } else {
      const conf = ENVIRONMENT_CONFIG.gravityField;
      this.gravityFields.push({ x: Math.random() * CANVAS_WIDTH, y: -150, radius: conf.radius, strength: conf.strength });
    }
  }

  private createExplosion(x: number, y: number, r: number, d: number) {
    this.enemies.forEach(e => {
      if ((e.x - x) ** 2 + (e.y - y) ** 2 < r * r) {
        e.hp -= d * 0.8;
        e.hitFlash = 1;
      }
    });
    for (let i = 0; i < 12; i++)
      this.spawnParticle(x, y, (Math.random() - 0.5) * 22, (Math.random() - 0.5) * 22, 6, COLORS.BLAST, 20, true);
  }

  private chainLightning(source: Enemy, d: number, range: number) {
    const target = this.enemies.find(o => o !== source && (source.x - o.x) ** 2 + (source.y - o.y) ** 2 < range * range);
    if (target) {
      target.hp -= d * 1.1;
      target.hitFlash = 1;
      eventBus.emit(EVENTS.TRIGGER_SOUND, "volt");
      for (let i = 0; i <= 5; i++) {
        const px = source.x + (target.x - source.x) * (i / 5);
        const py = source.y + (target.y - source.y) * (i / 5);
        this.spawnParticle(px, py, 0, 0, 8 - i, COLORS.ENERGY, 15, true);
      }
    }
  }

  private explodeEnemy(e: Enemy) {
    const c = e.type === EnemyType.BOSS ? 50 : 20;
    for (let i = 0; i < c; i++)
      this.spawnParticle(e.x, e.y, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, Math.random() * 8 + 2, e.color, 40, true);
  }

  private shake(i: number) {
    this.shakeTimer = Math.max(this.shakeTimer, i);
    eventBus.emit(EVENTS.SHAKE_SCREEN, i);
  }

  private drawHeart(x: number, y: number, size: number, mode: "full" | "half" | "empty") {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(size / 24, size / 24);

    const drawPath = () => {
      this.ctx.beginPath();
      this.ctx.moveTo(0, 10);
      this.ctx.bezierCurveTo(-10, -10, -25, 5, 0, 24);
      this.ctx.bezierCurveTo(25, 5, 10, -10, 0, 10);
      this.ctx.closePath();
    };

    if (mode === "empty") {
      this.ctx.strokeStyle = COLORS.HEART_EMPTY;
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([4, 4]);
      drawPath();
      this.ctx.stroke();
    } else if (mode === "full") {
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = COLORS.HEART;
      this.ctx.fillStyle = COLORS.HEART;
      drawPath();
      this.ctx.fill();
    } else {
      // half
      // 左边亮红
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(-30, -30, 30, 60);
      this.ctx.clip();
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = COLORS.HEART;
      this.ctx.fillStyle = COLORS.HEART;
      drawPath();
      this.ctx.fill();
      this.ctx.restore();

      // 右边暗灰
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(0, -30, 30, 60);
      this.ctx.clip();
      this.ctx.fillStyle = COLORS.HEART_EMPTY;
      drawPath();
      this.ctx.fill();
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  private drawHeartUI() {
    const padding = 25;
    const startX = 35;
    const startY = 145;
    const heartSize = 24;
    const spacingX = 35;
    const spacingY = 35;
    const heartsPerRow = 5;

    for (let i = 0; i < this.player.maxHearts; i++) {
      const col = i % heartsPerRow;
      const row = Math.floor(i / heartsPerRow);
      const x = startX + col * spacingX;
      const y = startY + row * spacingY;
      const scale = this.player.heartScaleAnims[i] || 1.0;

      let mode: "full" | "half" | "empty" = "empty";
      if (this.player.currentHealth >= (i + 1) * 2) mode = "full";
      else if (this.player.currentHealth >= i * 2 + 1) mode = "half";

      this.drawHeart(x, y, heartSize * scale, mode);
    }
  }

  private draw() {
    this.ctx.save();
    if (this.shakeTimer > 0) this.ctx.translate((Math.random() - 0.5) * this.shakeTimer, (Math.random() - 0.5) * this.shakeTimer);

    this.ctx.fillStyle = COLORS.BACKGROUND;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.gravityFields.forEach(f => {
      const pulse = Math.sin(this.frameCount * 0.05) * 10;
      const grad = this.ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius + pulse);
      grad.addColorStop(0, COLORS.GRAVITY);
      grad.addColorStop(1, "transparent");
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(f.x, f.y, f.radius + pulse, 0, Math.PI * 2);
      this.ctx.fill();
    });

    this.obstacles.forEach(o => {
      this.ctx.fillStyle = COLORS.OBSTACLE;
      this.ctx.strokeStyle = "rgba(255,255,255,0.2)";
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(o.x, o.y, o.width, o.height);
      this.ctx.fillRect(o.x, o.y, o.width, o.height);
      this.ctx.beginPath();
      this.ctx.moveTo(o.x, o.y + o.height / 2);
      this.ctx.lineTo(o.x + o.width, o.y + o.height / 2);
      this.ctx.stroke();
      const hpR = o.hp / o.maxHp;
      this.ctx.fillStyle = "rgba(255,255,255,0.1)";
      this.ctx.fillRect(o.x, o.y - 10, o.width, 4);
      this.ctx.fillStyle = "#ffaa00";
      this.ctx.fillRect(o.x, o.y - 10, o.width * hpR, 4);
    });

    this.ctx.globalCompositeOperation = "lighter";
    this.particles.forEach(p => {
      this.ctx.globalAlpha = p.life / p.maxLife;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = "source-over";

    this.gems.forEach(g => {
      this.ctx.fillStyle = COLORS.EXP;
      this.ctx.beginPath();
      this.ctx.arc(g.x, g.y, g.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = "#fff";
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    });

    this.hearts.forEach(h => {
      const pulse = Math.sin(this.frameCount * 0.1) * 3;
      this.drawHeart(h.x, h.y, h.size + pulse, "full");
    });

    this.enemyBullets.forEach(eb => {
      this.ctx.fillStyle = COLORS.ENEMY_BULLET;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = COLORS.ENEMY_BULLET;
      this.ctx.beginPath();
      this.ctx.arc(eb.x, eb.y, eb.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    });

    this.bullets.forEach(b => {
      if (b.isBlackHole) {
        const bhGrad = this.ctx.createRadialGradient(b.x, b.y, b.radius * 0.5, b.x, b.y, b.radius * 1.8);
        bhGrad.addColorStop(0, "#000");
        bhGrad.addColorStop(0.6, "#4b0082");
        bhGrad.addColorStop(1, "transparent");
        this.ctx.fillStyle = bhGrad;
        this.ctx.beginPath();
        this.ctx.arc(b.x, b.y, b.radius * 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = "#000";
        this.ctx.beginPath();
        this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = "#bf00ff";
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(b.x, b.y, b.radius + Math.sin(this.frameCount * 0.2) * 5, 0, Math.PI * 2);
        this.ctx.stroke();
      } else {
        this.ctx.lineWidth = b.radius * 2;
        this.ctx.lineCap = "round";
        this.ctx.strokeStyle = `rgba(0, 255, 0, 0.4)`;
        this.ctx.beginPath();
        b.trail.forEach((pos, idx) => {
          if (idx === 0) this.ctx.moveTo(pos.x, pos.y);
          else this.ctx.lineTo(pos.x, pos.y);
        });
        this.ctx.stroke();
        this.ctx.fillStyle = COLORS.BULLET;
        this.ctx.beginPath();
        this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });

    this.enemies.forEach(e => {
      const x = e.x + e.shakeX;
      const y = e.y + e.shakeY;
      const arch = ENEMY_ARCHETYPES[e.type];
      this.ctx.fillStyle = e.hitFlash > 0.45 ? "white" : e.color;
      if (e.type === EnemyType.BOSS) {
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = e.color;
      }
      this.ctx.beginPath();
      const s = arch.sides;
      for (let i = 0; i < s; i++) {
        const a = ((Math.PI * 2) / s) * i;
        const px = x + e.size * Math.cos(a);
        const py = y + e.size * Math.sin(a);
        if (i === 0) this.ctx.moveTo(px, py);
        else this.ctx.lineTo(px, py);
      }
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
      const barW = e.size * 1.5;
      const barH = 5;
      this.ctx.fillStyle = "rgba(0,0,0,0.6)";
      this.ctx.fillRect(x - barW / 2, y - e.size - 15, barW, barH);
      const hpRatio = Math.max(0, e.hp / e.maxHp);
      this.ctx.fillStyle = e.color;
      this.ctx.fillRect(x - barW / 2, y - e.size - 15, barW * hpRatio, barH);
      if (e.type !== EnemyType.BOSS) {
        this.ctx.fillStyle = "white";
        this.ctx.font = "900 18px Monospace";
        this.ctx.textAlign = "center";
        this.ctx.fillText(BalanceController.formatValue(e.hp), x, y + 6);
      }
    });

    this.ctx.textAlign = "center";
    this.damageNumbers.forEach(dn => {
      this.ctx.globalAlpha = dn.life / dn.maxLife;
      this.ctx.font = dn.isCrit ? "900 32px Monospace" : "800 20px Monospace";
      this.ctx.fillStyle = dn.color;
      this.ctx.fillText(dn.text, dn.x, dn.y);
    });
    this.ctx.globalAlpha = 1;

    // 玩家视觉补强：光晕与无敌闪烁
    const pc = this.player.weaponMode === WeaponMode.BLACK_HOLE ? "#bf00ff" : COLORS.PLAYER;
    const isInvincible = this.player.invincibleTimer > 0;
    const flicker = isInvincible ? Math.sin(Date.now() * 0.05) * 0.35 + 0.65 : 1.0;

    this.ctx.globalAlpha = flicker;
    this.ctx.shadowBlur = 20;
    this.ctx.shadowColor = pc;
    this.ctx.fillStyle = pc;
    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = "white";
    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y, this.player.radius * 0.45, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1.0;

    if (this.mercyBoost > 0) {
      this.ctx.fillStyle = "#ff0000";
      this.ctx.font = "bold 12px Orbitron";
      this.ctx.textAlign = "center";
      this.ctx.fillText(`OVERLOAD: +${Math.round(this.mercyBoost * 100)}%`, this.player.x, this.player.y + 35);
    }

    this.drawHeartUI();
    this.ctx.restore();
  }
}
