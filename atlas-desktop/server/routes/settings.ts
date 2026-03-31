import { FastifyInstance } from "fastify";
import * as db from "../db";

export async function settingsRoutes(fastify: FastifyInstance) {
  // Get all settings
  fastify.get("/settings", async () => {
    return db.settings.getAll();
  });

  // Get single setting
  fastify.get<{ Params: { key: string } }>(
    "/settings/:key",
    async (request) => {
      const value = db.settings.get(request.params.key);
      return { key: request.params.key, value: value ?? null };
    },
  );

  // Update a setting
  fastify.post<{ Body: { key: string; value: string | boolean | number } }>(
    "/settings",
    async (request) => {
      const { key, value } = request.body;
      db.settings.set(key, String(value));
      return { success: true };
    },
  );
}
