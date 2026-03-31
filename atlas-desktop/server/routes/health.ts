import { FastifyInstance } from "fastify";
import { OllamaService } from "../services/ollama.service";
import { networkInterfaces } from "os";

function getLanIP(): string | null {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return null;
}

export async function healthRoutes(fastify: FastifyInstance) {
  const ollama = new OllamaService();

  fastify.get("/health", async () => {
    return {
      status: "ok",
      app: "Atlas AI",
      version: "0.1.0",
      lanIP: getLanIP(),
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get("/health/ollama", async () => {
    const running = await ollama.ping();
    return { status: running ? "running" : "offline" };
  });
}
