import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();
const app = express();

app.use(bodyParser.json());
const TelegramBot = require('node-telegram-bot-api');
const TOKEN = '8491176215:AAGWwxPL3Yz9or7MOLGCdD4ka6mPfOf_hMk';
const PORT = process.env.PORT || 3000;

// use BOT_TOKEN env if provided, fallback to existing TOKEN constant
const BOT_TOKEN = process.env.BOT_TOKEN || TOKEN;
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;
const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf('8491176215:AAGWwxPL3Yz9or7MOLGCdD4ka6mPfOf_hMk');

bot.start((ctx) => {
    ctx.reply(
        'Bosib mini appni oching 👇',
        Markup.inlineKeyboard([
            Markup.button.webApp('Play', 'https://proguzmir.vercel.app/')
        ])
    );
});

bot.launch();

// Story check helper (best-effort / mocked via getUserProfilePhotos)

// Asosiy test route
app.get("/", (req, res) => {
  res.send("✅ Bot server is working! Telegram webhook is ready.");
});

// Webhook route
app.post(`/api/webhook`, (req, res) => {
  console.log(req.body);
  res.sendStatus(200);
});

// Backend endpoint: claim story reward

async function checkUserStory(userId) {
  try {
    const res = await axios.get(`${API_URL}/getUserProfilePhotos`, { params: { user_id: userId } });
    return !!(res && res.data && res.data.ok);
  } catch (err) {
    console.error("Story check error:", err.message);
    return false;
  }
}

app.post("/claim-story-reward", async (req, res) => {
  const { userId, username } = req.body;
  if (!userId) return res.status(400).json({ ok: false, message: "missing userId" });
  const hasStory = await checkUserStory(userId);
  if (hasStory) {
    console.log(`✅ ${username || userId} ga 1000 energiya berildi`);
    return res.json({ ok: true, reward: 1000 });
  } else {
    return res.json({ ok: false, message: "Story not found" });
  }
});

app.listen(3000, () => console.log("✅ Server running"));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.listen(3000, () => console.log("Server running on port 3000"));



