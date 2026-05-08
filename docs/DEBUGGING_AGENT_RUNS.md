# Debugging Agent Runs

Agent runs are tracked with unique IDs and correlated across all related log entries.

## ID Types

| ID Prefix | Purpose |
|-----------|---------|
| `req_` | Request ID - incoming HTTP request |
| `corr_` | Correlation ID - traces multi-service operations |
| `job_` | Job ID - background job execution |
| `run_` | Agent Run ID - specific agent execution |

## Generating IDs

```typescript
import {
  generateRequestId,
  generateCorrelationId,
  generateJobId,
  generateAgentRunId,
  createRequestContext,
} from '@pulo/observability';

// Generate IDs
const requestId = generateRequestId();  // e.g., "req_1778232482648_abc123"
const correlationId = generateCorrelationId();
const jobId = generateJobId();
const agentRunId = generateAgentRunId();

// Create context from HTTP headers
const context = createRequestContext({
  'x-request-id': 'req_existing_123',
  // x-correlation-id and x-trace-id also respected
});
// context.requestId = 'req_existing_123'
// context.correlationId = 'corr_<new>'
// context.traceId = 'corr_<new>'
```

## Request Context Middleware

Use in Fastify route handlers:

```typescript
import { getRequestIdFromHeaders, createChildLogger } from '@pulo/observability';

app.addHook('onRequest', async (req) => {
  const requestId = getRequestIdFromHeaders(req.headers);
  req.requestId = requestId ?? generateRequestId();
});

// Use in route handlers
app.post('/api/agent/run', async (req) => {
  const logger = createChildLogger('agent');
  logger.info({
    requestId: req.requestId,
    agentRunId: generateAgentRunId(),
    msg: 'Starting agent run'
  });
});
```

## Log Correlation

All related log entries share the same correlation ID:

```json
{
  "level": "info",
  "time": "2026-05-08T12:00:00.000Z",
  "service": "pulo",
  "component": "agent",
  "agentRunId": "run_1778232482648_xyz789",
  "correlationId": "corr_1778232482648_abc123",
  "requestId": "req_1778232482648_def456",
  "agentType": "truth",
  "msg": "Agent run started"
}
```

## Tracing Agent Flow

1. **Incoming Request** - `req_<id>` assigned
2. **Job Queued** - `job_<id>` created, linked via `correlationId`
3. **Agent Executes** - `run_<id>` created, linked to job
4. **LLM Call** - Logs include `agentRunId`, `correlationId`
5. **Result** - Final log includes all IDs

Example trace:

```
[req_abc] Incoming cast event
[job_123] Job queued for truth agent
[job_123] Job started
[run_xyz] Truth agent running
[run_xyz] LLM call started (model: gpt-4o-mini)
[run_xyz] LLM call completed (tokens: 1500, cost: $0.02)
[run_xyz] Truth check completed (verdict: true)
[job_123] Job completed successfully
[req_abc] Response sent
```

## Searching Logs

With structured logs in Pino format:

```bash
# Find all logs for a specific agent run
grep "agentRunId.*run_1778232482648_xyz789" logs.json

# Find all logs for a correlation ID
grep "correlationId.*corr_1778232482648_abc123" logs.json

# Find all errors for a request
grep "req_abc" logs.json | grep '"level":"error"'
```

## Metrics Integration

Agent runs emit metrics that include labels for debugging:

```bash
# Check agent run counts by type and status
curl -s localhost:4311/metrics?format=prometheus | grep pulo_agent_runs_total

# Check agent run durations
curl -s localhost:4311/metrics?format=prometheus | grep pulo_agent_runs_duration_ms
```

## Span Tracking

For distributed tracing across services:

```typescript
import { getSpanTracker, resetSpanTracker } from '@pulo/observability';

const tracker = getSpanTracker();

// Start a span
tracker.startSpan('llm_call', {
  correlationId: 'corr_123',
  agentRunId: 'run_456',
});

// End span (optionally with outcome)
tracker.endSpan('llm_call', { success: true, tokens: 1500 });

// Reset tracker (for testing)
resetSpanTracker();
```