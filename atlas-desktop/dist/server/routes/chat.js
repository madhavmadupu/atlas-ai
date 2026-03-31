"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRoutes = chatRoutes;
const ollama_service_1 = require("../services/ollama.service");
const db = __importStar(require("../db"));
const crypto_1 = __importDefault(require("crypto"));
async function chatRoutes(fastify) {
    const ollama = new ollama_service_1.OllamaService();
    fastify.post("/chat", async (request, reply) => {
        const { messages, model, conversationId, systemPrompt } = request.body;
        // Set SSE headers
        reply.raw.setHeader("Content-Type", "text/event-stream");
        reply.raw.setHeader("Cache-Control", "no-cache");
        reply.raw.setHeader("Connection", "keep-alive");
        reply.raw.setHeader("X-Accel-Buffering", "no");
        reply.raw.flushHeaders();
        const fullMessages = [
            ...(systemPrompt
                ? [{ role: "system", content: systemPrompt }]
                : []),
            ...messages,
        ];
        // Save user message to DB
        const userMsg = messages[messages.length - 1];
        if (conversationId && userMsg?.role === "user") {
            try {
                db.messages.create({
                    id: crypto_1.default.randomUUID(),
                    conversationId,
                    role: "user",
                    content: userMsg.content,
                    createdAt: new Date().toISOString(),
                });
                db.conversations.updateTimestamp(conversationId);
            }
            catch {
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
                                id: crypto_1.default.randomUUID(),
                                conversationId,
                                role: "assistant",
                                content: fullResponse,
                                createdAt: new Date().toISOString(),
                            });
                            // Auto-generate title on first message
                            const convMessages = db.messages.findByConversationId(conversationId);
                            if (convMessages.length <= 2) {
                                const title = await ollama.generateTitle(model, userMsg?.content ?? "");
                                db.conversations.updateTitle(conversationId, title);
                            }
                        }
                        catch {
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
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Unknown error";
            reply.raw.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
        }
        finally {
            reply.raw.end();
        }
        return reply;
    });
}
