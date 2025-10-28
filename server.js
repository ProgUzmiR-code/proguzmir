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

// Story check helper (best-effort / mocked via getUserProfilePhotos)
async function checkUserStory(userId) {
  try {
    const res = await axios.get(`${API_URL}/getUserProfilePhotos`, {
      params: { user_id: userId },
    });
    // Telegram doesn't expose "stories" directly; treat a successful response as "has recent photo"
    return !!(res && res.data && res.data.ok);
  } catch (err) {
    console.error("Story check error:", err && err.message);
    return false;
  }
}

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
app.post("/claim-story-reward", async (req, res) => {
  try {
    const { userId, username } = req.body || {};
    if (!userId) return res.status(400).json({ ok: false, message: "missing userId" });

    const hasStory = await checkUserStory(userId);
    if (hasStory) {
      // TODO: persist reward in DB or perform wallet/state update
      console.log(`✅ ${username || userId} rewarded +1000 energy (mock).`);
      return res.json({ ok: true, reward: 1000 });
    } else {
      return res.json({ ok: false, message: "Story not found" });
    }
  } catch (err) {
    console.error("claim-story-reward error:", err && err.message);
    return res.status(500).json({ ok: false, message: "internal error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.listen(3000, () => console.log("Server running on port 3000"));



