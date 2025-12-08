import asyncio
import os
from aiogram import Bot, Dispatcher
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, InputFile
from aiogram.filters import Command
from dotenv import load_dotenv

load_dotenv()  # .env faylni yuklash

TOKEN = os.getenv("TELEGRAM_TOKEN") or os.getenv("BOT_TOKEN")

if not TOKEN:
    raise Exception("❌ Token topilmadi. .env faylni tekshiring!")

dp = Dispatcher()


@dp.message(Command("start"))
async def start_handler(message: Message):
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Open App",
                    web_app=WebAppInfo(url="https://proguzmir.vercel.app/")
                )
            ]
        ]
    )

    photo_path = os.path.join(os.path.dirname(__file__), "image/key.png")

    if os.path.exists(photo_path):
        await message.answer_photo(
            photo=InputFile(photo_path),
            caption="Salom hammaga",
            reply_markup=keyboard
        )
    else:
        await message.answer("'Hi, @! This is TapCoins 👋' 'Tap on the coin and watch your balance grow.' 'How much is TapCoins worth?' No one knows, probably nothing. Got any friends? Get them in the game. That way you'll get even more coins together. TapCoins is what you want it to be. That's all you need to know.", reply_markup=keyboard)


async def main():
    bot = Bot(token=TOKEN)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())