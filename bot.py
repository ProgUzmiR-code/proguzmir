import os
import json
from decimal import Decimal, getcontext
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, CallbackQueryHandler, ContextTypes


from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

keyboard = [
    [InlineKeyboardButton("Play", web_app=WebAppInfo(url="https://proguzmir.vercel.app/"))]
]
await message.answer(
    "Bosib mini appni oching 👇",
    reply_markup=InlineKeyboardMarkup(keyboard)
)



DATA_FILE = os.path.join(os.path.dirname(__file__), "data.json")

RANKS = ["bronze", "silver", "gold", "smart gold", "platinium", "master"]
BASE = Decimal("0.000000000000001000")
DIAMOND_TO_PRC = Decimal("0.000000000000000010")

def load_data():
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump({}, f)
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def ensure_user(data, uid, name):
    uid = str(uid)
    if uid not in data:
        data[uid] = {"prc": "0", "diamond": "0", "referrals": [], "wallet": None, "name": name}
    return data[uid]

def prc_decimal(v):
    return Decimal(v)

def get_rank(prc_amount: Decimal):
    if prc_amount < BASE:
        return "bronze"
    thr = BASE
    for i in range(1, len(RANKS)):
        thr = BASE * (Decimal(3) ** (i-1))
        if prc_amount < thr * 3:
            return RANKS[i]
    return "master"

def main_menu_keyboard():
    kb = [
        [InlineKeyboardButton("Game", callback_data="menu_game"),
         InlineKeyboardButton("Rank", callback_data="menu_rank")],
        [InlineKeyboardButton("WALLET", callback_data="menu_wallet"),
         InlineKeyboardButton("Market", callback_data="menu_market")],
        [InlineKeyboardButton("Earn", callback_data="menu_earn")]
    ]
    return InlineKeyboardMarkup(kb)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start command: handle /start and /start refXXX"""
    data = load_data()
    user = ensure_user(data, update.effective_user.id, update.effective_user.full_name)
    
    # Handle referral param if present
    if context.args and context.args[0].startswith("ref"):
        ref_id = context.args[0][3:]  # remove "ref" prefix
        if ref_id and ref_id != str(update.effective_user.id):
            ref_user = ensure_user(data, ref_id, f"ref_{ref_id}")
            if str(update.effective_user.id) not in ref_user["referrals"]:
                ref_user["referrals"].append(str(update.effective_user.id))
    
    save_data(data)
    
    # Try to send with photo, fallback to text
    photo_path = os.path.join(os.path.dirname(__file__), "logotype.png")
    try:
        if os.path.exists(photo_path):
            await update.message.reply_photo(
                photo=InputFile(photo_path),
                caption=f"Assalomu alaykum, {update.effective_user.first_name}!\nMenu:",
                reply_markup=main_menu_keyboard()
            )
        else:
            await update.message.reply_text(
                f"Assalomu alaykum, {update.effective_user.first_name}!\nMenu:",
                reply_markup=main_menu_keyboard()
            )
    except Exception as e:
        print(f"Error sending start message: {e}")
        await update.message.reply_text(
            f"Assalomu alaykum, {update.effective_user.first_name}!\nMenu:",
            reply_markup=main_menu_keyboard()
        )

async def menu_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data = load_data()
    uid = str(query.from_user.id)
    user = ensure_user(data, uid, query.from_user.full_name)
    save_data(data)

    if query.data == "menu_game":
        txt = (f"🎮 Game bo'limi\n💰 PROUZ: {user['prc']}\n💎 Diamond: {user['diamond']}\n\n"
               "Tab bosib token yig'ish yoki ⚔️ O'yinlarga o'ting.")
        kb = [
            [InlineKeyboardButton("Tab (Collect)", callback_data="collect_tab"),
             InlineKeyboardButton("⚔️ O'yinlar", callback_data="play_game")],
            [InlineKeyboardButton("Orqaga", callback_data="menu_back")]
        ]
        await query.edit_message_text(txt, reply_markup=InlineKeyboardMarkup(kb))

    elif query.data == "collect_tab":
        inc = Decimal("0.000000000000000100")
        cur = prc_decimal(user["prc"])
        cur += inc
        user["prc"] = format(cur, "f")
        save_data(data)
        await query.answer(text=f"Tab: +{inc} PRC", show_alert=False)
        await query.edit_message_text(f"Yig'ildi. Yangi balans: {user['prc']} PRC", reply_markup=main_menu_keyboard())

    elif query.data == "play_game":
        await query.edit_message_text("O'yinlar hali namuna. Ekranga qaytish uchun Menu.", reply_markup=main_menu_keyboard())

    elif query.data == "menu_rank":
        prc = prc_decimal(user["prc"])
        rank = get_rank(prc)
        thr_text = []
        for i, r in enumerate(RANKS):
            if i == 0:
                thr_text.append(f"{r}: 0+")
            else:
                t = BASE * (Decimal(3) ** (i-1))
                thr_text.append(f"{r}: >= {t}")
        txt = f"🏷 Rank: {rank}\nPRC: {user['prc']}\n\nReferrallar: {len(user['referrals'])}\n\nThresholds:\n" + "\n".join(thr_text)
        kb = [[InlineKeyboardButton("Invite (ref link)", callback_data="get_ref"),
               InlineKeyboardButton("Orqaga", callback_data="menu_back")]]
        await query.edit_message_text(txt, reply_markup=InlineKeyboardMarkup(kb))

    elif query.data == "get_ref":
        ref = str(query.from_user.id)
        bot_username = (await context.bot.get_me()).username
        link = f"https://t.me/{bot_username}?start=ref{ref}"
        await query.answer()
        await query.edit_message_text(f"Referal link:\n{link}", reply_markup=main_menu_keyboard())

    elif query.data == "menu_wallet":
        w = user.get("wallet") or "bog'lanmagan"
        txt = f"💰 WALLET bo'limi\nPROUZ balans: {user['prc']}\nWallet: {w}"
        kb = [
            [InlineKeyboardButton("Connect Wallet", callback_data="connect_wallet"),
             InlineKeyboardButton("Disconnect", callback_data="disconnect_wallet")],
            [InlineKeyboardButton("Orqaga", callback_data="menu_back")]
        ]
        await query.edit_message_text(txt, reply_markup=InlineKeyboardMarkup(kb))

    elif query.data == "connect_wallet":
        await query.edit_message_text("Wallet manzilingizni yuboring (matn sifatida).")
        context.user_data["await_wallet"] = True

    elif query.data == "disconnect_wallet":
        user["wallet"] = None
        save_data(data)
        await query.edit_message_text("Wallet uzildi.", reply_markup=main_menu_keyboard())

    elif query.data == "menu_market":
        txt = "📊 Market:\nNarx va statistika (namuna)\nBTC/PRC: 0.000... (statik)\n\nAmallar:"
        kb = [
            [InlineKeyboardButton("🔁 Token sotib olish", callback_data="buy_token"),
             InlineKeyboardButton("🎁 Airdrop", callback_data="airdrop")],
            [InlineKeyboardButton("Orqaga", callback_data="menu_back")]
        ]
        await query.edit_message_text(txt, reply_markup=InlineKeyboardMarkup(kb))

    elif query.data == "buy_token":
        await query.edit_message_text("Miqdorni yozing (diamond):")
        context.user_data["await_buy"] = True

    elif query.data == "airdrop":
        inc = Decimal("0.000000000000001000")
        cur = prc_decimal(user["prc"]) + inc
        user["prc"] = format(cur, "f")
        save_data(data)
        await query.answer(text=f"Airdrop +{inc} PRC", show_alert=True)
        await query.edit_message_text(f"Airdrop berildi. Balans: {user['prc']}", reply_markup=main_menu_keyboard())

    elif query.data == "menu_earn":
        txt = "Earn: missiyalarni bajarib diamond ishlang.\n1 diamond = 0.000000000000000010 PRC"
        kb = [
            [InlineKeyboardButton("Missiya bajarish", callback_data="do_mission")],
            [InlineKeyboardButton("Orqaga", callback_data="menu_back")]
        ]
        await query.edit_message_text(txt, reply_markup=InlineKeyboardMarkup(kb))

    elif query.data == "do_mission":
        curd = Decimal(user["diamond"]) + Decimal("1")
        user["diamond"] = format(curd, "f")
        save_data(data)
        await query.answer(text="Missiya bajarildi: +1 diamond", show_alert=True)
        await query.edit_message_text(f"Yangi diamond: {user['diamond']}", reply_markup=main_menu_keyboard())

    elif query.data == "menu_back":
        await query.edit_message_text("Menu:", reply_markup=main_menu_keyboard())

async def text_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    data = load_data()
    uid = str(update.effective_user.id)
    user = ensure_user(data, uid, update.effective_user.full_name)
    txt = update.message.text.strip()

    if context.user_data.get("await_wallet"):
        user["wallet"] = txt
        save_data(data)
        context.user_data["await_wallet"] = False
        await update.message.reply_text("Wallet saqlandi.", reply_markup=main_menu_keyboard())
        return

    if context.user_data.get("await_buy"):
        try:
            qty = Decimal(txt)
            gained_prc = qty * DIAMOND_TO_PRC
            user["prc"] = format(prc_decimal(user["prc"]) + gained_prc, "f")
            if prc_decimal(user["diamond"]) >= qty:
                user["diamond"] = format(prc_decimal(user["diamond"]) - qty, "f")
            save_data(data)
            context.user_data["await_buy"] = False
            await update.message.reply_text(f"Sotib olindi: +{gained_prc} PRC\nBalans: {user['prc']}", reply_markup=main_menu_keyboard())
        except Exception:
            await update.message.reply_text("Xato format. Iltimos raqam kiriting.")
        return

    # default: show menu
    await update.message.reply_text("Menu:", reply_markup=main_menu_keyboard())

def main():
    token = os.getenv("TELEGRAM_TOKEN")
    if not token:
        print("Iltimos TELEGRAM_TOKEN muhit o'zgaruvchisiga token qo'ying.")
        return
    
    app = ApplicationBuilder().token(token).build()
    
    # Add handlers (no duplicates)
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler(["menu", "help", "balance", "game", "rank", "wallet", "market", "earn"], start))
    app.add_handler(CallbackQueryHandler(menu_callback))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, text_handler))
    
    app.run_polling()

if __name__ == "__main__":
    main()
