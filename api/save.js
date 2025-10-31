import { put } from '@vercel/blob';

export default async function handler(req, res) {
  try {
    const { userId, snapshot } = req.body || {};
    if (!userId || !snapshot) return res.status(400).json({ ok:false, error:'missing' });

    await put(`progress/${userId}.json`, JSON.stringify(snapshot), {
      access: 'public',
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('api/save error', err);
    res.status(500).json({ ok:false, error: String(err) });
  }
}
