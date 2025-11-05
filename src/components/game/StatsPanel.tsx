import { Card } from '@/components/ui/card';
import { Trophy, Clock, Coins, Target, TrendingUp } from 'lucide-react';

interface StatsPanelProps {
  stats: {
    total_sessions: number;
    avg_completion_time: number;
    avg_coins: number;
    completed_levels: number;
    avg_difficulty: number;
  } | null;
}

export const StatsPanel = ({ stats }: StatsPanelProps) => {
  if (!stats) {
    return (
      <Card className="p-6 bg-card border-border">
        <p className="text-muted-foreground text-center">
          Complete your first level to see stats!
        </p>
      </Card>
    );
  }

  const statItems = [
    {
      icon: Trophy,
      label: 'Completed',
      value: stats.completed_levels,
      color: 'text-accent',
    },
    {
      icon: Clock,
      label: 'Avg Time',
      value: `${stats.avg_completion_time?.toFixed(1)}s`,
      color: 'text-secondary',
    },
    {
      icon: Coins,
      label: 'Avg Coins',
      value: stats.avg_coins?.toFixed(0),
      color: 'text-accent',
    },
    {
      icon: Target,
      label: 'Avg Difficulty',
      value: stats.avg_difficulty?.toFixed(1),
      color: 'text-primary',
    },
    {
      icon: TrendingUp,
      label: 'Total Sessions',
      value: stats.total_sessions,
      color: 'text-foreground',
    },
  ];

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-primary" />
        Your Stats
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statItems.map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center gap-2 p-3 bg-background/50 rounded-lg border border-border/50"
          >
            <item.icon className={`w-5 h-5 ${item.color}`} />
            <span className="text-2xl font-bold">{item.value}</span>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};