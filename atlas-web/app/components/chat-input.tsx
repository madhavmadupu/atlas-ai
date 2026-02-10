import { ArrowUp, Paperclip } from "lucide-react";
import { KeyboardEvent, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
    input: string;
    setInput: (value: string) => void;
    onSubmit: () => void;
    isLoading: boolean;
    onUploadClick: () => void;
}

export function ChatInput({
    input,
    setInput,
    onSubmit,
    isLoading,
    onUploadClick,
}: ChatInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
        }
    };

    return (
        <div className="relative flex w-full max-w-4xl flex-col gap-2 rounded-xl border bg-background p-4 shadow-sm focus-within:ring-1 focus-within:ring-ring">
            <Textarea
                ref={textareaRef}
                placeholder="Message Atlas-AI..."
                className="min-h-[40px] w-full resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
            />

            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={onUploadClick}
                    title="Upload knowledge"
                >
                    <Paperclip className="h-4 w-4" />
                </Button>

                <Button
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={onSubmit}
                    disabled={!input.trim() || isLoading}
                >
                    <ArrowUp className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
