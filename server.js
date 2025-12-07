import axios from "axios";
import { Telegraf, Markup } from "telegraf";

// env dan token o‘qish
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("BOT_TOKEN env topilmadi!");

const API_URL = `https://api.telegram.org/bot${BOT_TOKEN="8491176215:AAGWwxPL3Yz9or7MOLGCdD4ka6mPfOf_hMk"}`;

const bot = new Telegraf(BOT_TOKEN);

// /start komandasi
bot.start((ctx) => {
  ctx.reply(
    'Bosib mini appni oching 👇',
    Markup.inlineKeyboard([
      Markup.button.webApp('Play', 'https://proguzmir.vercel.app/')
    ])
  );
});

// Telegram webhook handler
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(404).send("Only POST allowed");
  }

  try {
    await bot.handleUpdate(req.body);
    return res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook error:", err.message);
    return res.status(500).send("Error");
  }
}

// ===============================
//   Story tekshirish funksiyasi
// ===============================
async function checkUserStory(userId) {
  try {
    const res = await axios.get(`${API_URL}/getUserProfilePhotos`, {
      params: { user_id: userId }
    });
    return !!(res.data && res.data.ok);
  } catch (e) {
    return false;
  }
}

// ===============================
//   Story mukofot endpointi
// ===============================
export async function config() {
  return {
    api: {
      bodyParser: true,
    },
  };
}

export async function POST(req, res) {
  const { userId, username } = req.body;

  if (!userId)
    return res.status(400).json({ ok: false, message: "missing userId" });

  const hasStory = await checkUserStory(userId);

  if (hasStory) {
    console.log(`✅ ${username || userId} ga 1000 energiya berildi`);
    return res.json({ ok: true, reward: 1000 });
  } else {
    return res.json({ ok: false, message: "Story not found" });
  }
}