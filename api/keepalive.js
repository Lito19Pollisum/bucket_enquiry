// Called daily by a Vercel cron (vercel.json) so the free Supabase project never auto-pauses from inactivity.
import { sb, sbReady } from './_sb.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!sbReady()) return res.status(503).json({ ok: false });
  try {
    await sb('enquiries?select=id&limit=1');
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('keepalive failed', e.message);
    return res.status(502).json({ ok: false });
  }
}
