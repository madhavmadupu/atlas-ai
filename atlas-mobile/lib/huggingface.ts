import { selectGgufForTier } from '@/lib/local-inference';
import type { DevicePerformanceTier } from '@/lib/types';

export interface HuggingFaceModelSummary {
  id: string;
  modelId: string;
  downloads: number;
  pipeline_tag?: string;
  tags: string[];
  lastModified: string;
  private?: boolean;
  siblings?: HuggingFaceModelFile[];
}

export interface HuggingFaceModelFile {
  rfilename: string;
  size: number;
  sha: string;
  path?: string;
}

const API_BASE = 'https://huggingface.co/api';

function buildHeaders(token?: string): HeadersInit | undefined {
  if (!token) return undefined;
  return { Authorization: `Bearer ${token}` };
}

export async function searchHuggingFaceModels(
  query: string,
  token?: string
): Promise<HuggingFaceModelSummary[]> {
  if (!query) return [];
  const res = await fetch(
    `${API_BASE}/models?search=${encodeURIComponent(query)}&sort=downloads&limit=20`,
    {
      headers: buildHeaders(token),
    }
  );
  if (!res.ok) {
    throw new Error('Failed to search Hugging Face');
  }
  const data: HuggingFaceModelSummary[] = await res.json();
  return data;
}

export async function fetchModelFiles(
  modelId: string,
  token?: string
): Promise<HuggingFaceModelFile[]> {
  const res = await fetch(`${API_BASE}/models/${encodeURIComponent(modelId)}?full=true`, {
    headers: buildHeaders(token),
  });
  if (!res.ok) {
    throw new Error('Unable to fetch model files');
  }
  const data: HuggingFaceModelSummary = await res.json();
  return data.siblings ?? [];
}

export function pickBestGguf(
  files: HuggingFaceModelFile[],
  tier: DevicePerformanceTier,
  preferredQuantization?: string
): HuggingFaceModelFile | null {
  const ggufFiles = files.filter((f) => f.rfilename.toLowerCase().endsWith('.gguf'));
  const preferredName = selectGgufForTier(
    ggufFiles.map((file) => file.rfilename),
    tier,
    preferredQuantization
  );

  if (preferredName) {
    const match = ggufFiles.find((file) => file.rfilename === preferredName);
    if (match) return match;
  }

  return ggufFiles.sort((a, b) => a.size - b.size)[0] ?? null;
}
