import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';

export interface LevelData {
  grid: string[][];
  difficulty: number;
  estimatedTime: number;
  coins: number;
  description: string;
}

interface GameCanvasProps {
  level: LevelData;
  onComplete: (stats: { time: number; coins: number; moves: number }) => void;
}

const TILE_SIZE = 48;

export const GameCanvas = ({ level, onComplete }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
  const [collectedCoins, setCollectedCoins] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [startTime] = useState(Date.now());
  const [gameState, setGameState] = useState<'playing' | 'won'>('playing');

  // Find player spawn position
  useEffect(() => {
    for (let y = 0; y < level.grid.length; y++) {
      for (let x = 0; x < level.grid[y].length; x++) {
        if (level.grid[y][x] === 'player') {
          setPlayerPos({ x, y });
          return;
        }
      }
    }
  }, [level]);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw tiles
    level.grid.forEach((row, y) => {
      row.forEach((tile, x) => {
        const tileX = x * TILE_SIZE;
        const tileY = y * TILE_SIZE;

        switch (tile) {
          case 'wall':
            ctx.fillStyle = 'hsl(220, 20%, 25%)';
            ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = 'hsl(220, 20%, 35%)';
            ctx.strokeRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
            break;
          case 'coin':
            if (!collectedCoins.has(`${x},${y}`)) {
              ctx.fillStyle = 'hsl(140, 70%, 55%)';
              ctx.beginPath();
              ctx.arc(tileX + TILE_SIZE / 2, tileY + TILE_SIZE / 2, 12, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = 'hsl(140, 70%, 70%)';
              ctx.lineWidth = 2;
              ctx.stroke();
            }
            break;
          case 'spike':
            ctx.fillStyle = 'hsl(0, 72%, 55%)';
            ctx.beginPath();
            ctx.moveTo(tileX + TILE_SIZE / 2, tileY + 10);
            ctx.lineTo(tileX + TILE_SIZE - 10, tileY + TILE_SIZE - 10);
            ctx.lineTo(tileX + 10, tileY + TILE_SIZE - 10);
            ctx.closePath();
            ctx.fill();
            break;
          case 'goal':
            ctx.fillStyle = 'hsl(190, 85%, 55%)';
            ctx.fillRect(tileX + 10, tileY + 10, TILE_SIZE - 20, TILE_SIZE - 20);
            ctx.strokeStyle = 'hsl(190, 85%, 70%)';
            ctx.lineWidth = 3;
            ctx.strokeRect(tileX + 10, tileY + 10, TILE_SIZE - 20, TILE_SIZE - 20);
            break;
        }
      });
    });

    // Draw player
    const gradient = ctx.createRadialGradient(
      playerPos.x * TILE_SIZE + TILE_SIZE / 2,
      playerPos.y * TILE_SIZE + TILE_SIZE / 2,
      5,
      playerPos.x * TILE_SIZE + TILE_SIZE / 2,
      playerPos.y * TILE_SIZE + TILE_SIZE / 2,
      18
    );
    gradient.addColorStop(0, 'hsl(280, 85%, 75%)');
    gradient.addColorStop(1, 'hsl(280, 85%, 55%)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(
      playerPos.x * TILE_SIZE + TILE_SIZE / 2,
      playerPos.y * TILE_SIZE + TILE_SIZE / 2,
      18,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.strokeStyle = 'hsl(280, 85%, 85%)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [level, playerPos, collectedCoins]);

  // Handle keyboard input
  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      let newX = playerPos.x;
      let newY = playerPos.y;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          newY--;
          break;
        case 'ArrowDown':
        case 's':
          newY++;
          break;
        case 'ArrowLeft':
        case 'a':
          newX--;
          break;
        case 'ArrowRight':
        case 'd':
          newX++;
          break;
        default:
          return;
      }

      // Check bounds
      if (newX < 0 || newX >= level.grid[0].length || newY < 0 || newY >= level.grid.length) {
        return;
      }

      const tile = level.grid[newY][newX];

      // Check wall collision
      if (tile === 'wall') return;

      // Move player
      setPlayerPos({ x: newX, y: newY });
      setMoves(m => m + 1);

      // Check coin collection
      if (tile === 'coin') {
        setCollectedCoins(prev => new Set(prev).add(`${newX},${newY}`));
      }

      // Check goal
      if (tile === 'goal') {
        const time = (Date.now() - startTime) / 1000;
        setGameState('won');
        onComplete({
          time,
          coins: collectedCoins.size,
          moves: moves + 1
        });
      }

      // Check spike (death - could reset or end game)
      if (tile === 'spike') {
        // Reset to spawn for now
        for (let y = 0; y < level.grid.length; y++) {
          for (let x = 0; x < level.grid[y].length; x++) {
            if (level.grid[y][x] === 'player') {
              setPlayerPos({ x, y });
              return;
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerPos, level, gameState, moves, collectedCoins, startTime, onComplete]);

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-6 text-sm font-medium">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Coins:</span>
            <span className="text-accent">{collectedCoins.size}/{level.coins}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Moves:</span>
            <span className="text-primary">{moves}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Time:</span>
            <span className="text-secondary">
              {Math.floor((Date.now() - startTime) / 1000)}s
            </span>
          </div>
        </div>
        <canvas
          ref={canvasRef}
          width={level.grid[0].length * TILE_SIZE}
          height={level.grid.length * TILE_SIZE}
          className="border-2 border-primary/30 rounded-lg shadow-[var(--shadow-game)]"
          style={{
            boxShadow: 'var(--shadow-neon)',
          }}
        />
        <p className="text-xs text-muted-foreground">
          Use arrow keys or WASD to move • Reach the blue goal
        </p>
      </div>
    </Card>
  );
};