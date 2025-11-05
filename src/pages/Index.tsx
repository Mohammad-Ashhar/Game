import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Gamepad2, Brain, TrendingUp, Zap, ArrowRight } from 'lucide-react';
import { Session } from '@supabase/supabase-js';

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        navigate('/game');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        navigate('/game');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Generation',
      description: 'Levels adapt to your skill using machine learning algorithms',
    },
    {
      icon: TrendingUp,
      title: 'Performance Tracking',
      description: 'Monitor your progress with detailed stats and analytics',
    },
    {
      icon: Zap,
      title: 'Dynamic Difficulty',
      description: 'Experience perfectly balanced challenges that match your ability',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        {/* Hero Section */}
        <div className="text-center space-y-6 pt-12 animate-slide-up">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
            <Gamepad2 className="w-5 h-5 text-primary animate-glow" />
            <span className="text-sm font-medium text-primary">AI-Generated Game Levels</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold">
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Level Up
            </span>
            <br />
            <span className="text-foreground">Your Gaming Experience</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience intelligent game level generation powered by AI. Each level adapts to your performance, creating the perfect challenge every time.
          </p>

          <div className="flex gap-4 justify-center pt-4">
            <Button
              onClick={() => navigate('/auth')}
              size="lg"
              className="gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all text-lg px-8 shadow-[var(--shadow-neon)]"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              onClick={() => navigate('/auth')}
              variant="outline"
              size="lg"
              className="gap-2 border-border hover:border-primary transition-all text-lg px-8"
            >
              <Gamepad2 className="w-5 h-5" />
              Play Demo
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              className="p-6 bg-gradient-to-br from-card to-card/50 border-border hover:border-primary/50 transition-all duration-300 hover:shadow-[var(--shadow-neon)] animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="space-y-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* How It Works */}
        <div className="space-y-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            How It <span className="text-primary">Works</span>
          </h2>
          
          <div className="grid md:grid-cols-4 gap-6 pt-6">
            {[
              { step: '1', title: 'Play Levels', desc: 'Start with initial challenges' },
              { step: '2', title: 'Track Performance', desc: 'AI analyzes your gameplay' },
              { step: '3', title: 'Generate Levels', desc: 'AI creates perfect difficulty' },
              { step: '4', title: 'Improve Skills', desc: 'Master progressively harder levels' },
            ].map((item, i) => (
              <div key={item.step} className="space-y-3">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-[var(--shadow-neon)]">
                  {item.step}
                </div>
                <h4 className="font-semibold text-foreground">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <Card className="p-12 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Ready to Experience AI Gaming?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join now and let AI create the perfect gaming experience tailored just for you.
          </p>
          <Button
            onClick={() => navigate('/auth')}
            size="lg"
            className="gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all text-lg px-12 shadow-[var(--shadow-neon)]"
          >
            Start Playing
            <ArrowRight className="w-5 h-5" />
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Index;