import { localLlamaEngine } from './local-llama-engine';
import {
  readMemories,
  searchMemories,
  addMemory,
  type UserMemory,
  type MemoryCategory,
} from './memory-storage';
import type { LocalInferenceSettings } from './types';

const STOP_WORDS = new Set([
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'it', 'its', 'the', 'a', 'an',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'shall', 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'about', 'like', 'through', 'after', 'before', 'between',
  'out', 'up', 'down', 'and', 'but', 'or', 'nor', 'not', 'so', 'if', 'then',
  'than', 'too', 'very', 'just', 'that', 'this', 'these', 'those', 'what',
  'which', 'who', 'whom', 'how', 'when', 'where', 'why', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'some', 'any', 'no', 'only', 'own',
  'same', 'such', 'here', 'there', 'also', 'hi', 'hello', 'hey', 'thanks',
  'please', 'okay', 'ok', 'yes', 'no', 'yeah', 'sure', 'right',
]);

const EXTRACTION_PROMPT = `You are a memory extraction system. Analyze the conversation and extract key facts about the user.

Rules:
- Only extract facts the USER has directly stated or clearly implied about THEMSELVES
- Do NOT extract facts about what the AI said or general knowledge
- Each fact should be a single, concise statement
- Categorize each fact: preference, fact, interest, personality, context
- Generate relevant keywords for each fact (comma-separated)
- If no new facts can be extracted, return an empty array

Respond ONLY with a JSON array:
[{"category": "...", "content": "...", "keywords": "keyword1,keyword2,keyword3"}]`;

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

/**
 * Extract meaningful keywords from text for memory search.
 */
export function extractQueryWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Retrieve memories relevant to the current user message.
 */
export async function retrieveRelevantMemories(userMessage: string): Promise<UserMemory[]> {
  const words = extractQueryWords(userMessage);
  if (words.length === 0) {
    // Return recent memories as general context
    const all = await readMemories();
    return all.slice(0, 5);
  }

  const results = await searchMemories(words);

  // If keyword search returns few results, pad with recent memories
  if (results.length < 3) {
    const all = await readMemories();
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
 * Build a memory-augmented system prompt.
 */
export async function buildAugmentedPrompt(
  originalPrompt: string,
  userMessage: string
): Promise<string> {
  const memories = await retrieveRelevantMemories(userMessage);
  if (memories.length === 0) return originalPrompt;

  const memoryBlock = memories.map((m) => `- [${m.category}] ${m.content}`).join('\n');

  const memorySection = `\n\nYou have the following knowledge about this user from previous conversations. Use this to personalize your responses naturally — don't explicitly mention that you "remember" unless the user asks. Just incorporate the knowledge seamlessly:\n\n${memoryBlock}\n`;

  return (originalPrompt || 'You are Atlas AI, a helpful and personalized assistant.') +
    memorySection;
}

/**
 * Extract memories from a conversation exchange using the local LLM.
 * Runs in the background after the response is complete.
 */
export async function extractAndStoreMemories(
  modelPath: string,
  settings: LocalInferenceSettings,
  userMessage: string,
  assistantResponse: string,
  conversationId?: string
): Promise<void> {
  try {
    const conversationSnippet = `User: ${userMessage}\nAssistant: ${assistantResponse}`;

    let extractedText = '';
    await localLlamaEngine.chat(
      modelPath,
      [
        { role: 'system' as const, content: EXTRACTION_PROMPT },
        { role: 'user' as const, content: conversationSnippet },
      ],
      { ...settings, maxTokens: 512, temperature: 0.1 },
      (token) => {
        extractedText += token;
      }
    );

    // Parse JSON array from response
    const jsonMatch = extractedText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    const extracted: { category: string; content: string; keywords: string }[] =
      JSON.parse(jsonMatch[0]);

    if (!Array.isArray(extracted) || extracted.length === 0) return;

    const validCategories = new Set<MemoryCategory>([
      'preference',
      'fact',
      'interest',
      'personality',
      'context',
    ]);

    const now = new Date().toISOString();

    for (const item of extracted) {
      if (!validCategories.has(item.category as MemoryCategory) || !item.content?.trim()) {
        continue;
      }

      await addMemory({
        id: generateId(),
        category: item.category as MemoryCategory,
        content: item.content.trim(),
        keywords: (item.keywords ?? '').trim(),
        sourceConversationId: conversationId ?? null,
        confidence: 0.8,
        createdAt: now,
        updatedAt: now,
      });
    }
  } catch {
    // Memory extraction is best-effort — never break the chat flow
  }
}

/**
 * Extract memories via the desktop API (when using desktop inference).
 * The desktop server handles extraction internally, but this can be used
 * to fetch and sync memories from the desktop.
 */
export async function fetchDesktopMemories(baseUrl: string): Promise<UserMemory[]> {
  try {
    const res = await fetch(`${baseUrl}/api/memories`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data)
      ? data.map((m: any) => ({
          id: m.id,
          category: m.category,
          content: m.content,
          keywords: m.keywords,
          sourceConversationId: m.source_conversation_id,
          confidence: m.confidence,
          createdAt: m.created_at,
          updatedAt: m.updated_at,
        }))
      : [];
  } catch {
    return [];
  }
}
