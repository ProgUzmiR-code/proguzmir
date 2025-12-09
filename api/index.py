import os
from aiogram import Bot, Dispatcher
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, Message, WebAppInfo, FSInputFile
from aiogram.filters import Command

TOKEN = os.getenv("BOT_TOKEN")  # Vercel environment variable bo'lishi kerak

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
    caption = f"Hi, @{username}! This is ProgUzmiR 👋"

    if os.path.exists(photo_path):
        await message.answer_photo(
            photo=FSInputFile(photo_path),
            caption=caption,
            reply_markup=keyboard
        )
    else:
        await message.answer(
            "There was an error. We apologize for the inconvenience!",
            reply_markup=keyboard
        )

# 🔥 VERCEL UCHUN WEBHOOK HANDLER
async def handler(request):
    data = await request.json()
    await dp.feed_update(bot, data)
    return {
        "statusCode": 200,
        "body": "ok"
    }