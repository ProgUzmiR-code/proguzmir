import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
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