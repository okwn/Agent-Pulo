// farcaster/errors.ts — Strict error hierarchy for all Far provider failures

export class FarError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'FarError';
  }
}

// ─── Authentication / Credentials ────────────────────────────────────────────

export class MissingCredentialsError extends FarError {
  constructor(provider: string, missingKey: string) {
    super(
      `Missing ${missingKey} for ${provider} provider. Set ${missingKey} in environment.`,
      'FAR_E001',
      500,
      false
    );
    this.name = 'MissingCredentialsError';
  }
}

export class InvalidCredentialsError extends FarError {
  constructor(provider: string) {
    super(`Invalid credentials for ${provider}. Check your API keys.`, 'FAR_E002', 401, false);
    this.name = 'InvalidCredentialsError';
  }
}

export class SignerError extends FarError {
  constructor(message: string, code = 'FAR_E003') {
    super(message, code, 403, false);
    this.name = 'SignerError';
  }
}

// ─── Read Operations ──────────────────────────────────────────────────────────

export class CastNotFoundError extends FarError {
  constructor(hash: string) {
    super(`Cast not found: ${hash}`, 'FAR_E010', 404, false);
    this.name = 'CastNotFoundError';
  }
}

export class UserNotFoundError extends FarError {
  constructor(identifier: string) {
    super(`User not found: ${identifier}`, 'FAR_E011', 404, false);
    this.name = 'UserNotFoundError';
  }
}

export class ChannelNotFoundError extends FarError {
  constructor(channelId: string) {
    super(`Channel not found: ${channelId}`, 'FAR_E012', 404, false);
    this.name = 'ChannelNotFoundError';
  }
}

export class RateLimitError extends FarError {
  constructor(provider: string, retryAfterMs?: number) {
    super(`Rate limited by ${provider}${retryAfterMs ? `, retry after ${retryAfterMs}ms` : ''}`, 'FAR_E020', 429, true);
    this.name = 'RateLimitError';
  }
}

// ─── Write Operations ────────────────────────────────────────────────────────

export class PublishError extends FarError {
  constructor(hash: string, cause?: string) {
    super(`Failed to publish cast${cause ? `: ${cause}` : ''}`, 'FAR_E030', 500, true);
    this.name = 'PublishError';
  }
}

export class DeleteError extends FarError {
  constructor(hash: string) {
    super(`Failed to delete cast ${hash}`, 'FAR_E031', 500, false);
    this.name = 'DeleteError';
  }
}

// ─── Webhook ─────────────────────────────────────────────────────────────────

export class WebhookVerificationError extends FarError {
  constructor(reason: string) {
    super(`Webhook verification failed: ${reason}`, 'FAR_E040', 401, false);
    this.name = 'WebhookVerificationError';
  }
}

export class WebhookParseError extends FarError {
  constructor(raw: string) {
    super(`Failed to parse webhook payload`, 'FAR_E041', 400, false);
    this.name = 'WebhookParseError';
  }
}

// ─── Mode / Configuration ────────────────────────────────────────────────────

export class ModeMismatchError extends FarError {
  constructor(operation: string, mode: string) {
    super(`Operation '${operation}' is not available in ${mode} mode`, 'FAR_E050', 400, false);
    this.name = 'ModeMismatchError';
  }
}

export class ProviderNotFoundError extends FarError {
  constructor(provider: string) {
    super(`Provider '${provider}' not found in current mode`, 'FAR_E051', 500, false);
    this.name = 'ProviderNotFoundError';
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isRetryable(err: unknown): boolean {
  return err instanceof FarError && err.retryable;
}

export function getErrorCode(err: unknown): string {
  return err instanceof FarError ? err.code : 'FAR_E999';
}