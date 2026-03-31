import { FastifyInstance } from "fastify";
import * as db from "../db";

interface CreateConversationBody {
  id: string;
  title: string;
  model: string;
  systemPrompt?: string;
  createdAt: string;
  updatedAt: string;
}

export async function conversationRoutes(fastify: FastifyInstance) {
  // List all conversations
  fastify.get("/conversations", async () => {
    return db.conversations.findMany();
  });

  // Get single conversation with messages
  fastify.get<{ Params: { id: string } }>(
    "/conversations/:id",
    async (request) => {
      const conv = db.conversations.findById(request.params.id);
      if (!conv) {
        return { error: "Not found" };
      }
      const msgs = db.messages.findByConversationId(request.params.id);
      return { ...conv, messages: msgs };
    },
  );

  // Create conversation
  fastify.post<{ Body: CreateConversationBody }>(
    "/conversations",
    async (request) => {
      db.conversations.create(request.body);
      return { success: true, id: request.body.id };
    },
  );

  // Delete conversation
  fastify.delete<{ Params: { id: string } }>(
    "/conversations/:id",
    async (request) => {
      db.conversations.delete(request.params.id);
      return { success: true };
    },
  );
}
