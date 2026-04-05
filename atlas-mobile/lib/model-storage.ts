import { documentDirectory, makeDirectoryAsync } from 'expo-file-system/legacy';

export const MODEL_DIR = `${documentDirectory ?? ''}atlas-models/`;

export async function ensureModelDirectory(): Promise<string> {
  await makeDirectoryAsync(MODEL_DIR, { intermediates: true });
  return MODEL_DIR;
}

export function buildModelPath(modelId: string, fileName: string): string {
  const safeModelId = modelId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${MODEL_DIR}${safeModelId}--${fileName}`;
}
