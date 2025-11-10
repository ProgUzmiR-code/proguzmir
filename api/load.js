import { get } from '@vercel/blob';
export const config = { api: { bodyParser: true } };

function cleanToken(t) {
  if (!t) return null;
  return String(t).replace(/^"+|"+$/g, '').trim();
}

export default async function handler(req, res) {
  try {
    const { userId } = req.query || {};
    if (!userId) return res.status(400).json({ ok:false, error:'missing userId' });

    const rawToken = process.env.uzmirstorage_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
    const TOKEN = cleanToken(rawToken);

    const path = `progress/${encodeURIComponent(userId)}.json`;
    let blob;
    try {
      blob = await get(path, { token: TOKEN });
    } catch (err) {
      console.error('api/load get error:', err && err.message ? err.message : err);
      return res.status(500).json({ ok:false, error:'get failed', detail: String(err) });
    }

    if (!blob) {
      return res.status(404).json({ ok:false, error:'not found' });
    }

    // robust parsing
    try {
      if (typeof blob === 'string') return res.status(200).json(JSON.parse(blob));
      if (blob && typeof blob.json === 'function') {
        const data = await blob.json();
        return res.status(200).json(data);
      }
      // ArrayBuffer / Buffer fallback
      if (blob instanceof ArrayBuffer || (typeof Buffer !== 'undefined' && Buffer.isBuffer(blob))) {
        const str = blob instanceof ArrayBuffer ? Buffer.from(blob).toString() : blob.toString();
        return res.status(200).json(JSON.parse(str));
      }
      // otherwise return as-is (may already be object)
      return res.status(200).json(blob);
    } catch (parseErr) {
      console.warn('api/load parse error:', parseErr && parseErr.message ? parseErr.message : parseErr);
      return res.status(200).json({ ok:true, raw: String(blob), warning: 'could not parse JSON' });
    }
  } catch (err) {
    console.error('api/load error', err);
    res.status(500).json({ ok:false, error: String(err) });
  }
}
