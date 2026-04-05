import { initLlama } from 'llama.rn';
import type { LocalInferenceSettings, MessageRole } from '@/lib/types';

type ChatMessage = { role: MessageRole; content: string };

const STOP_WORDS = [
  '</s>',
  '<|end|>',
  '<|eot_id|>',
  '<|end_of_text|>',
  '<|im_end|>',
  '<|EOT|>',
  '<|END_OF_TURN_TOKEN|>',
  '<|end_of_turn|>',
  '<|endoftext|>',
];

type LlamaContext = Awaited<ReturnType<typeof initLlama>>;

class LocalLlamaEngine {
  private ctx: LlamaContext | null = null;
  private contextKey: string | null = null;
  private stopActive: (() => Promise<void> | void) | null = null;

  async ensureInitialized(modelPath: string, settings: LocalInferenceSettings) {
    const contextKey = JSON.stringify({
      modelPath,
      contextSize: settings.contextSize,
      gpuLayers: settings.gpuLayers,
      tier: settings.performanceTier,
    });

    if (this.ctx && this.contextKey === contextKey) return;
    await this.dispose();

    // llama.rn expects a file URI (file://...) for local files.
    // `modelPath` should already be a valid URI.
    try {
      this.ctx = await initLlama({
        model: modelPath,
        n_ctx: settings.contextSize,
        n_parallel: 1,
        // Try GPU where available; it will fall back if unsupported.
        n_gpu_layers: settings.gpuLayers,
        n_batch:
          settings.performanceTier === 'low'
            ? 128
            : settings.performanceTier === 'medium'
              ? 256
              : 512,
        use_mlock: true,
      });
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('install')) {
        throw new Error(
          'llama.rn is not available in the installed app build. Rebuild and reinstall the development build after native dependency changes.'
        );
      }
      throw error;
    }
    this.contextKey = contextKey;

    // Use parallel mode to get a per-request stop() handle.
    await this.ctx.parallel.configure({
      n_parallel: 1,
      n_batch:
        settings.performanceTier === 'low'
          ? 128
          : settings.performanceTier === 'medium'
            ? 256
            : 512,
    });
  }

  async chat(
    modelPath: string,
    messages: ChatMessage[],
    settings: LocalInferenceSettings,
    onToken: (token: string) => void
  ): Promise<void> {
    await this.ensureInitialized(modelPath, settings);
    if (!this.ctx) throw new Error('Local model not initialized');
    await this.ctx.clearCache(false);

    const req = await this.ctx.parallel.completion(
      {
        messages,
        n_predict: settings.maxTokens,
        temperature: settings.temperature,
        top_p: settings.topP,
        stop: STOP_WORDS,
      },
      (_requestId: number, data: { token?: string }) => {
        if (data.token) onToken(data.token);
      }
    );

    this.stopActive = req.stop;
    try {
      await req.promise;
    } finally {
      this.stopActive = null;
    }
  }

  async stop() {
    const stopFn = this.stopActive;
    this.stopActive = null;
    await stopFn?.();
  }

  async dispose() {
    this.stopActive = null;
    try {
      const releasable = this.ctx as unknown as { release?: () => Promise<void> };
      await releasable?.release?.();
    } catch {
      // ignore
    } finally {
      this.ctx = null;
      this.contextKey = null;
    }
  }
}

export const localLlamaEngine = new LocalLlamaEngine();
