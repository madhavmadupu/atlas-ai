"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelsRoutes = modelsRoutes;
const ollama_service_1 = require("../services/ollama.service");
async function modelsRoutes(fastify) {
    const ollama = new ollama_service_1.OllamaService();
    // List installed models
    fastify.get("/models", async () => {
        try {
            return await ollama.listModels();
        }
        catch {
            return [];
        }
    });
    // Pull a model (SSE streaming progress)
    fastify.post("/models/pull", async (request, reply) => {
        const { name } = request.body;
        reply.raw.setHeader("Content-Type", "text/event-stream");
        reply.raw.setHeader("Cache-Control", "no-cache");
        reply.raw.setHeader("Connection", "keep-alive");
        reply.raw.flushHeaders();
        try {
            for await (const progress of ollama.pullModel(name)) {
                reply.raw.write(`data: ${JSON.stringify(progress)}\n\n`);
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : "Pull failed";
            reply.raw.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
        }
        finally {
            reply.raw.end();
        }
        return reply;
    });
    // Delete a model
    fastify.delete("/models/:name", async (request) => {
        await ollama.deleteModel(decodeURIComponent(request.params.name));
        return { success: true };
    });
}
//# sourceMappingURL=models.js.map