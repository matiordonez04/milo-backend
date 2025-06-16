import express from "express";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Milo AI backend is running 🚀");
});

const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("🔌 Twilio Media Stream connected");

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);
      console.log("📨 Message received:", data);
    } catch (err) {
      console.log("❌ Error parsing message:", err);
    }
  });

  ws.on("close", () => console.log("🔌 Twilio Media Stream disconnected"));
});
