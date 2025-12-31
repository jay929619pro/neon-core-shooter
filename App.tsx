
import React, { useEffect, useRef, useState } from 'react';
import { GameState, UpgradeOption, UpgradeTag } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, UPGRADE_POOL } from './constants';
import { GameEngine } from './gameEngine';
import { eventBus, EVENTS } from './eventBus';
import { BalanceController } from './gameData';

// 补全：霓虹音效管理器
class SoundManager {
  private audioCtx: AudioContext | null = null;

  private init() {
    if (!this.audioCtx) this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  public play(type: string) {
    this.init();
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch(type) {
      case 'fire':
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(); osc.stop(now + 0.1);
        break;
      case 'kill':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(); osc.stop(now + 0.2);
        break;
      case 'explosion':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(); osc.stop(now + 0.4);
        break;
      case 'volt':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(3000, now + 0.05);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.05);
        osc.start(); osc.stop(now + 0.05);
        break;
      case 'levelup':
        osc.type = 'sine';
        [440, 554, 659, 880].forEach((f, i) => {
          osc.frequency.setValueAtTime(f, now + i * 0.1);
        });
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(); osc.stop(now + 0.5);
        break;
      case 'evo':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 1.0);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 1.2);
        osc.start(); osc.stop(now + 1.2);
        break;
    }
  }
}

const soundManager = new SoundManager();

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [level, setLevel] = useState(1);
  const [exp, setExp] = useState(0);
  const [maxExp, setMaxExp] = useState(100);
  const [score, setScore] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [availableUpgrades, setAvailableUpgrades] = useState<UpgradeOption[]>([]);

  useEffect(() => {
    if (displayScore < score) {
      const diff = score - displayScore;
      const step = Math.max(1, Math.ceil(diff / 8));
      const timer = setTimeout(() => setDisplayScore(displayScore + step), 20);
      return () => clearTimeout(timer);
    }
  }, [score, displayScore]);

  useEffect(() => {
    const onScoreUpdate = (s: number) => setScore(s);
    const onLevelUp = (l: number) => {
      setLevel(l);
      setGameState(GameState.UPGRADING);
      const shuffled = [...UPGRADE_POOL].sort(() => 0.5 - Math.random());
      setAvailableUpgrades(shuffled.slice(0, 3));
    };
    const onExpUpdate = (data: {exp: number, maxExp: number}) => {
      setExp(data.exp);
      setMaxExp(data.maxExp);
    };
    const onGameOver = () => {
      soundManager.play('explosion');
      setGameState(GameState.GAME_OVER);
    };
    const onSoundTrigger = (type: string) => soundManager.play(type);

    eventBus.on(EVENTS.SCORE_UPDATED, onScoreUpdate);
    eventBus.on(EVENTS.LEVEL_UP, onLevelUp);
    eventBus.on(EVENTS.EXP_UPDATED, onExpUpdate);
    eventBus.on(EVENTS.GAME_OVER, onGameOver);
    eventBus.on(EVENTS.TRIGGER_SOUND, onSoundTrigger);

    if (canvasRef.current && !engineRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) engineRef.current = new GameEngine(ctx);
    }

    return () => {
      eventBus.off(EVENTS.SCORE_UPDATED, onScoreUpdate);
      eventBus.off(EVENTS.LEVEL_UP, onLevelUp);
      eventBus.off(EVENTS.EXP_UPDATED, onExpUpdate);
      eventBus.off(EVENTS.GAME_OVER, onGameOver);
      eventBus.off(EVENTS.TRIGGER_SOUND, onSoundTrigger);
    };
  }, []);

  const handleUpgradeSelect = (upgrade: UpgradeOption) => {
    if (engineRef.current) {
      engineRef.current.applyUpgrade(upgrade);
      setGameState(GameState.PLAYING);
      engineRef.current.resume();
      soundManager.play('levelup');
    }
  };

  const startGame = () => {
    setGameState(GameState.PLAYING);
    setScore(0); setDisplayScore(0); setLevel(1); setExp(0); setMaxExp(BalanceController.getXPRequired(1));
    if (engineRef.current) {
      engineRef.current.reset();
      engineRef.current.start();
    }
  };

  const getTagStyle = (tag: UpgradeTag) => {
    switch(tag) {
      case UpgradeTag.ENERGY: return 'bg-[#00d4ff]/20 text-[#00d4ff] border-[#00d4ff]/40 shadow-[0_0_10px_#00d4ff]';
      case UpgradeTag.BLAST: return 'bg-[#ff6600]/20 text-[#ff6600] border-[#ff6600]/40 shadow-[0_0_10px_#ff6600]';
      case UpgradeTag.KINETIC: return 'bg-[#00ff00]/20 text-[#00ff00] border-[#00ff00]/40 shadow-[0_0_10px_#00ff00]';
      case UpgradeTag.VITALITY: return 'bg-[#ff0044]/20 text-[#ff0044] border-[#ff0044]/40 shadow-[0_0_10px_#ff0044]';
      default: return 'bg-white/10 text-white border-white/20';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] p-0 font-sans text-neutral-200 overflow-hidden">
      <div className="relative border-0 sm:border border-white/5 rounded-none sm:rounded-[2.5rem] overflow-hidden aspect-[9/16] h-screen sm:h-[92vh] max-w-full bg-[#0a0a0a] shadow-[0_0_80px_rgba(0,0,0,0.8)]">
        <canvas 
          ref={canvasRef} 
          width={CANVAS_WIDTH} 
          height={CANVAS_HEIGHT} 
          className="h-full w-auto block bg-[#0a0a0a] mx-auto cursor-none" 
        />

        {gameState !== GameState.START && (
          <div className="absolute top-0 left-0 w-full p-8 pointer-events-none flex flex-col gap-5 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-[10px] text-white/30 tracking-[0.4em] font-black uppercase mb-1 orbitron">LEVEL // 等级</span>
                <span className="text-4xl font-black text-[#00d4ff] leading-none drop-shadow-[0_0_12px_#00d4ff] orbitron">{level}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-white/30 tracking-[0.4em] font-black uppercase mb-1 orbitron">SCORE // 积分</span>
                <span className="text-4xl font-black text-white leading-none tabular-nums drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] orbitron">{BalanceController.formatValue(displayScore)}</span>
              </div>
            </div>
            <div className="flex gap-1.5 h-2 w-full">
               {[...Array(10)].map((_, i) => (
                 <div 
                   key={i} 
                   className={`flex-1 rounded-full transition-all duration-500 ${ (exp/maxExp)*10 > i ? 'bg-[#00ff00] shadow-[0_0_10px_#00ff00]' : 'bg-white/5' }`} 
                 />
               ))}
            </div>
          </div>
        )}

        {gameState === GameState.START && (
          <div className="absolute inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center text-center p-12 z-20">
            <div className="mb-14 relative">
              <div className="w-28 h-28 rounded-full border-2 border-[#00d4ff]/30 shadow-[0_0_40px_rgba(0,212,255,0.2)] flex items-center justify-center animate-pulse">
                <div className="w-16 h-16 rounded-full bg-[#00d4ff] shadow-[0_0_60px_#00d4ff] opacity-90" />
              </div>
            </div>
            <h1 className="text-6xl font-black text-white orbitron mb-4 tracking-tighter italic">
              NEON<span className="text-[#00d4ff]">CORE</span>
            </h1>
            <p className="text-white/20 mb-24 orbitron text-[10px] tracking-[0.8em] font-bold">协议版本 2.5 // 深度进化</p>
            <button 
              onClick={startGame} 
              className="group relative px-24 py-7 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/20 orbitron font-black transition-all transform active:scale-90 text-xl overflow-hidden shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00d4ff]/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              (初始化核心)
            </button>
          </div>
        )}

        {gameState === GameState.UPGRADING && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[16px] flex flex-col items-center justify-center p-10 z-30 animate-in fade-in duration-500">
            <div className="text-[#00ff00] orbitron text-[10px] mb-3 tracking-[0.5em] font-black drop-shadow-[0_0_8px_#00ff00]">检测到核心过热：触发进化冗余</div>
            <h2 className="text-4xl font-black text-white orbitron mb-14 italic border-b border-white/10 pb-6 w-full text-center">强化序列 // UPGRADE</h2>
            
            <div className="space-y-6 w-full">
              {availableUpgrades.map((upgrade, idx) => (
                <button
                  key={idx}
                  onClick={() => handleUpgradeSelect(upgrade)}
                  style={{ 
                    animationDelay: `${idx * 120}ms`, 
                    transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' 
                  }}
                  className="w-full group bg-white/5 border border-white/10 hover:border-[#00d4ff]/50 p-7 rounded-[2rem] flex items-center gap-7 transition-all hover:scale-[1.06] active:scale-95 animate-in slide-in-from-bottom-12 shadow-2xl"
                >
                  <div className="text-6xl group-hover:drop-shadow-[0_0_20px_rgba(255,255,255,0.6)] transition-all duration-500 transform group-hover:rotate-6">
                    {upgrade.icon}
                  </div>
                  <div className="text-left flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white text-2xl font-black group-hover:text-[#00d4ff] transition-colors italic">{upgrade.title}</h3>
                      <span className={`text-[10px] px-2.5 py-1 border rounded-lg font-black tracking-widest ${getTagStyle(upgrade.tag)}`}>
                        {upgrade.tag}
                      </span>
                    </div>
                    <p className="text-white/40 text-sm font-medium leading-relaxed">{upgrade.description}</p>
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-20 text-white/20 text-[10px] orbitron tracking-[0.6em] animate-pulse italic font-bold">等待生物特征确认...</p>
          </div>
        )}

        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center text-center p-14 z-40 animate-in fade-in duration-1000">
            <h2 className="text-6xl font-black text-white orbitron mb-3 tracking-tighter italic drop-shadow-[0_0_20px_rgba(255,0,0,0.5)]">核心崩溃</h2>
            <p className="text-red-500 orbitron text-[11px] mb-20 tracking-[0.6em] font-black animate-pulse">CRITICAL_SYSTEM_FAILURE</p>
            <div className="bg-white/5 border border-white/10 p-14 rounded-[3rem] mb-24 w-full relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-600/50" />
                <div className="text-white/30 text-[10px] orbitron mb-4 tracking-[0.5em] font-black">同步最终分值</div>
                <div className="text-6xl font-black text-white orbitron leading-none drop-shadow-[0_0_40px_rgba(255,255,255,0.2)]">{BalanceController.formatValue(score)}</div>
            </div>
            <button 
              onClick={startGame} 
              className="px-24 py-7 bg-white text-black orbitron font-black transition-all transform hover:scale-110 active:scale-90 text-2xl rounded-2xl shadow-[0_0_60px_rgba(255,255,255,0.4)]"
            >
              重置核心
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
