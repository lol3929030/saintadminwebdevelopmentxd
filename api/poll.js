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
      error: 'Missing Supabase environment variables'
    });
  }

  try {
    const { gameId } = req.query || {};

    if (!gameId) {
      return res.status(400).json({ error: 'Missing gameId' });
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/execution_queue?game_id=eq.${encodeURIComponent(gameId)}&status=eq.pending&order=created_at.asc&limit=1`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase error:', errorText);
      return res.status(500).json({ error: 'Database error: ' + errorText });
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return res.status(200).json({ pending: false });
    }

    const item = data[0];

    await fetch(`${supabaseUrl}/rest/v1/execution_queue?id=eq.${item.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ status: 'executing' })
    });

    return res.status(200).json({
      pending: true,
      id: item.id,
      code: item.code
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
