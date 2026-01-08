export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: 'Missing Supabase environment variables. Add SUPABASE_URL and SUPABASE_ANON_KEY to Vercel.'
    });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { gameId } = req.query || {};

    if (!gameId) {
      return res.status(400).json({ error: 'Missing gameId' });
    }

    const { data, error } = await supabase
      .from('execution_queue')
      .select('id, code')
      .eq('game_id', gameId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error: ' + error.message });
    }

    if (!data) {
      return res.status(200).json({ pending: false });
    }

    await supabase
      .from('execution_queue')
      .update({ status: 'executing' })
      .eq('id', data.id);

    return res.status(200).json({
      pending: true,
      id: data.id,
      code: data.code
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
