// llm/src/router.ts — Model router — selects model based on run type

import type { LlmProvider } from './providers/base.js';
import type { LlmMode, LlmRunType } from './types.js';
import { RUN_TYPE_MODEL_MAP, DEFAULT_SMALL_MODEL, DEFAULT_LARGE_MODEL, MODEL_CONFIGS } from './types.js';

export interface RouterConfig {
  mode: LlmMode;
  smallModel?: string;
  largeModel?: string;
}

export class ModelRouter {
  private mode: LlmMode;
  private smallModel: string;
  private largeModel: string;

  constructor(config: RouterConfig) {
    this.mode = config.mode;
    this.smallModel = config.smallModel ?? DEFAULT_SMALL_MODEL;
    this.largeModel = config.largeModel ?? DEFAULT_LARGE_MODEL;
  }

  /**
   * Get the model ID to use for a given run type.
   */
  modelForRunType(runType: LlmRunType): string {
    const tier = RUN_TYPE_MODEL_MAP[runType] ?? 'small';
    const modelKey = tier === 'large' ? this.largeModel : this.smallModel;
    return MODEL_CONFIGS[modelKey]?.id ?? modelKey;
  }

  /**
   * Whether to use the large model for a given run type.
   */
  isLargeModel(runType: LlmRunType): boolean {
    return RUN_TYPE_MODEL_MAP[runType] === 'large';
  }

  /**
   * All known model configs as map of model key → config.
   */
  availableModels(): Record<string, { id: string; tier: 'small' | 'large' }> {
    return {
      'gpt-4o-mini': { id: MODEL_CONFIGS['gpt-4o-mini']!.id, tier: 'small' },
      'gpt-4o': { id: MODEL_CONFIGS['gpt-4o']!.id, tier: 'large' },
      'claude-haiku': { id: MODEL_CONFIGS['claude-haiku']!.id, tier: 'small' },
      'claude-sonnet': { id: MODEL_CONFIGS['claude-sonnet']!.id, tier: 'large' },
    };
  }

  getMode(): LlmMode {
    return this.mode;
  }

  setMode(mode: LlmMode): void {
    this.mode = mode;
  }
}

export function createRouter(): ModelRouter {
  const mode = (process.env.PULO_LLM_MODE ?? 'mock') as LlmMode;
  return new ModelRouter({
    mode,
    smallModel: process.env.PULO_DEFAULT_SMALL_MODEL ?? DEFAULT_SMALL_MODEL,
    largeModel: process.env.PULO_DEFAULT_LARGE_MODEL ?? DEFAULT_LARGE_MODEL,
  });
}

export const modelRouter = createRouter();