import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

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

  try {
    const { gameId } = req.query;

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
      return res.status(500).json({ error: 'Failed to fetch pending scripts' });
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
    return res.status(500).json({ error: 'Internal server error' });
  }
}
