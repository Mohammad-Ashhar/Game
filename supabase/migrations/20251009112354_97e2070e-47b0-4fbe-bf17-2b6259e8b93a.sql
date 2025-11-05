-- Fix security definer view by creating a regular view
DROP VIEW IF EXISTS public.player_stats;

CREATE VIEW public.player_stats
WITH (security_invoker = true)
AS
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