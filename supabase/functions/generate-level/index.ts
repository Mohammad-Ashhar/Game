import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionData } = await req.json();
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error('Unauthorized');

    // Get user's performance history
    const { data: sessions } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Prepare AI prompt with performance data
    const performanceContext = sessions?.map(s => ({
      time: s.completion_time,
      coins: s.coins_collected,
      moves: s.moves_made,
      difficulty: s.difficulty_rating,
      completed: s.completed
    })) || [];

    const avgTime = performanceContext.reduce((a, b) => a + parseFloat(b.time), 0) / (performanceContext.length || 1);
    const avgCoins = performanceContext.reduce((a, b) => a + b.coins, 0) / (performanceContext.length || 1);
    const completionRate = performanceContext.filter(s => s.completed).length / (performanceContext.length || 1);

    const prompt = `You are an AI game level designer. Generate a challenging puzzle platformer level based on player performance.

Player Stats:
- Average completion time: ${avgTime.toFixed(2)}s
- Average coins collected: ${avgCoins.toFixed(0)}
- Completion rate: ${(completionRate * 100).toFixed(0)}%
- Recent performance: ${performanceContext.length} sessions

Current session data:
- Time: ${sessionData.time}s
- Coins: ${sessionData.coins}
- Moves: ${sessionData.moves}

Generate a JSON level that adapts to this player's skill. Include:
{
  "grid": 2D array (8x12) with tiles: "empty", "wall", "player", "coin", "spike", "goal"
  "difficulty": number 1-5
  "estimatedTime": seconds
  "coins": total coins
  "description": short description
}

Rules:
- One "player" spawn, one "goal"
- Difficulty should match player skill (${completionRate > 0.7 ? 'increase' : completionRate < 0.3 ? 'decrease' : 'maintain'})
- Balance challenge with achievability
- Create interesting platforming paths`;

    console.log('Sending AI request for level generation');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a game level design AI. Return only valid JSON, no markdown or explanations.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');
    
    let levelData;
    try {
      const content = aiData.choices[0].message.content;
      // Remove markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
      levelData = JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      throw new Error('Invalid AI response format');
    }

    // Store generated level
    const { data: savedLevel, error: saveError } = await supabase
      .from('generated_levels')
      .insert({
        user_id: user.id,
        level_data: levelData,
        difficulty: levelData.difficulty,
        predicted_performance: {
          estimatedTime: levelData.estimatedTime,
          coins: levelData.coins
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving level:', saveError);
      throw saveError;
    }

    console.log('Level generated and saved successfully');

    return new Response(
      JSON.stringify({ level: levelData, levelId: savedLevel.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-level function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});