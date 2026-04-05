import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import path from "path";
import { healthRoutes } from "./routes/health";
import { chatRoutes } from "./routes/chat";
import { conversationRoutes } from "./routes/conversations";
import { modelsRoutes } from "./routes/models";
import { settingsRoutes } from "./routes/settings";
import { memoryRoutes } from "./routes/memory";
import { initDb, closeDb } from "./db";
import { networkInterfaces } from "os";

const server = Fastify({
  logger: {
    level: "info",
  },
});

function getLanIP(): string | null {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return null;
}

export async function startServer({
  port = 3001,
  host = "0.0.0.0",
  staticDir,
}: { port?: number; host?: string; staticDir?: string } = {}) {
  // Initialize database
  initDb();

  // Register CORS — allow all origins (all requests are local)
  await server.register(cors, {
    origin: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept", "Cache-Control"],
  });

  // Register API routes
  await server.register(healthRoutes, { prefix: "/api" });
  await server.register(chatRoutes, { prefix: "/api" });
  await server.register(conversationRoutes, { prefix: "/api" });
  await server.register(modelsRoutes, { prefix: "/api" });
  await server.register(settingsRoutes, { prefix: "/api" });
  await server.register(memoryRoutes, { prefix: "/api" });

  // Serve the static Next.js export (UI)
  if (staticDir) {
    const fs = require("fs");
    const pathMod = require("path");

    await server.register(fastifyStatic, {
      root: staticDir,
      prefix: "/",
    });

    // SPA fallback: serve correct HTML files for client-side routes
    server.setNotFoundHandler(async (request, reply) => {
      // Don't intercept API routes
      if (request.url.startsWith("/api/")) {
        return reply.status(404).send({ error: "Not found" });
      }

      // Try to serve the matching HTML file (e.g., /models → models.html)
      const routeName = request.url.split("?")[0].replace(/^\//, "");
      if (routeName) {
        const htmlFile = pathMod.join(staticDir, routeName + ".html");
        if (fs.existsSync(htmlFile)) {
          return reply.sendFile(routeName + ".html");
        }
      }
      return reply.sendFile("index.html");
    });
  }

  await server.listen({ port, host });

  const lanIP = getLanIP();
  console.log(`[Atlas Server] Listening on http://localhost:${port}`);
  if (lanIP) {
    console.log(`[Atlas Server] LAN access: http://${lanIP}:${port}`);
  }

  return server;
}

export async function stopServer() {
  closeDb();
  await server.close();
}
