import { Cpu, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { type HealthStatus } from "@/app/lib/api";

export function ModelStatus({ health }: { health: HealthStatus | null }) {
    if (!health) {
        return (
            <Badge variant="outline" className="border-red-500 text-red-500 gap-1.5">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                Disconnected
            </Badge>
        );
    }

    const isGPU = health.ollama.gpu_available;

    return (
        <div className="flex items-center gap-2">
            <Badge
                variant="outline"
                className="gap-1.5 border-green-600/30 bg-green-500/10 text-green-500"
            >
                <div className="h-2 w-2 rounded-full bg-green-500" />
                Online
            </Badge>

            {isGPU ? (
                <Badge
                    variant="outline"
                    className="gap-1.5 border-purple-500/30 bg-purple-500/10 text-purple-400"
                    title={health.ollama.gpu_info || "GPU Acceleration"}
                >
                    <Zap className="h-3 w-3" />
                    GPU Active
                </Badge>
            ) : (
                <Badge
                    variant="secondary"
                    className="gap-1.5 text-muted-foreground"
                    title="Running on CPU"
                >
                    <Cpu className="h-3 w-3" />
                    CPU Mode
                </Badge>
            )}
        </div>
    );
}
