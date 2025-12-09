import os
import json
from aiogram import Bot, Dispatcher
from aiogram.types import Update, InlineKeyboardMarkup, InlineKeyboardButton, Message, WebAppInfo, FSInputFile
from aiogram.filters import Command

TOKEN = os.getenv("TELEGRAM_TOKEN") or os.getenv("BOT_TOKEN")

if not TOKEN:
    raise Exception("❌ Token topilmadi!")

bot = Bot(TOKEN)
dp = Dispatcher()


@dp.message(Command("start"))
async def start_handler(message: Message):
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Open the App",
                    web_app=WebAppInfo(url="https://proguzmir.vercel.app/")
                )
            ]
        ]
    )

    photo_path = os.path.join(os.path.dirname(__file__), "coin.png")

    username = message.from_user.username or message.from_user.first_name
    mention = f"@{username}"

    caption = f"""Hi, {mention}! This is ProgUzmiR 👋

Tap on the coin and watch your balance grow.

How much is ProgUzmiR worth? No one knows, probably nothing.

Got any friends? Get them in the game. That way you'll get even more coins together.

ProgUzmiR is what you want it to be. That's all you need to know.
"""

    if os.path.exists(photo_path):
        await message.answer_photo(
            photo=FSInputFile(photo_path),
            caption=caption,
            reply_markup=keyboard
        )
    else:
        await message.answer(
            "There was an error.\nWe apologize for the inconvenience!",
            reply_markup=keyboard
        )


# ⭐⭐ MUHIM ⭐⭐ — Vercel Serverless Hook
async def handler(request):
    body = await request.json()
    update = Update.model_validate(body)

    await dp.feed_update(bot, update)

    return {
        "statusCode": 200,
        "body": json.dumps({"ok": True})
    }