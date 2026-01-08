import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, success } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Missing execution id' });
    }

    const { error } = await supabase
      .from('execution_queue')
      .update({
        status: success ? 'completed' : 'failed',
        executed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to update status' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
