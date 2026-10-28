// Hands out the next unique enquiry reference (ENQ-YYYYMMDD-NNN, Singapore date) from the database.
import { sb, sbReady } from './_sb.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });
  if (!sbReady()) return res.status(503).json({ ok: false, error: 'not_configured' });
  try {
    const ref = await sb('rpc/next_enquiry_ref', { method: 'POST', body: {} });
    if (typeof ref !== 'string' || !/^ENQ-\d{8}-\d{3}$/.test(ref)) throw new Error('bad ref');
    return res.status(200).json({ ok: true, ref });
  } catch (e) {
    console.error('ref error', e.message);
    return res.status(502).json({ ok: false, error: 'ref_failed' });
  }
}
