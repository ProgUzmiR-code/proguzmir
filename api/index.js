import TelegramBot from "node-telegram-bot-api";

// Bot tokenni shu yerga yozamiz
const TOKEN = "8206191170:AAFZW9iN2CXSxGEJ-llWvWxPk2efRGUvwhU"; // BotFather'dan olgan token

if (!TOKEN) throw new Error("❌ Token topilmadi!");

// Polling bilan botni ishga tushiramiz
const bot = new TelegramBot(TOKEN, { polling: true });

// /start komandasi
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username || msg.from.first_name;

  const text = `Hi @${username}! 👋\n\nWelcome to ProgUzmiR.`;

  bot.sendMessage(chatId, text);
});