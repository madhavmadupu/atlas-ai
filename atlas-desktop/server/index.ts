import Fastify from "fastify";
import cors from "@fastify/cors";
import { healthRoutes } from "./routes/health";
import { chatRoutes } from "./routes/chat";
import { conversationRoutes } from "./routes/conversations";
import { modelsRoutes } from "./routes/models";
import { settingsRoutes } from "./routes/settings";
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
}: { port?: number; host?: string } = {}) {
  // Initialize database
  initDb();

  // Register CORS — allow all origins (all requests are local)
  await server.register(cors, {
    origin: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept", "Cache-Control"],
  });

  // Register routes
  await server.register(healthRoutes, { prefix: "/api" });
  await server.register(chatRoutes, { prefix: "/api" });
  await server.register(conversationRoutes, { prefix: "/api" });
  await server.register(modelsRoutes, { prefix: "/api" });
  await server.register(settingsRoutes, { prefix: "/api" });

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
