type Handler<T = unknown> = (data?: T) => void;

class EventBus {
  private events: Map<string, Handler[]> = new Map();

  on<T>(event: string, handler: Handler<T>) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)?.push(handler as Handler);
  }

  off<T>(event: string, handler: Handler<T>) {
    const handlers = this.events.get(event);
    if (handlers) {
      this.events.set(
        event,
        handlers.filter(h => h !== (handler as Handler))
      );
    }
  }

  emit<T>(event: string, data?: T) {
    this.events.get(event)?.forEach(handler => handler(data));
  }
}

export const eventBus = new EventBus();

// 事件名称常量定义
export const EVENTS = {
  SCORE_UPDATED: "SCORE_UPDATED",
  EXP_UPDATED: "EXP_UPDATED",
  LEVEL_UP: "LEVEL_UP",
  GAME_OVER: "GAME_OVER",
  TRIGGER_SOUND: "TRIGGER_SOUND",
  SHAKE_SCREEN: "SHAKE_SCREEN",
  ENEMY_KILLED: "ENEMY_KILLED"
};
