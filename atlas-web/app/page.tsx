"use client";

import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner"; // Use sonner directly or via hook if configured

import {
  chatStreamFetch,
  checkHealth,
  deleteDocument,
  listDocuments,
  uploadDocument,
  type ChatMessage as ChatMessageType,
  type DocumentInfo,
  type HealthStatus,
} from "@/app/lib/api";

import { ChatInput } from "@/app/components/chat-input";
import { ChatMessage } from "@/app/components/chat-message";
import { ChatSidebar } from "@/app/components/chat-sidebar";
import { DocumentUpload } from "@/app/components/document-upload";
import { ModelStatus } from "@/app/components/model-status";

export default function Home() {
  // State
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // const { toast } = useToast(); // Commented out until toaster is installed

  // Initial load
  useEffect(() => {
    refreshHealth();
    refreshDocuments();

    // Welcome message
    setMessages([
      {
        role: "assistant",
        content: "Hello! I'm Atlas-AI, your local assistant. How can I help you today?",
      },
    ]);
  }, []);

  // Poll health every 30s
  useEffect(() => {
    const interval = setInterval(refreshHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function refreshHealth() {
    try {
      const status = await checkHealth();
      setHealth(status);
    } catch (e) {
      setHealth(null);
    }
  }

  async function refreshDocuments() {
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch (e) {
      console.error("Failed to load docs", e);
    }
  }

  async function handleSubmit() {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    setIsLoading(true);

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);

    try {
      // Create placeholder for assistant response
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      // Stream response
      const generator = chatStreamFetch(userMsg);
      let fullContent = "";
      let sources = undefined;

      for await (const chunk of generator) {
        if (chunk.token) {
          fullContent += chunk.token;
          setMessages((prev) => {
            const newMsgs = [...prev];
            const lastMsg = newMsgs[newMsgs.length - 1];
            lastMsg.content = fullContent;
            return newMsgs;
          });
        }
        if (chunk.sources) {
          sources = chunk.sources;
        }
      }

      // Final update with sources
      setMessages((prev) => {
        const newMsgs = [...prev];
        const lastMsg = newMsgs[newMsgs.length - 1];
        lastMsg.content = fullContent;
        lastMsg.sources = sources;
        return newMsgs;
      });
    } catch (error) {
      console.error("Chat error", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please ensure the backend is running.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpload(file: File) {
    try {
      await uploadDocument(file);
      await refreshDocuments();
      toast.success(`Document uploaded: ${file.name}`);
    } catch (error) {
      console.error("Upload error", error);
      toast.error("Upload failed");
    }
  }

  async function handleDeleteDocument(id: string) {
    try {
      await deleteDocument(id);
      await refreshDocuments();
    } catch (error) {
      console.error("Delete error", error);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Sidebar (Desktop) */}
      <aside className="hidden w-[280px] flex-col border-r md:flex">
        <ChatSidebar
          documents={documents}
          onDeleteDocument={handleDeleteDocument}
          onNewChat={() => setMessages([])}
          className="h-full"
        />
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[280px]">
                <ChatSidebar
                  documents={documents}
                  onDeleteDocument={handleDeleteDocument}
                  onNewChat={() => null}
                  className="h-full border-none"
                />
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-semibold tracking-tight">Atlas-AI</h1>
          </div>
          <ModelStatus health={health} />
        </header>

        {/* Chat Area */}
        <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollRef}>
          <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-4">
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm ml-12">
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce delay-75" />
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce delay-150" />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 md:p-6 border-t bg-background/50 backdrop-blur supports-backdrop-filter:bg-background/50">
          <div className="mx-auto max-w-4xl">
            <ChatInput
              input={input}
              setInput={setInput}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              onUploadClick={() => setIsUploadOpen(true)}
            />
            <div className="mt-2 text-center text-xs text-muted-foreground">
              Atlas-AI runs locally. Responses are generated on your device.
            </div>
          </div>
        </div>
      </main>

      <DocumentUpload
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onUpload={handleUpload}
      />
      <Toaster />
    </div>
  );
}
