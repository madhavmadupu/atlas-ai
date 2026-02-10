import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { DocumentInfo } from "@/app/lib/api";

interface ChatSidebarProps {
    documents: DocumentInfo[];
    onDeleteDocument: (id: string) => void;
    onNewChat: () => void;
    className?: string;
}

export function ChatSidebar({
    documents,
    onDeleteDocument,
    onNewChat,
    className,
}: ChatSidebarProps) {
    return (
        <div className={cn("flex h-full flex-col border-r bg-muted/10", className)}>
            <div className="p-4">
                <Button
                    onClick={onNewChat}
                    className="w-full justify-start gap-2"
                    variant="outline"
                >
                    <Plus className="h-4 w-4" />
                    New Chat
                </Button>
            </div>

            <Separator />

            <div className="p-4 font-medium text-sm text-muted-foreground">
                Knowledge Base
            </div>

            <ScrollArea className="flex-1 px-4">
                <div className="flex flex-col gap-2 pb-4">
                    {documents.length === 0 ? (
                        <div className="text-xs text-muted-foreground italic text-center py-4">
                            No documents uploaded.
                            <br />
                            Upload PDF/TXT/MD to query them.
                        </div>
                    ) : (
                        documents.map((doc) => (
                            <div
                                key={doc.doc_id}
                                className="group flex items-center justify-between rounded-md border bg-background p-2 text-sm shadow-sm transition-colors hover:bg-accent"
                            >
                                <div className="flex flex-col overflow-hidden">
                                    <span className="truncate font-medium">{doc.filename}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {doc.chunk_count} chunks
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                                    onClick={() => onDeleteDocument(doc.doc_id)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            <Separator />

            <div className="p-4 text-xs text-muted-foreground text-center">
                Atlas-AI v0.1.0
            </div>
        </div>
    );
}

// Mobile sidebar drawer
export function ChatSidebarMobile({ children }: { children: React.ReactNode }) {
    return (
        <Sheet>
            <SheetTrigger asChild>{children}</SheetTrigger>
            <SheetContent side="left" className="p-0 w-[300px]">
                {/* Content injected here via composition or props in real usage */}
                {/* For now we just render a placeholder, logic moves to page.tsx */}
                <SheetHeader className="p-4">
                    <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
            </SheetContent>
        </Sheet>
    );
}
