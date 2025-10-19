import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.use(bodyParser.json());
const TelegramBot = require('node-telegram-bot-api');
const TOKEN = '8491176215:AAGWwxPL3Yz9or7MOLGCdD4ka6mPfOf_hMk';
const PORT = process.env.PORT || 3000;

// Asosiy test route
app.get("/", (req, res) => {
  res.send("✅ Bot server is working! Telegram webhook is ready.");
});

// Webhook route
app.post(`/api/webhook`, (req, res) => {
  console.log(req.body);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.listen(3000, () => console.log("Server running on port 3000"));