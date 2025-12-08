import logging
import os
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import Update
from aiohttp import web

API_TOKEN = os.getenv("BOT_TOKEN") or "8206191170:AAFZW9iN2CXSxGEJ-llWvWxPk2efRGUvwhU"

logging.basicConfig(level=logging.INFO)

bot = Bot(token=API_TOKEN)
dp = Dispatcher()

# /start va /help komandasi
@dp.message(Command("start"))
async def start_cmd(message: types.Message):
    await message.answer("Hi!\nI'm your friendly bot!")

# Echo handler
@dp.message()
async def echo(message: types.Message):
    await message.answer(message.text)

# Webhook route
async def handle(request: web.Request):
    try:
        update = Update(**await request.json())
        await dp.process_update(update)
        return web.Response(text="ok")
    except Exception as e:
        logging.exception("Update processing failed")
        return web.Response(status=500, text=str(e))

app = web.Application()
app.router.add_post("/api/bot", handle)  # Vercel route

if __name__ == "__main__":
    web.run_app(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))