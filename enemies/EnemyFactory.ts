import { EnemyType, Enemy as EnemyData } from "../types";
import { ENEMY_ARCHETYPES, BalanceController } from "../gameData";
import { BaseEnemy } from "./BaseEnemy";
import { BasicEnemy } from "./BasicEnemy";
import { ChargerEnemy } from "./ChargerEnemy";
import { ShooterEnemy } from "./ShooterEnemy";
import { SplitterEnemy } from "./SplitterEnemy";
import { BossEnemy } from "./BossEnemy";
import { HealerEnemy } from "./HealerEnemy";
import { KamikazeEnemy } from "./KamikazeEnemy";
import { ShielderEnemy } from "./ShielderEnemy";
import { SniperEnemy } from "./SniperEnemy";
import { SummonerEnemy } from "./SummonerEnemy";

export class EnemyFactory {
  static createEnemy(type: EnemyType, level: number, canvasWidth: number): BaseEnemy {
    const arch = ENEMY_ARCHETYPES[type];
    const hp = BalanceController.getEnemyHP(type, level);

    let x = arch.size + Math.random() * (canvasWidth - arch.size * 2);
    let y = -arch.size;

    // Special spawn for Boss
    let variant: "core" | "sentinel" | "hive" | "phantom" | "colossus" | "tempest" | "weaver" | "singularity" | undefined;
    if (type === EnemyType.BOSS) {
      x = canvasWidth / 2;
      y = -150;
      if (level <= 5) variant = "core";
      else if (level <= 10) variant = "sentinel";
      else if (level <= 15) variant = "hive";
      else if (level <= 20) variant = "phantom";
      else if (level <= 25) variant = "colossus";
      else if (level <= 30) variant = "tempest";
      else if (level <= 35) variant = "weaver";
      else variant = "singularity";
    }

    const data: EnemyData = {
      type,
      x,
      y,
      hp,
      maxHp: hp,
      size: arch.size,
      color:
        variant === "core"
          ? "#ff8800"
          : variant === "sentinel"
          ? "#00ffff"
          : variant === "hive"
          ? "#aa00aa"
          : variant === "colossus"
          ? "#ff0000"
          : variant === "phantom"
          ? "#cccccc"
          : variant === "tempest"
          ? "#000088" // Dark Blue
          : variant === "weaver"
          ? "#00ff00" // Green
          : variant === "singularity"
          ? "#000000" // Black (with stroke)
          : arch.color,
      shakeX: 0,
      shakeY: 0,
      hitFlash: 0,
      speed: arch.speedBase + (type === EnemyType.BOSS ? 0 : Math.random() * 2),
      cooldown: type === EnemyType.BOSS ? 60 : 0,
      bossVariant: variant
    };

    switch (type) {
      case EnemyType.BASIC:
        return new BasicEnemy(data);
      case EnemyType.CHARGER:
        return new ChargerEnemy(data);
      case EnemyType.SHOOTER:
        return new ShooterEnemy(data);
      case EnemyType.SPLITTER:
        return new SplitterEnemy(data);
      case EnemyType.BOSS:
        return new BossEnemy(data);
      case EnemyType.HEALER:
        return new HealerEnemy(data);
      case EnemyType.KAMIKAZE:
        return new KamikazeEnemy(data);
      case EnemyType.SHIELDER:
        return new ShielderEnemy(data);
      case EnemyType.SNIPER:
        return new SniperEnemy(data);
      case EnemyType.SUMMONER:
        return new SummonerEnemy(data);
      default:
        return new BasicEnemy(data);
    }
  }

  static createSplitterMinion(parentX: number, parentY: number, level: number, offset: number): BaseEnemy {
    // Reuse BasicEnemy logic for splits but with custom stats
    const subHp = BalanceController.getEnemyHP(EnemyType.BASIC, level) * 0.7;
    const data: EnemyData = {
      type: EnemyType.BASIC,
      x: parentX + offset,
      y: parentY,
      hp: subHp,
      maxHp: subHp,
      size: 24,
      color: ENEMY_ARCHETYPES[EnemyType.BASIC].color,
      shakeX: 0,
      shakeY: 0,
      hitFlash: 0,
      speed: 4
    };
    return new BasicEnemy(data);
  }
}
