import asyncio
import logging
from aiogram import Bot, Dispatcher, types

API_TOKEN = "8206191170:AAFZW9iN2CXSxGEJ-llWvWxPk2efRGUvwhU"

logging.basicConfig(level=logging.INFO)

bot = Bot(token=API_TOKEN)
dp = Dispatcher()

# /start va /help komandasi
@dp.message(commands=["start", "help"])
async def send_welcome(message: types.Message):
    await message.answer("Hi!\nI'm your friendly bot!")

# Echo handler
@dp.message()
async def echo(message: types.Message):
    await message.answer(message.text)

# Botni ishga tushirish
async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())