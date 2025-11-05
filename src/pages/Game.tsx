import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { GameCanvas, LevelData } from '@/components/game/GameCanvas';
import { LevelCard } from '@/components/game/LevelCard';
import { StatsPanel } from '@/components/game/StatsPanel';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Sparkles, LogOut } from 'lucide-react';
import { Session } from '@supabase/supabase-js';

export default function Game() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentLevel, setCurrentLevel] = useState<LevelData | null>(null);
  const [generatedLevels, setGeneratedLevels] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
        return;
      }
      setSession(session);
      loadData(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
        return;
      }
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadData = async (userId: string) => {
    // Load generated levels
    const { data: levels } = await supabase
      .from('generated_levels')
      .select('*')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(10);

    if (levels) setGeneratedLevels(levels);

    // Load stats
    const { data: statsData } = await supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (statsData) setStats(statsData);
  };

  const handleLevelComplete = async (completionStats: { time: number; coins: number; moves: number }) => {
    if (!session?.user || !currentLevel) return;

    // Save session data
    await supabase.from('game_sessions').insert({
      user_id: session.user.id,
      level_id: generatedLevels[0]?.id || 0,
      completion_time: completionStats.time,
      coins_collected: completionStats.coins,
      moves_made: completionStats.moves,
      difficulty_rating: currentLevel.difficulty,
      completed: true,
    });

    toast({
      title: 'Level Complete!',
      description: `Time: ${completionStats.time.toFixed(1)}s | Coins: ${completionStats.coins}/${currentLevel.coins}`,
    });

    setCurrentLevel(null);
    loadData(session.user.id);
  };

  const generateNewLevel = async () => {
    if (!session) return;

    setGenerating(true);
    try {
      const sessionData = {
        time: stats?.avg_completion_time || 30,
        coins: stats?.avg_coins || 5,
        moves: 50,
      };

      const { data, error } = await supabase.functions.invoke('generate-level', {
        body: { sessionData },
      });

      if (error) throw error;

      toast({
        title: 'New Level Generated!',
        description: 'AI created a level based on your performance',
      });

      setCurrentLevel(data.level);
      loadData(session.user.id);
    } catch (error) {
      console.error('Error generating level:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate level',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/')}
              className="border-border"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                AI Level Generator
              </h1>
              <p className="text-muted-foreground">Adaptive puzzle platformer</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="gap-2 border-border"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        <StatsPanel stats={stats} />

        {currentLevel ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Current Level</h2>
              <Button
                variant="outline"
                onClick={() => setCurrentLevel(null)}
                className="border-border"
              >
                Back to Menu
              </Button>
            </div>
            <GameCanvas level={currentLevel} onComplete={handleLevelComplete} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your Levels</h2>
              <Button
                onClick={generateNewLevel}
                disabled={generating}
                className="gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
              >
                <Sparkles className="w-4 h-4" />
                {generating ? 'Generating...' : 'Generate AI Level'}
              </Button>
            </div>

            {generatedLevels.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <p className="text-muted-foreground">No levels yet! Generate your first AI level.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedLevels.map((level) => (
                  <LevelCard
                    key={level.id}
                    level={level}
                    onSelect={() => setCurrentLevel(level.level_data)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}