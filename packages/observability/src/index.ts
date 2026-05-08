// @pulo/observability - Logging, metrics, audit, and tracing

import pino from 'pino';

let _log: pino.Logger | null = null;

function getLog(): pino.Logger {
  if (!_log) {
    _log = pino({
      level: process.env.LOG_LEVEL ?? 'info',
      formatters: {
        level: (label) => ({ level: label }),
      },
      base: {
        service: process.env.PULO_SERVICE_NAME ?? 'pulo',
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    });
  }
  return _log;
}

export const log = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info: (...args: unknown[]) => { (getLog().info as any)(...args); },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: (...args: unknown[]) => { (getLog().error as any)(...args); },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn: (...args: unknown[]) => { (getLog().warn as any)(...args); },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug: (...args: unknown[]) => { (getLog().debug as any)(...args); },
  child: (bindings: pino.Bindings) => getLog().child(bindings),
};

export function createChildLogger(name: string) {
  return getLog().child({ component: name });
}

// Re-export metrics
export * from './metrics.js';

// Re-export audit
export * from './audit.js';

// Re-export tracing
export * from './tracing.js';