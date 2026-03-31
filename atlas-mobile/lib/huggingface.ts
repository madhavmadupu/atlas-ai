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

export function pickBestGguf(files: HuggingFaceModelFile[]): HuggingFaceModelFile | null {
  const ggufFiles = files
    .filter((f) => f.rfilename.toLowerCase().endsWith('.gguf'))
    .sort((a, b) => b.size - a.size);
  return ggufFiles[0] ?? null;
}
