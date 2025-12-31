
import React, { useEffect, useRef, useState } from 'react';
import { EnemyType, GameState } from './types';
import { EnemyFactory } from './enemies/EnemyFactory';
import { BaseEnemy } from './enemies/BaseEnemy';

interface BestiaryProps {
    onBack: () => void;
}

export const Bestiary: React.FC<BestiaryProps> = ({ onBack }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedType, setSelectedType] = useState<EnemyType>(EnemyType.BASIC);
    const [bossVariant, setBossVariant] = useState<string>('core');
    const enemyRef = useRef<BaseEnemy | null>(null);
    const bulletsRef = useRef<any[]>([]);
    
    // List of enemies to show
    const enemies = [
        { label: 'Basic Probe', type: EnemyType.BASIC },
        { label: 'Charger Bot', type: EnemyType.CHARGER },
        { label: 'Shooter Drone', type: EnemyType.SHOOTER },
        { label: 'Splitter Pod', type: EnemyType.SPLITTER },
        { label: 'Healer Drone', type: EnemyType.HEALER },
        { label: 'Kamikaze', type: EnemyType.KAMIKAZE },
        { label: 'Shielder', type: EnemyType.SHIELDER },
        { label: 'Sniper', type: EnemyType.SNIPER },
        { label: 'Summoner', type: EnemyType.SUMMONER },
    ];
    
    // Boss Variants
    const bosses = [
        { label: 'The Core (Lv 5)', variant: 'core' },
        { label: 'The Sentinel (Lv 10)', variant: 'sentinel' },
        { label: 'The Hive (Lv 15)', variant: 'hive' },
        { label: 'The Phantom (Lv 20)', variant: 'phantom' },
        { label: 'The Colossus (Lv 25)', variant: 'colossus' },
        { label: 'The Tempest (Lv 30)', variant: 'tempest' },
        { label: 'The Weaver (Lv 35)', variant: 'weaver' },
        { label: 'The Singularity (Lv 40)', variant: 'singularity' },
    ];

    // Initialize Enemy
    useEffect(() => {
        let e = EnemyFactory.createEnemy(selectedType, 1, 400); // Level 1 stats for preview
        
        if (selectedType === EnemyType.BOSS) {
            // Hacky way to set variant since Factory does it by level
            // We need to re-create it manually or force level?
            // Factory logic: 
            // <=5 core, <=10 sentinel, <=15 hive, <=20 phantom, <=25 colossus, <=30 tempest, <=35 weaver, else singularity
            let level = 1;
            if (bossVariant === 'core') level = 5;
            else if (bossVariant === 'sentinel') level = 10;
            else if (bossVariant === 'hive') level = 15;
            else if (bossVariant === 'phantom') level = 20;
            else if (bossVariant === 'colossus') level = 25;
            else if (bossVariant === 'tempest') level = 30;
            else if (bossVariant === 'weaver') level = 35;
            else if (bossVariant === 'singularity') level = 40;
            
            e = EnemyFactory.createEnemy(EnemyType.BOSS, level, 400);
        }

        // Center it
        e.x = 200;
        e.y = 100;
        enemyRef.current = e;
        bulletsRef.current = [];
    }, [selectedType, bossVariant]);

    // Game Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frame = 0;
        let animId = 0;
        
        // Visual entities for Summons/Dummy targets
        const visualEntities: { x: number, y: number, size: number, color: string, life: number }[] = [];

        // If Healer, add a dummy injuried ally
        if (selectedType === EnemyType.HEALER) {
            visualEntities.push({ x: 250, y: 150, size: 20, color: '#ff0000', life: 99999 }); // Red = injured
        }

        const loop = () => {
            frame++;
            ctx.fillStyle = '#0a0a1a';
            ctx.fillRect(0, 0, 400, 400);

            // Simulation Context
            const enemy = enemyRef.current;
            if (enemy) {
                // Mock Player - Move closer for Kamikaze (range < 180)
                // Oscillate Y between 250 and 350
                const playerMock = {
                    x: 200 + Math.sin(frame * 0.02) * 80, 
                    y: 300 + Math.cos(frame * 0.03) * 50,
                    radius: 10
                };

                // Update Enemy
                enemy.update({
                    player: playerMock,
                    frameCount: frame,
                    spawnProjectile: (x, y, vx, vy, radius, damage) => {
                        bulletsRef.current.push({ x, y, vx, vy, radius, color: '#ff0055' });
                    },
                    spawnEnemy: (t, x, y) => {
                        // Add visual summon
                        visualEntities.push({ x, y, size: 15, color: '#ffff00', life: 60 });
                    },
                    enemies: visualEntities.map(v => ({
                         x: v.x, y: v.y, hp: 50, maxHp: 100, hitFlash: 0
                    } as any)) // Mock BaseEnemy for Healer
                });

                // Keep enemy in bounds for preview
                if (selectedType !== EnemyType.BOSS) {
                    if (enemy.x < 50) enemy.x = 50;
                    if (enemy.x > 350) enemy.x = 350;
                    if (enemy.y > 200) enemy.y = 200; 
                }

                // Draw Enemy
                enemy.draw(ctx);

                // Draw Visual Entities (Summons/Dummies)
                for (let i = visualEntities.length - 1; i >= 0; i--) {
                    const v = visualEntities[i];
                    ctx.strokeStyle = v.color;
                    ctx.strokeRect(v.x - v.size/2, v.y - v.size/2, v.size, v.size);
                    
                    // Simple logic: Healer heals them?
                    // We just visualize them.
                    
                    if (v.life < 9000) v.life--; // 9999 is permanent
                    if (v.life <= 0) visualEntities.splice(i, 1);
                }

                // Draw Player Mock
                ctx.fillStyle = '#00ff00';
                ctx.beginPath();
                ctx.arc(playerMock.x, playerMock.y, 8, 0, Math.PI*2);
                ctx.fill();
                ctx.strokeStyle = '#003300';
                ctx.beginPath();
                ctx.moveTo(playerMock.x, playerMock.y);
                ctx.lineTo(playerMock.x, playerMock.y - 20); // direction
                ctx.stroke();
            }

            // Update & Draw Bullets
            ctx.fillStyle = '#ff0055';
            for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
                const b = bulletsRef.current[i];
                b.x += b.vx;
                b.y += b.vy;
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
                ctx.fill();

                // [FIX] Widen bounds for Tempest rain (starts at y=-20)
                if (b.x < 0 || b.x > 400 || b.y < -50 || b.y > 450) {
                    bulletsRef.current.splice(i, 1);
                }
            }

            animId = requestAnimationFrame(loop);
        };
        animId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animId);
    }, [selectedType, bossVariant]);

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: '#050510', color: '#fff', display: 'flex', zIndex: 20
        }}>
            {/* Sidebar */}
            <div style={{ width: '250px', borderRight: '1px solid #333', overflowY: 'auto', padding: '20px' }}>
                <h2 style={{ fontFamily: 'Monospace', color: '#00ffff', marginBottom: '20px' }}>NEON DATABASE</h2>
                <button 
                    onClick={onBack}
                    style={{ 
                        width: '100%', padding: '10px', marginBottom: '20px', 
                        background: '#333', color: '#fff', border: 'none', cursor: 'pointer' 
                    }}
                >
                    &lt; BACK TO MENU
                </button>

                <h3 style={{ color: '#888', fontSize: '14px' }}>STANDARD UNITS</h3>
                {enemies.map(e => (
                    <div 
                        key={e.type}
                        onClick={() => setSelectedType(e.type)}
                        style={{
                            padding: '10px', cursor: 'pointer',
                            background: selectedType === e.type && selectedType !== EnemyType.BOSS ? '#00ffff33' : 'transparent',
                            color: selectedType === e.type && selectedType !== EnemyType.BOSS ? '#fff' : '#aaa',
                            borderBottom: '1px solid #222'
                        }}
                    >
                        {e.label}
                    </div>
                ))}

                <h3 style={{ color: '#888', fontSize: '14px', marginTop: '20px' }}>BOSS UNITS</h3>
                {bosses.map(b => (
                    <div 
                        key={b.variant}
                        onClick={() => { setSelectedType(EnemyType.BOSS); setBossVariant(b.variant); }}
                        style={{
                            padding: '10px', cursor: 'pointer',
                            background: selectedType === EnemyType.BOSS && bossVariant === b.variant ? '#ff005533' : 'transparent',
                            color: selectedType === EnemyType.BOSS && bossVariant === b.variant ? '#fff' : '#aaa',
                            borderBottom: '1px solid #222'
                        }}
                    >
                        {b.label}
                    </div>
                ))}
            </div>

            {/* Preview Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ marginBottom: '20px', fontFamily: 'Monospace', fontSize: '24px' }}>
                    SIMULATION PREVIEW
                </div>
                <canvas 
                    ref={canvasRef} 
                    width={400} 
                    height={400} 
                    style={{ border: '2px solid #333', boxShadow: '0 0 20px #000' }}
                />
                <div style={{ marginTop: '20px', color: '#666', maxWidth: '400px', textAlign: 'center' }}>
                    Observing attack patterns...
                </div>
            </div>
        </div>
    );
};
