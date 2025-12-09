import TelegramBot from "node-telegram-bot-api";

const TOKEN = process.env.TOKEN; // ⬅️ dotenv emas, Vercel env ishlatiladi

if (!TOKEN) throw new Error("❌ TOKEN environment variable not set!");

// Polling bilan botni ishga tushirish
const bot = new TelegramBot(TOKEN, { polling: true });

// /start komandasi
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username || msg.from.first_name;

  const text = `Hi @${username}! 👋\n\nWelcome to ProgUzmiR.`;

  bot.sendMessage(chatId, text);
});

export default (req, res) => {
  res.status(200).send("Bot is running");
};