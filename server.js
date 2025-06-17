import express from "express";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import path from "path";
import { OpenAI } from "openai";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`🚀 Milo AI backend running on port ${port}`);
});

const wss = new WebSocketServer({ server });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

wss.on("connection", (ws) => {
  console.log("✅ Twilio Media Stream connected");

  let audioChunks = [];

  ws.on("message", async (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.event === "start") {
        console.log("🟢 Stream started");
        audioChunks = [];
        return;
      }

      if (data.event === "media") {
        const audioBuf = Buffer.from(data.media.payload, "base64");
        audioChunks.push(audioBuf);
        return;
      }

      if (data.event === "stop") {
        console.log("🔴 Stream stopped. Procesando...");

        const rawPath = path.join(process.cwd(), "temp_audio.raw");
        const wavPath = path.join(process.cwd(), "temp_audio.wav");
        fs.writeFileSync(rawPath, Buffer.concat(audioChunks));

        // Convertir RAW -> WAV usando ffmpeg
        await new Promise((resolve, reject) => {
          ffmpeg(rawPath)
            .inputFormat("mulaw")
            .audioFrequency(8000)
            .audioChannels(1)
            .audioCodec("pcm_s16le")
            .format("wav")
            .on("end", resolve)
            .on("error", reject)
            .save(wavPath);
        });

        // Transcripción con Whisper
        const transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(wavPath),
          model: "whisper-1",
          language: "es"
        });

        const text = transcription.text;
        console.log("💬 Cliente dijo:", text);

        // Obtener respuesta con GPT
        const gptRes = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "Responde como un asistente amable de un restaurante en español latino." },
            { role: "user", content: text }
          ]
        });

        const reply = gptRes.choices[0].message.content;
        console.log("🤖 Milo responde:", reply);

        // Convertir respuesta a voz (ElevenLabs)
        const audioRes = await axios({
          method: "POST",
          url: "https://api.elevenlabs.io/v1/text-to-speech/bIHbv24MwmeRgasZH58o/stream",
          headers: {
            "xi-api-key": process.env.ELEVEN_API_KEY,
            "Content-Type": "application/json"
          },
          responseType: "arraybuffer",
          data: {
            text: reply,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.3,
              similarity_boost: 0.85
            }
          }
        });

        // Enviar audio a Twilio
        ws.send(audioRes.data);

        // Borrar archivos temporales
        fs.unlinkSync(rawPath);
        fs.unlinkSync(wavPath);
      }
    } catch (err) {
      console.error("❌ Error:", err.message);
    }
  });

  ws.on("close", () => {
    console.log("👋 Cliente desconectado");
  });
});

app.get("/", (_, res) => {
  res.send("Milo AI backend is running 🚀");
});

