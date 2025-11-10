import { put, get } from '@vercel/blob';
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
    }

    const path = `progress/${encodeURIComponent(userId)}.json`;

    // attempt write (put should overwrite existing file at the same path)
    try {
      await put(path, JSON.stringify(snapshot), { access: 'public', token: TOKEN });
      console.log('[SAVE API] ✅ put success:', path);
    } catch (err) {
      console.error('api/save put error:', err && err.message ? err.message : err);
      return res.status(500).json({ ok:false, error: 'put failed', detail: String(err) });
    }

    // small delay to mitigate eventual consistency in object storage reads
    await new Promise(r => setTimeout(r, 400));

    // verify by reading back (best-effort). If verification fails, still report saved:true if put succeeded.
    try {
      const blob = await get(path, { token: TOKEN });
      let data = null;
      if (blob && typeof blob.json === 'function') data = await blob.json();
      else if (typeof blob === 'string') data = JSON.parse(blob);
      else data = blob;
      return res.status(200).json({ ok: true, saved: true, snapshot: data });
    } catch (err) {
      console.warn('api/save verification get failed (but put succeeded):', err && err.message ? err.message : err);
      // return success but indicate verification failed (allows client to trust put)
      return res.status(200).json({ ok: true, saved: true, warning: 'written but verification read failed', detail: String(err) });
    }
  } catch (err) {
    console.error('api/save error', err);
    res.status(500).json({ ok:false, error: String(err) });
  }
}
