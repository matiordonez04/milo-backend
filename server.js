import express from "express";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import axios from "axios";

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
  console.log("📡 Twilio Media Stream connected");

  ws.on("message", async (msg) => {
    try {
      const data = JSON.parse(msg);
      console.log("🗣️ Message received:", data);

      const responseText = "Hola, ¿en qué puedo ayudarte hoy?";
      console.log("🧠 Respuesta generada:", responseText);

      const elevenResponse = await axios({
        method: "POST",
        url: "https://api.elevenlabs.io/v1/text-to-speech/bIHbv24MWmeRgasZH58o/stream",
        headers: {
          "xi-api-key": "sk_dbb4efd1c5f2c37633ea46e4ae972f82d9c57d7273bb310e",
          "Content-Type": "application/json"
        },
        responseType: "arraybuffer",
        data: {
          text: responseText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.3,
            similarity_boost: 0.8
          }
        }
      });

      ws.send(elevenResponse.data);
    } catch (err) {
      console.error("❌ Error handling message:", err);
    }
  });

  ws.on("close", () => console.log("📴 Twilio Media Stream disconnected"));
});
