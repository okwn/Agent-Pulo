// safety/src/errors.ts — Safety-specific error types

import type { SafetyFlag } from './types.js';

export class SafetyBlockError extends Error {
  readonly flag: SafetyFlag;
  readonly reason: string;
  readonly confidence: number;
  readonly userFacingMessage: string;

  constructor(
    flag: SafetyFlag,
    reason: string,
    userFacingMessage: string,
    confidence = 1.0
  ) {
    super(`[${flag}] ${reason}`);
    this.name = 'SafetyBlockError';
    this.flag = flag;
    this.reason = reason;
    this.userFacingMessage = userFacingMessage;
    this.confidence = confidence;
  }

  toJSON() {
    return {
      name: this.name,
      flag: this.flag,
      reason: this.reason,
      userFacingMessage: this.userFacingMessage,
      confidence: this.confidence,
    };
  }
}

export class SafetyConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SafetyConfigError';
  }
}
