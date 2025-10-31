import { get } from '@vercel/blob';

export default async function handler(req, res) {
  try {
    const { userId } = req.query || {};
    if (!userId) return res.status(400).json({ ok:false, error:'missing userId' });

    const blob = await get(`progress/${userId}.json`);
    if (!blob) return res.status(404).json({ ok:false, error:'not found' });
    const data = await blob.json();
    res.status(200).json(data);
  } catch (err) {
    console.error('api/load error', err);
    res.status(500).json({ ok:false, error: String(err) });
  }
}
