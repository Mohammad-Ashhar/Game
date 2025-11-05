-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Game performance tracking table
CREATE TABLE public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  level_id INTEGER NOT NULL,
  completion_time NUMERIC NOT NULL,
  coins_collected INTEGER DEFAULT 0,
  moves_made INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  difficulty_rating NUMERIC DEFAULT 1.0,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.game_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.game_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Generated levels table
CREATE TABLE public.generated_levels (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  level_data JSONB NOT NULL,
  difficulty NUMERIC DEFAULT 1.0,
  predicted_performance JSONB,
  generated_at TIMESTAMPTZ DEFAULT now(),
  based_on_session UUID REFERENCES public.game_sessions(id)
);

ALTER TABLE public.generated_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own levels"
  ON public.generated_levels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own levels"
  ON public.generated_levels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Player stats aggregate view
CREATE VIEW public.player_stats AS
SELECT 
  user_id,
  COUNT(*) as total_sessions,
  AVG(completion_time) as avg_completion_time,
  AVG(coins_collected) as avg_coins,
  AVG(moves_made) as avg_moves,
  SUM(CASE WHEN completed THEN 1 ELSE 0 END) as completed_levels,
  AVG(difficulty_rating) as avg_difficulty
FROM public.game_sessions
GROUP BY user_id;

-- Create indexes for performance
CREATE INDEX idx_game_sessions_user ON public.game_sessions(user_id);
CREATE INDEX idx_generated_levels_user ON public.generated_levels(user_id);
CREATE INDEX idx_game_sessions_created ON public.game_sessions(created_at DESC);