import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy endpoint for Lyzr AI to hide API Key
  app.post("/api/chat", async (req, res) => {
    const { message, session_id } = req.body;
    const apiKey = process.env.LYZR_API_KEY;
    const agentId = process.env.AGENT_ID;

    if (!apiKey || !agentId) {
      return res.status(500).json({ error: "API Key or Agent ID not configured" });
    }

    try {
      const response = await fetch("https://agent-prod.studio.lyzr.ai/v3/inference/chat/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          user_id: "jghatodhar77@gmail.com", // Keeping the user email as provided
          agent_id: agentId,
          session_id: session_id || `${agentId}-${Date.now()}`,
          message: message,
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: "Failed to parse error response from Lyzr" };
        }
        console.error("Lyzr API error:", errorData);
        return res.status(response.status).json({
          error: "Lyzr API Error",
          details: errorData,
          status: response.status
        });
      }

      const data = await response.json();
      console.log("Lyzr API response data:", JSON.stringify(data, null, 2));
      res.json(data);
    } catch (error) {
      console.error("Server error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
