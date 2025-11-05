import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Coins, Target } from 'lucide-react';

interface LevelCardProps {
  level: {
    id: number;
    difficulty: number;
    level_data: {
      description: string;
      estimatedTime: number;
      coins: number;
    };
  };
  onSelect: () => void;
}

export const LevelCard = ({ level, onSelect }: LevelCardProps) => {
  const getDifficultyColor = (diff: number) => {
    if (diff <= 2) return 'bg-accent';
    if (diff <= 3) return 'bg-secondary';
    return 'bg-destructive';
  };

  const getDifficultyLabel = (diff: number) => {
    if (diff <= 2) return 'Easy';
    if (diff <= 3) return 'Medium';
    return 'Hard';
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-card to-card/50 border-border hover:border-primary/50 transition-all duration-300 hover:shadow-[var(--shadow-neon)] animate-slide-up">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">Level #{level.id}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {level.level_data.description}
            </p>
          </div>
          <Badge className={getDifficultyColor(level.difficulty)}>
            {getDifficultyLabel(level.difficulty)}
          </Badge>
        </div>
        
        <div className="flex gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>~{level.level_data.estimatedTime}s</span>
          </div>
          <div className="flex items-center gap-1">
            <Coins className="w-3 h-3 text-accent" />
            <span>{level.level_data.coins}</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3 text-primary" />
            <span>Difficulty {level.difficulty}</span>
          </div>
        </div>

        <Button 
          onClick={onSelect}
          className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all"
        >
          Play Level
        </Button>
      </div>
    </Card>
  );
};