import { FastifyInstance } from "fastify";
import { OllamaService } from "../services/ollama.service";
import { MemoryService } from "../services/memory.service";
import * as db from "../db";
import crypto from "crypto";

interface ChatBody {
  conversationId?: string;
  model: string;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  systemPrompt?: string;
}

export async function chatRoutes(fastify: FastifyInstance) {
  const ollama = new OllamaService();
  const memoryService = new MemoryService(ollama);

  fastify.post<{ Body: ChatBody }>("/chat", async (request, reply) => {
    const { messages, model, conversationId, systemPrompt } = request.body;

    // Set SSE headers
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    reply.raw.flushHeaders();

    // RAG: Augment system prompt with relevant user memories
    const userMsg = messages[messages.length - 1];
    const augmentedPrompt = memoryService.buildAugmentedPrompt(
      systemPrompt,
      userMsg?.content ?? "",
    );

    const fullMessages = [
      ...(augmentedPrompt
        ? [{ role: "system" as const, content: augmentedPrompt }]
        : []),
      ...messages,
    ];

    // Save user message to DB
    if (conversationId && userMsg?.role === "user") {
      try {
        db.messages.create({
          id: crypto.randomUUID(),
          conversationId,
          role: "user",
          content: userMsg.content,
          createdAt: new Date().toISOString(),
        });
        db.conversations.updateTimestamp(conversationId);
      } catch {
        // DB may not be initialized yet
      }
    }

    let fullResponse = "";

    try {
      const stream = ollama.chatStream({ model, messages: fullMessages });
      for await (const chunk of stream) {
        if (chunk.done) {
          // Save assistant message to DB
          if (conversationId && fullResponse) {
            try {
              db.messages.create({
                id: crypto.randomUUID(),
                conversationId,
                role: "assistant",
                content: fullResponse,
                createdAt: new Date().toISOString(),
              });

              // Auto-generate title on first message
              const convMessages = db.messages.findByConversationId(
                conversationId,
              );
              if (convMessages.length <= 2) {
                const title = await ollama.generateTitle(
                  model,
                  userMsg?.content ?? "",
                );
                db.conversations.updateTitle(conversationId, title);
              }

              // RAG: Extract and store user memories in the background
              memoryService
                .extractAndStore(
                  model,
                  userMsg?.content ?? "",
                  fullResponse,
                  conversationId,
                )
                .catch(() => {});
            } catch {
              // DB errors shouldn't break streaming
            }
          }
          reply.raw.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          break;
        }

        const token = chunk.message?.content ?? "";
        fullResponse += token;
        reply.raw.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      reply.raw.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
    } finally {
      reply.raw.end();
    }

    return reply;
  });
}
