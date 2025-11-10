import { put } from '@vercel/blob';
export const config = {
  api: {
    bodyParser: true,
  },
};
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method Not Allowed' });

    const { userId, snapshot } = req.body || {};
    if (!userId || !snapshot) return res.status(400).json({ ok:false, error:'missing userId or snapshot' });

    // get token from environment (support multiple var names)
    const TOKEN = process.env.uzmirstorage_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
    console.log('TOKEN:', TOKEN);
    console.log('snapshot:', snapshot);
    const path = `${userId}.json`;

    // put supports options; include access and token (best-effort)
    await put(path, JSON.stringify(snapshot), {
      access: 'public',
      token: TOKEN
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('api/save error', err);
    res.status(500).json({ ok:false, error: String(err) });
  }
}
