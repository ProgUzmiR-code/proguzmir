import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";

const TOKEN = "8206191170:AAFZW9iN2CXSxGEJ-llWvWxPk2efRGUvwhU";

if (!TOKEN) {
  throw new Error("❌ Token topilmadi!");
}

const bot = new TelegramBot(TOKEN, { webHook: true });

// Vercel serverless URL (o'zingning domening)
const URL = "https://proguzmir.vercel.app";
bot.setWebHook(`${URL}/api/bot`);


// START HANDLER
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "Open the App",
          web_app: { url: "https://proguzmir.vercel.app/" }
        }
      ]
    ]
  };

  const username = msg.from.username || msg.from.first_name;
  const mention = `@${username}`;

  const caption = `Hi, ${mention}! This is ProgUzmiR 👋

Tap on the coin and watch your balance grow.

How much is ProgUzmiR worth? No one knows, probably nothing.

Got any friends? Get them in the game. That way you'll get even more coins together.

ProgUzmiR is what you want it to be. That's all you need to know.
`;

  const photo = path.join(process.cwd(), "api", "coin.png");

  if (fs.existsSync(photo)) {
    await bot.sendPhoto(chatId, photo, {
      caption,
      reply_markup: keyboard,
    });
  } else {
    await bot.sendMessage(chatId, "There was an error. We apologize.", {
      reply_markup: keyboard,
    });
  }
});

// Vercel handler
export default function handler(req, res) {
  bot.processUpdate(req.body);
  res.status(200).send("ok");
}