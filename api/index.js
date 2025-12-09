import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config(); // ✅ Call the config method to load .env

const TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_TOKEN;

if (!TOKEN) {
  throw new Error("❌ BOT_TOKEN yoki TELEGRAM_TOKEN muhit o'zgaruvchisi topilmadi! Vercel Settings > Environment Variables da o'rnatib qo'ying.");
}

const bot = new TelegramBot(TOKEN, { polling: false });

// START komandasi
bot.onText(/\/start/, async (msg) => {
  try {
    const chatId = msg.chat.id;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "🎮 O'YINNI OCHING",
            web_app: { url: "https://proguzmir.vercel.app/" }
          }
        ]
      ]
    };

    const firstName = msg.from.first_name || "O'yinchi";
    const caption = `Assalomu alaykum, ${firstName}! 👋

ProgUzmiR o'yiniga xush kelibsiz! 🎯

🪙 Tangani bosing va balansingiz o'sishini kuzatib boring.

👥 Do'stlaringizni taklif qiling va birga ko'proq tangalar yig'ing!

🚀 O'yinni o'zingiz xohlagandek qilishingiz mumkin.

Keling, boshlaymiz! 💪
`;

    const photo = path.join(process.cwd(), "api", "coin.png");

    if (fs.existsSync(photo) && fs.statSync(photo).size > 0) {
      const stream = fs.createReadStream(photo);
      await bot.sendPhoto(chatId, stream, {
        caption,
        reply_markup: keyboard,
        filename: "coin.png",
        contentType: "image/png"
      });
    } else {
      await bot.sendMessage(chatId, caption, {
        reply_markup: keyboard,
        parse_mode: "HTML"
      });
    }
  } catch (err) {
    console.error("❌ /start xatosi:", err.message);
    try {
      await bot.sendMessage(msg.chat.id, "Xatolik yuz berdi. Keyinroq urinib ko'ring.");
    } catch (e) {
      console.error("Xabar yuborish muvaffaq bo'lmadi:", e.message);
    }
  }
});

// Vercel handler
export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const update = req.body;

      if (!update || !update.update_id) {
        console.warn("⚠️ Noto'g'ri update:", update);
        return res.status(400).send("Noto'g'ri update");
      }

      await bot.processUpdate(update);
      return res.status(200).send("OK");
    }

    // GET uchun health check
    return res.status(200).json({ ok: true, message: "Bot API ishlamoqda" });
  } catch (err) {
    console.error("❌ Handler xatosi:", err.message);
    return res.status(500).send("Xatolik xududi qayta ishlashda");
  }
}