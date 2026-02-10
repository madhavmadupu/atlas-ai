import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChatMessage as ChatMessageType } from "@/app/lib/api";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
    message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === "user";

    return (
        <div
            className={cn(
                "flex w-full gap-4 p-4 md:px-8",
                isUser ? "bg-background" : "bg-muted/30"
            )}
        >
            <Avatar className={cn("h-8 w-8 border", isUser ? "order-2" : "order-1")}>
                {isUser ? (
                    <>
                        <AvatarImage src="/user-avatar.png" alt="User" />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                            <User className="h-4 w-4" />
                        </AvatarFallback>
                    </>
                ) : (
                    <>
                        <AvatarImage src="/atlas-logo.png" alt="Atlas" />
                        <AvatarFallback className="bg-blue-600 text-white">
                            <Bot className="h-4 w-4" />
                        </AvatarFallback>
                    </>
                )}
            </Avatar>

            <div
                className={cn(
                    "flex flex-col gap-2 min-w-0 max-w-[85%]",
                    isUser ? "order-1 items-end" : "order-2 items-start"
                )}
            >
                <div className="prose prose-zinc dark:prose-invert max-w-none wrap-break-word">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            pre: ({ node, ...props }) => (
                                <div className="overflow-auto rounded-lg bg-zinc-900 p-4 my-2">
                                    <pre {...props} />
                                </div>
                            ),
                            code: ({ node, ...props }) => (
                                <code className="bg-zinc-800 rounded px-1 py-0.5" {...props} />
                            ),
                        }}
                    >
                        {message.content}
                    </ReactMarkdown>
                </div>

                {/* Source Citations */}
                {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                        {message.sources.map((source, i) => (
                            <Card key={i} className="bg-background/50 text-xs">
                                <CardHeader className="p-3 pb-1">
                                    <CardTitle className="text-xs font-medium text-muted-foreground truncate">
                                        {source.filename}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 pt-1">
                                    <p className="line-clamp-2 text-muted-foreground/80 italic">
                                        "{source.preview}"
                                    </p>
                                    <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                                        <span>Relevance: {(source.score * 100).toFixed(0)}%</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
