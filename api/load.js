import { get } from '@vercel/blob';

export default async function handler(req, res) {
  try {
    const { userId } = req.query || {};
    if (!userId) return res.status(400).json({ ok:false, error:'missing userId' });

    const TOKEN = process.env.uzmirstorage_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
    const path = `progress/${encodeURIComponent(userId)}.json`;

    const blob = await get(path, { token: TOKEN });
    if (!blob) return res.status(404).json({ ok:false, error:'not found' });

    // blob may be different shapes depending on runtime; try robust parsing
    let data = null;
    try {
      if (blob && typeof blob.json === 'function') {
        data = await blob.json();
      } else if (blob instanceof ArrayBuffer || (typeof Buffer !== 'undefined' && Buffer.isBuffer(blob))) {
        const str = (blob instanceof ArrayBuffer) ? Buffer.from(blob).toString() : blob.toString();
        data = JSON.parse(str);
      } else if (typeof blob === 'string') {
        data = JSON.parse(blob);
      } else {
        // fallback - maybe already parsed object
        data = blob;
      }
    } catch (parseErr) {
      console.warn('api/load parse error, returning raw blob', parseErr);
      // if cannot parse, return raw as text
      return res.status(200).json(blob);
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('api/load error', err);
    res.status(500).json({ ok:false, error: String(err) });
  }
}
