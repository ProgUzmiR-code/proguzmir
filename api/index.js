import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path"

const TOKEN = "8206191170:AAFZW9iN2CXSxGEJ-llWvWxPk2efRGUvwhU"; // Tokenni shu yerga yozing

if (!TOKEN) {
  throw new Error("❌ Token topilmadi!");
}

// Botni polling ishlatmaymiz, faqat processUpdate orqali ishlaydi
const bot = new TelegramBot(TOKEN, { polling: false });

// START komandasi
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "Open the App", web_app: { url: "https://proguzmir.vercel.app/" } }
      ]
    ]
  };

  const username = msg.from.username || msg.from.first_name;
  const caption = `Hi @${username}! 👋 Tap on the coin and watch your balance grow.`;

  const photo = path.join(process.cwd(), "api", "coin.png");

  if (fs.existsSync(photo)) {
    // Use a ReadStream and explicit filename + contentType to avoid deprecation warning
    const stream = fs.createReadStream(photo);
    try {
      await bot.sendPhoto(chatId, stream, {
        caption,
        reply_markup: keyboard,
        filename: path.basename(photo),
        contentType: "image/png"
      });
    } catch (err) {
      console.error("sendPhoto error (stream):", err);
      // fallback to sending as message if photo send fails
      await bot.sendMessage(chatId, caption, { reply_markup: keyboard });
    }
  } else {
    await bot.sendMessage(chatId, caption, { reply_markup: keyboard });
  }
});

// Vercel handler
export default async function handler(req, res) {
  try {
    const update = req.body;
    await bot.processUpdate(update); // Serverless uchun processUpdate chaqiriladi
    res.status(200).send("ok");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing update");
  }
}