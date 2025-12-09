import TelegramBot from "node-telegram-bot-api";

const bot = new TelegramBot(process.env.TOKEN, { webHook: true });

bot.setWebHook(`${process.env.WEBHOOK_URL}/api/webhook`);

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Webhook ishlayapti!");
});

export default function handler(req, res) {
  if (req.method === "POST") {
    bot.processUpdate(req.body);
    return res.status(200).send("ok");
  }
  res.status(200).send("Bot is running");
}