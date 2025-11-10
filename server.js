/**
 * Custom Next.js Server with WebSocket Support
 * This server runs Next.js app with integrated WebSocket server
 */

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initWebSocketServer } from "./src/lib/websocket.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  });

  // Initialize WebSocket server
  const wss = initWebSocketServer(server);

  // Make WebSocket server available globally
  global.wss = wss;

  // Start server
  server.listen(port, (err) => {
    if (err) throw err;
    console.log("");
    console.log("🌱 Greenhouse Monitor Server");
    console.log("========================================");
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket on ws://${hostname}:${port}/ws`);
    console.log(`> Environment: ${dev ? "development" : "production"}`);
    console.log("========================================");
    console.log("");
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("SIGTERM signal received: closing HTTP server");
    server.close(() => {
      console.log("HTTP server closed");
      wss.close(() => {
        console.log("WebSocket server closed");
        process.exit(0);
      });
    });
  });
});
