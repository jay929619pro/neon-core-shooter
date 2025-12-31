export interface PlayerProfile {
  highScore: number;
  totalGamesPlayed: number;
  totalKills: number;
  version: number;
}

const STORAGE_KEY = "NEON_CORE_PROFILE_V1";

const DEFAULT_PROFILE: PlayerProfile = {
  highScore: 0,
  totalGamesPlayed: 0,
  totalKills: 0,
  version: 1
};

export class PersistenceManager {
  static load(): PlayerProfile {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_PROFILE };

      const parsed = JSON.parse(raw);
      // 简单的版本迁移检查 (未来可扩展)
      return { ...DEFAULT_PROFILE, ...parsed };
    } catch (e) {
      console.warn("Failed to load save data", e);
      return { ...DEFAULT_PROFILE };
    }
  }

  static save(profile: PlayerProfile) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn("Failed to save data", e);
    }
  }

  static updateHighScore(currentScore: number): boolean {
    const profile = this.load();
    if (currentScore > profile.highScore) {
      profile.highScore = currentScore;
      this.save(profile);
      return true;
    }
    return false;
  }

  static incrementStats(kills: number = 0) {
    const profile = this.load();
    profile.totalGamesPlayed++;
    profile.totalKills += kills;
    this.save(profile);
  }
}
