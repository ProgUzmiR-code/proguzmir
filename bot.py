import os
import json
from decimal import Decimal, getcontext
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, CallbackQueryHandler, ContextTypes

DATA_FILE = os.path.join(os.path.dirname(__file__), "data.json")
getcontext().prec = 50

RANKS = ["bronze", "silver", "gold", "smart gold", "platinium", "master"]
# bazaviy threshold: bronze->silver
BASE = Decimal("0.000000000000001000")
# konvertatsiya
DIAMOND_TO_PRC = Decimal("000000000000000010")  # 1 diamond in PRC units

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
    # determine rank from PRC amount
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
    data = load_data()
    user = ensure_user(data, update.effective_user.id, update.effective_user.full_name)
    save_data(data)
    txt = f"Assalomu alaykum, {update.effective_user.first_name}!\nMenu:"
    await update.message.reply_text(txt, reply_markup=main_menu_keyboard())

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
        # namuna: har bosishda kichik PRC qo'shish
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
        # build thresholds display
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
        # oddiy ref link: telg bot deep link with ref param
        ref = f"{query.from_user.id}"
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
        await query.edit_message_text("Wallet manzilingizni yuboring (matn sifatida).", reply_markup=None)
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
        # namuna: user 1 diamonddan PRC olishi
        txt = "Sotib olish uchun miqdorni yozing (masalan: 1 diamond -> PRC)."
        context.user_data["await_buy"] = True
        await query.edit_message_text(txt)

    elif query.data == "airdrop":
        inc = Decimal("0.000000000000001000")
        cur = prc_decimal(user["prc"]) + inc
        user["prc"] = format(cur, "f")
        save_data(data)
        await query.answer(text=f"Airdrop +{inc} PRC", show_alert=True)
        await query.edit_message_text(f"Airdrop berildi. Balans: {user['prc']}", reply_markup=main_menu_keyboard())

    elif query.data == "menu_earn":
        txt = "Earn: missiyalarni bajarib diamond ishlang.\n1 diamond = 000000000000000010 PRC"
        kb = [
            [InlineKeyboardButton("Missiya bajarish", callback_data="do_mission")],
            [InlineKeyboardButton("Orqaga", callback_data="menu_back")]
        ]
        await query.edit_message_text(txt, reply_markup=InlineKeyboardMarkup(kb))

    elif query.data == "do_mission":
        # namuna missiya — userga 1 diamond berish
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
        # oddiy namuna: foydalanuvchi miqdorni diamondda yuboradi, konvertatsiya qilamiz
        try:
            qty = Decimal(txt)
            gained_prc = qty * DIAMOND_TO_PRC
            user["prc"] = format(prc_decimal(user["prc"]) + gained_prc, "f")
            # agar diamonddan sotib olish bo'lsa, diamond kamaytirilsin (agar yetarli bo'lsa)
            if prc_decimal(user["diamond"]) >= qty:
                user["diamond"] = format(prc_decimal(user["diamond"]) - qty, "f")
            save_data(data)
            context.user_data["await_buy"] = False
            await update.message.reply_text(f"Sotib olindi: +{gained_prc} PRC\nBalans: {user['prc']}", reply_markup=main_menu_keyboard())
        except Exception:
            await update.message.reply_text("Xato format. Iltimos raqam kiriting.")
        return

    # start with ref param handling
    if txt.lower().startswith("/start ref"):
        ref = txt[len("/start ref"):].strip()
        if ref and ref != uid:
            ref_user = ensure_user(data, ref, f"ref_{ref}")
            if uid not in ref_user["referrals"]:
                ref_user["referrals"].append(uid)
                save_data(data)
        await update.message.reply_text("Referal qabul qilindi. Menu:", reply_markup=main_menu_keyboard())
        return

    await update.message.reply_text("Menu:", reply_markup=main_menu_keyboard())

from telegram import InputFile

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    data = load_data()
    user = ensure_user(data, update.effective_user.id, update.effective_user.full_name)
    save_data(data)

    # ✅ Rasm yuborish
    photo_path = os.path.join(os.path.dirname(__file__), "logotive.png")
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

def main():
    token = os.getenv("TELEGRAM_TOKEN")
    if not token:
        print("Iltimos TELEGRAM_TOKEN muhit o'zgaruvchisiga token qo'ying.")
        return
    app = ApplicationBuilder().token(token).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CallbackQueryHandler(menu_callback))
    app.add_handler(CommandHandler("menu", start))
    app.add_handler(CommandHandler("help", start))
    app.add_handler(CommandHandler("balance", start))
    app.add_handler(CommandHandler("ping", start))
    app.add_handler(CommandHandler("ref", start))
    app.add_handler(CommandHandler("connect", start))
    app.add_handler(CallbackQueryHandler(menu_callback))
    app.add_handler(CommandHandler("stop", start))
    app.add_handler(CommandHandler("back", start))
    app.add_handler(CommandHandler("game", start))
    app.add_handler(CommandHandler("rank", start))
    app.add_handler(CommandHandler("wallet", start))
    app.add_handler(CommandHandler("market", start))
    app.add_handler(CommandHandler("earn", start))
    app.add_handler(CommandHandler("collect", start))
    app.add_handler(CommandHandler("buy", start))
    app.add_handler(CommandHandler("airdrop", start))
    app.add_handler(CommandHandler("mission", start))
    app.add_handler(CommandHandler("ref", start))
    app.add_handler(CommandHandler("invite", start))
    app.add_handler(CallbackQueryHandler(menu_callback))
    from telegram.ext import MessageHandler, filters
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, text_handler))
    app.run_polling()

if __name__ == "__main__":
    main()
