import crypto from "crypto";
import * as db from "../db";
import { OllamaService } from "./ollama.service";

const EXTRACTION_PROMPT = `You are a memory extraction system. Analyze the conversation and extract key facts about the user.

Rules:
- Only extract facts the USER has directly stated or clearly implied about THEMSELVES
- Do NOT extract facts about what the AI said or general knowledge
- Each fact should be a single, concise statement
- Categorize each fact into one of: preference, fact, interest, personality, context
- Generate relevant keywords for each fact (comma-separated)
- If no new facts can be extracted, return an empty array

Categories:
- preference: Things the user likes, dislikes, or prefers (e.g., "Prefers dark mode", "Likes Python over Java")
- fact: Concrete facts about the user (e.g., "Works as a software engineer", "Lives in San Francisco")
- interest: Topics or activities the user is interested in (e.g., "Interested in machine learning", "Plays guitar")
- personality: Behavioral traits or communication style (e.g., "Prefers concise answers", "Enjoys detailed explanations")
- context: Situational context about what the user is working on (e.g., "Building a React app", "Studying for exams")

Respond ONLY with a JSON array:
[{"category": "...", "content": "...", "keywords": "keyword1,keyword2,keyword3"}]`;

// Common words to exclude from keyword matching
const STOP_WORDS = new Set([
  "i", "me", "my", "we", "our", "you", "your", "it", "its", "the", "a", "an",
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "will", "would", "could", "should", "may", "might",
  "shall", "can", "to", "of", "in", "for", "on", "with", "at", "by", "from",
  "as", "into", "about", "like", "through", "after", "before", "between",
  "out", "up", "down", "and", "but", "or", "nor", "not", "so", "if", "then",
  "than", "too", "very", "just", "that", "this", "these", "those", "what",
  "which", "who", "whom", "how", "when", "where", "why", "all", "each",
  "every", "both", "few", "more", "most", "some", "any", "no", "only", "own",
  "same", "such", "here", "there", "also", "hi", "hello", "hey", "thanks",
  "please", "okay", "ok", "yes", "no", "yeah", "sure", "right",
]);

export class MemoryService {
  private ollama: OllamaService;

  constructor(ollama?: OllamaService) {
    this.ollama = ollama ?? new OllamaService();
  }

  /**
   * Extract meaningful query words from a user message for memory retrieval.
   */
  extractQueryWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  }

  /**
   * Retrieve memories relevant to the current user message.
   */
  retrieveRelevant(userMessage: string): db.UserMemory[] {
    const words = this.extractQueryWords(userMessage);
    if (words.length === 0) {
      // Return recent memories as general context
      return db.memories.findAll().slice(0, 5);
    }
    const results = db.memories.search(words);
    // If keyword search returns few results, pad with recent memories
    if (results.length < 3) {
      const all = db.memories.findAll();
      const existingIds = new Set(results.map((m) => m.id));
      for (const m of all) {
        if (!existingIds.has(m.id)) {
          results.push(m);
          if (results.length >= 5) break;
        }
      }
    }
    return results;
  }

  /**
   * Build a memory-augmented system prompt by injecting relevant memories.
   */
  buildAugmentedPrompt(
    originalPrompt: string | undefined,
    userMessage: string,
  ): string {
    const relevantMemories = this.retrieveRelevant(userMessage);
    if (relevantMemories.length === 0) {
      return originalPrompt ?? "";
    }

    const memoryBlock = relevantMemories
      .map((m) => `- [${m.category}] ${m.content}`)
      .join("\n");

    const memorySection = `\n\nYou have the following knowledge about this user from previous conversations. Use this to personalize your responses naturally — don't explicitly mention that you "remember" unless the user asks. Just incorporate the knowledge seamlessly:\n\n${memoryBlock}\n`;

    if (originalPrompt) {
      return originalPrompt + memorySection;
    }
    return `You are Atlas AI, a helpful and personalized assistant.${memorySection}`;
  }

  /**
   * Extract new memories from a conversation exchange using the LLM.
   * Runs asynchronously after the response is sent — does not block chat.
   */
  async extractAndStore(
    model: string,
    userMessage: string,
    assistantResponse: string,
    conversationId?: string,
  ): Promise<void> {
    try {
      const conversationSnippet = `User: ${userMessage}\nAssistant: ${assistantResponse}`;

      const res = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          system: EXTRACTION_PROMPT,
          prompt: conversationSnippet,
          stream: false,
          options: {
            temperature: 0.1,
            num_predict: 512,
          },
        }),
      });

      if (!res.ok) return;

      const data: any = await res.json();
      const responseText = (data.response ?? "").trim();

      // Parse JSON array from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return;

      const extracted: {
        category: string;
        content: string;
        keywords: string;
      }[] = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(extracted) || extracted.length === 0) return;

      const validCategories = new Set([
        "preference",
        "fact",
        "interest",
        "personality",
        "context",
      ]);

      for (const item of extracted) {
        if (!validCategories.has(item.category) || !item.content?.trim()) {
          continue;
        }

        // Skip if a very similar memory already exists
        const duplicate = db.memories.findDuplicate(item.content.trim());
        if (duplicate) {
          // Boost confidence of existing memory
          db.memories.update(duplicate.id, {
            confidence: Math.min(1, duplicate.confidence + 0.05),
          });
          continue;
        }

        db.memories.create({
          id: crypto.randomUUID(),
          category: item.category,
          content: item.content.trim(),
          keywords: (item.keywords ?? "").trim(),
          sourceConversationId: conversationId,
          confidence: 0.8,
        });
      }
    } catch {
      // Memory extraction is best-effort — never break the chat flow
    }
  }
}
