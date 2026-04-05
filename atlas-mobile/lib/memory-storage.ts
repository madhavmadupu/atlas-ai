import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@atlas/user-memories/v1';

export type MemoryCategory = 'preference' | 'fact' | 'interest' | 'personality' | 'context';

export interface UserMemory {
  id: string;
  category: MemoryCategory;
  content: string;
  keywords: string;
  sourceConversationId: string | null;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

interface MemoryState {
  memories: UserMemory[];
}

const EMPTY_STATE: MemoryState = { memories: [] };

export async function readMemories(): Promise<UserMemory[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MemoryState;
    return parsed.memories ?? [];
  } catch {
    return [];
  }
}

export async function writeMemories(memories: UserMemory[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ memories }));
}

export async function addMemory(memory: UserMemory): Promise<void> {
  const existing = await readMemories();
  // Check for duplicate (case-insensitive exact match)
  const duplicate = existing.find(
    (m) => m.content.toLowerCase() === memory.content.toLowerCase()
  );
  if (duplicate) {
    // Boost confidence instead of adding duplicate
    duplicate.confidence = Math.min(1, duplicate.confidence + 0.05);
    duplicate.updatedAt = new Date().toISOString();
    await writeMemories(existing);
    return;
  }
  await writeMemories([memory, ...existing]);
}

export async function deleteMemory(id: string): Promise<void> {
  const existing = await readMemories();
  await writeMemories(existing.filter((m) => m.id !== id));
}

export async function searchMemories(queryWords: string[]): Promise<UserMemory[]> {
  if (queryWords.length === 0) return [];
  const all = await readMemories();

  // Score each memory by keyword and content matches
  const scored = all.map((memory) => {
    let score = 0;
    const lowerKeywords = memory.keywords.toLowerCase();
    const lowerContent = memory.content.toLowerCase();

    for (const word of queryWords) {
      if (lowerKeywords.includes(word)) score += 2;
      if (lowerContent.includes(word)) score += 1;
    }
    return { memory, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.memory.confidence - a.memory.confidence)
    .slice(0, 10)
    .map((s) => s.memory);
}
