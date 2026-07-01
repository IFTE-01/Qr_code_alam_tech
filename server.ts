import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Setup body parser for JSON with large sizes to accommodate raw base64 images
  app.use(express.json({ limit: '15mb' }));

  // API endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/scan-ai", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image || !mimeType) {
        return res.status(400).json({ error: "Missing image data or mimeType parameters." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ 
          error: "GEMINI_API_KEY is not configured on the server. Please check Settings > Secrets." 
        });
      }

      // Strip potential data URL prefix
      let cleanBase64 = image;
      if (image.includes(",")) {
        cleanBase64 = image.split(",")[1];
      }

      // Utilize Gemini 3.5 Flash for high-performance visual reasoning and decoding
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            }
          },
          {
            text: "Identify the QR code in this image. Read/decode the QR code and return its EXACT raw content/text directly. Do not explain, do not add markdown formatting, and do not introduce any extra characters. Only return the decoded string itself. If there is no QR code in the image or it is impossible to read, return exactly 'ERROR: NO_QR'."
          }
        ]
      });

      const resultText = response.text?.trim() || "";

      if (resultText === "ERROR: NO_QR" || !resultText) {
        return res.json({ success: false, error: "No QR code could be decoded from this image." });
      }

      res.json({ success: true, text: resultText });
    } catch (error: any) {
      console.error("Gemini QR decode error:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "An error occurred while using the Gemini AI vision engine." 
      });
    }
  });

  // Vite middleware for development or serving built static assets in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
