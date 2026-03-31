import { FastifyInstance } from "fastify";
import { OllamaService } from "../services/ollama.service";

export async function modelsRoutes(fastify: FastifyInstance) {
  const ollama = new OllamaService();

  // List installed models
  fastify.get("/models", async () => {
    try {
      return await ollama.listModels();
    } catch {
      return [];
    }
  });

  // Pull a model (SSE streaming progress)
  fastify.post<{ Body: { name: string } }>("/models/pull", async (request, reply) => {
    const { name } = request.body;

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.flushHeaders();

    try {
      for await (const progress of ollama.pullModel(name)) {
        reply.raw.write(`data: ${JSON.stringify(progress)}\n\n`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Pull failed";
      reply.raw.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    } finally {
      reply.raw.end();
    }

    return reply;
  });

  // Delete a model
  fastify.delete<{ Params: { name: string } }>(
    "/models/:name",
    async (request) => {
      await ollama.deleteModel(decodeURIComponent(request.params.name));
      return { success: true };
    },
  );
}
