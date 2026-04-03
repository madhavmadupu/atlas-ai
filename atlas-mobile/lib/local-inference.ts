import type { DevicePerformanceTier, LocalInferenceSettings } from '@/lib/types';

export interface TierRecommendation {
  id: string;
  title: string;
  description: string;
  target: string;
  repoId: string;
  suggestedQuantization: string;
  estimatedSize: string;
  tier: DevicePerformanceTier;
}

export const DEFAULT_SYSTEM_PROMPT =
  'You are Atlas AI, a private offline assistant running locally on the user device. Give concise, accurate answers and say when you are unsure.';

export const LOCAL_INFERENCE_PRESETS: Record<DevicePerformanceTier, LocalInferenceSettings> = {
  low: {
    performanceTier: 'low',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 256,
    contextSize: 2048,
    gpuLayers: 0,
  },
  medium: {
    performanceTier: 'medium',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    temperature: 0.7,
    topP: 0.92,
    maxTokens: 384,
    contextSize: 3072,
    gpuLayers: 32,
  },
  high: {
    performanceTier: 'high',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    temperature: 0.7,
    topP: 0.95,
    maxTokens: 512,
    contextSize: 4096,
    gpuLayers: 99,
  },
};

export const TIER_RECOMMENDATIONS: TierRecommendation[] = [
  {
    id: 'low-qwen25-15b',
    title: 'Qwen2.5 1.5B Instruct',
    description: 'Best default for older phones and small storage budgets.',
    target: 'Low-end phones',
    repoId: 'bartowski/Qwen2.5-1.5B-Instruct-GGUF',
    suggestedQuantization: 'Q4_K_M',
    estimatedSize: 'About 1 GB',
    tier: 'low',
  },
  {
    id: 'medium-qwen25-3b',
    title: 'Qwen2.5 3B Instruct',
    description: 'Balanced quality and speed for most mid-range devices.',
    target: 'Mid-range phones',
    repoId: 'bartowski/Qwen2.5-3B-Instruct-GGUF',
    suggestedQuantization: 'Q4_K_M',
    estimatedSize: 'About 2 GB',
    tier: 'medium',
  },
  {
    id: 'high-qwen25-7b',
    title: 'Qwen2.5 7B Instruct',
    description: 'Higher quality if the phone has strong RAM and thermals.',
    target: 'High-end phones',
    repoId: 'bartowski/Qwen2.5-7B-Instruct-GGUF',
    suggestedQuantization: 'Q4_K_M',
    estimatedSize: 'About 4.5 GB',
    tier: 'high',
  },
];

const QUANTIZATION_PREFERENCES: Record<DevicePerformanceTier, string[]> = {
  low: ['Q4_K_M', 'Q4_0', 'Q4_K_S', 'IQ4_XS', 'Q5_K_S', 'Q5_0', 'Q8_0', 'F16'],
  medium: ['Q4_K_M', 'Q5_K_M', 'Q5_0', 'Q6_K', 'Q8_0', 'F16'],
  high: ['Q5_K_M', 'Q6_K', 'Q8_0', 'Q4_K_M', 'F16'],
};

export function buildSettingsForTier(
  tier: DevicePerformanceTier,
  previous?: Partial<LocalInferenceSettings>
): LocalInferenceSettings {
  const preset = LOCAL_INFERENCE_PRESETS[tier];
  return {
    ...preset,
    ...previous,
    performanceTier: tier,
    systemPrompt: previous?.systemPrompt?.trim() ? previous.systemPrompt : preset.systemPrompt,
  };
}

export function getTierLabel(tier: DevicePerformanceTier): string {
  if (tier === 'low') return 'Low';
  if (tier === 'medium') return 'Medium';
  return 'High';
}

export function selectGgufForTier(
  fileNames: string[],
  tier: DevicePerformanceTier,
  preferredQuantization?: string
): string | null {
  const preferred = preferredQuantization ? [preferredQuantization] : [];
  const priorities = [...preferred, ...QUANTIZATION_PREFERENCES[tier]];
  const normalized = fileNames.filter((name) => name.toLowerCase().endsWith('.gguf'));

  for (const quant of priorities) {
    const match = normalized.find((name) => name.toUpperCase().includes(quant.toUpperCase()));
    if (match) return match;
  }

  return normalized[0] ?? null;
}
