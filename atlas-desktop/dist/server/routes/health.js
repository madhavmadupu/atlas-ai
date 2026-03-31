"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = healthRoutes;
const ollama_service_1 = require("../services/ollama.service");
const os_1 = require("os");
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
async function healthRoutes(fastify) {
    const ollama = new ollama_service_1.OllamaService();
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
