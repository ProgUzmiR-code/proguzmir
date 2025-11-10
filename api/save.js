import { put, list } from '@vercel/blob';
export const config = { api: { bodyParser: true } };

function cleanToken(t) {
  if (!t) return null;
  return String(t).replace(/^"+|"+$/g, '').trim();
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method Not Allowed' });

    const { userId, snapshot } = req.body || {};
    if (!userId || !snapshot) return res.status(400).json({ ok:false, error:'missing userId or snapshot' });

    const rawToken = process.env.uzmirstorage_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
    const TOKEN = cleanToken(rawToken);
    if (!TOKEN) {
      console.warn('save: no token provided in env');
      // still try without token (some runtimes may use internal creds)
    }
    console.log('========================');
    console.log('[SAVE API] POST body:', req.body);
    console.log('[SAVE API] TOKEN:', TOKEN ? TOKEN.slice(0, 20) + '...' : 'NONE');
    console.log('[SAVE API] userId:', userId);
    console.log('[SAVE API] snapshot:', snapshot);
    const path = `progress/${encodeURIComponent(userId)}.json`;
    // attempt write
    try {
      await put(path, JSON.stringify(snapshot), { access: 'public', token: TOKEN });
      console.log('[SAVE API] ✅ put success:', path);
    } catch (err) {
      console.error('api/save put error:', err && err.message ? err.message : err);
      return res.status(500).json({ ok:false, error: 'put failed', detail: String(err) });
    }

    // verify by reading back
    try {
      const blob = await get(path, { token: TOKEN });
      let data = null;
      if (blob && typeof blob.json === 'function') data = await blob.json();
      else if (typeof blob === 'string') data = JSON.parse(blob);
      else data = blob;
      return res.status(200).json({ ok: true, saved: true, snapshot: data });
    } catch (err) {
      console.warn('api/save verification get failed:', err && err.message ? err.message : err);
      // still return success but indicate verification failed
      return res.status(200).json({ ok: true, saved: false, warning: 'written but verification failed', detail: String(err) });
    }
  } catch (err) {
    console.error('api/save error', err);
    res.status(500).json({ ok:false, error: String(err) });
  }
}
