import os
from aiogram import Bot, Dispatcher
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, FSInputFile, Message
from aiogram.filters import Command
from aiohttp import web

TOKEN = os.getenv("BOT_TOKEN")

if not TOKEN:
    raise Exception("❌ Token topilmadi! Vercel Environment Variables ni tekshiring.")

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

    caption = "Hi! This is ProgUzmiR 👋"

    photo = FSInputFile(os.path.join(os.path.dirname(__file__), "coin.png"))

    await message.answer_photo(photo=photo, caption=caption, reply_markup=keyboard)


async def handler(request):
    data = await request.json()
    update = dp.update_factory(data)
    await dp.feed_update(bot, update)
    return web.Response(text="ok")