"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
exports.stopServer = stopServer;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const static_1 = __importDefault(require("@fastify/static"));
const health_1 = require("./routes/health");
const chat_1 = require("./routes/chat");
const conversations_1 = require("./routes/conversations");
const models_1 = require("./routes/models");
const settings_1 = require("./routes/settings");
const db_1 = require("./db");
const os_1 = require("os");
const server = (0, fastify_1.default)({
    logger: {
        level: "info",
    },
});
function getLanIP() {
    const nets = (0, os_1.networkInterfaces)();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name] ?? []) {
            if (net.family === "IPv4" && !net.internal)
                return net.address;
        }
    }
    return null;
}
async function startServer({ port = 3001, host = "0.0.0.0", staticDir, } = {}) {
    // Initialize database
    (0, db_1.initDb)();
    // Register CORS — allow all origins (all requests are local)
    await server.register(cors_1.default, {
        origin: true,
        methods: ["GET", "POST", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Accept", "Cache-Control"],
    });
    // Register API routes
    await server.register(health_1.healthRoutes, { prefix: "/api" });
    await server.register(chat_1.chatRoutes, { prefix: "/api" });
    await server.register(conversations_1.conversationRoutes, { prefix: "/api" });
    await server.register(models_1.modelsRoutes, { prefix: "/api" });
    await server.register(settings_1.settingsRoutes, { prefix: "/api" });
    // Serve the static Next.js export (UI)
    if (staticDir) {
        const fs = require("fs");
        const pathMod = require("path");
        await server.register(static_1.default, {
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
async function stopServer() {
    (0, db_1.closeDb)();
    await server.close();
}
//# sourceMappingURL=index.js.map