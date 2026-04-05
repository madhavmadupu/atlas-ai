import { FastifyInstance } from "fastify";
import * as db from "../db";

export async function memoryRoutes(fastify: FastifyInstance) {
  // Get all memories (optionally filter by category)
  fastify.get<{ Querystring: { category?: string } }>(
    "/memories",
    async (request) => {
      const { category } = request.query;
      if (category) {
        return db.memories.findByCategory(category);
      }
      return db.memories.findAll();
    },
  );

  // Search memories by query text
  fastify.get<{ Querystring: { q: string } }>(
    "/memories/search",
    async (request) => {
      const { q } = request.query;
      if (!q) return [];
      const words = q
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2);
      return db.memories.search(words);
    },
  );

  // Create a memory manually
  fastify.post<{
    Body: {
      category: string;
      content: string;
      keywords?: string;
    };
  }>("/memories", async (request, reply) => {
    const { category, content, keywords } = request.body;
    const validCategories = [
      "preference",
      "fact",
      "interest",
      "personality",
      "context",
    ];
    if (!validCategories.includes(category)) {
      return reply.status(400).send({ error: "Invalid category" });
    }
    if (!content?.trim()) {
      return reply.status(400).send({ error: "Content is required" });
    }

    const existing = db.memories.findDuplicate(content.trim());
    if (existing) {
      return reply.status(409).send({ error: "Similar memory already exists", existing });
    }

    const id = crypto.randomUUID();
    db.memories.create({
      id,
      category,
      content: content.trim(),
      keywords: keywords ?? "",
      confidence: 1.0, // Manual memories get full confidence
    });

    return { id, status: "created" };
  });

  // Update a memory
  fastify.put<{
    Params: { id: string };
    Body: { content?: string; keywords?: string; confidence?: number };
  }>("/memories/:id", async (request, reply) => {
    const { id } = request.params;
    const { content, keywords, confidence } = request.body;
    db.memories.update(id, { content, keywords, confidence });
    return { status: "updated" };
  });

  // Delete a memory
  fastify.delete<{ Params: { id: string } }>(
    "/memories/:id",
    async (request) => {
      db.memories.delete(request.params.id);
      return { status: "deleted" };
    },
  );
}
