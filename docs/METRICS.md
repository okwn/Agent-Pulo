# Metrics Reference

All metrics are prefixed with `pulo_` and are designed to be Prometheus-compatible.

## Counter Metrics

Counters only increase in value and reset to 0 on process restart.

| Metric Name | Labels | Description |
|-------------|--------|-------------|
| `pulo_webhook_events_received_total` | `channel` | Webhook events received (far caster, rest, etc.) |
| `pulo_events_processed_total` | `type`, `success` | Events processed by the system |
| `pulo_agent_runs_total` | `agent_type`, `status` | Agent runs by type and status |
| `pulo_llm_tokens_used_total` | `model` | LLM tokens consumed |
| `pulo_llm_cost_estimate_usd_total` | `model` | Estimated LLM cost in USD |
| `pulo_llm_requests_total` | `model` | LLM API requests made |
| `pulo_truth_checks_total` | - | Total truth checks performed |
| `pulo_truth_checks_by_verdict_total` | `verdict` | Truth checks grouped by verdict (true/false) |
| `pulo_radar_trends_detected_total` | `category` | Trends detected by radar |
| `pulo_alerts_delivered_total` | `channel` | Alerts successfully delivered |
| `pulo_alert_failures_total` | `channel`, `reason` | Failed alert deliveries |
| `pulo_safety_blocks_total` | `reason` | Content blocked for safety reasons |
| `pulo_plan_limit_blocks_total` | `limit_type` | Actions blocked due to plan limits |
| `pulo_publish_success_total` | - | Successful cast publishes |
| `pulo_publish_failure_total` | - | Failed cast publishes |
| `pulo_direct_cast_attempts_total` | `success` | Direct cast attempts |
| `pulo_mini_app_notifications_total` | `success` | Mini-app notification attempts |

## Histogram Metrics

Histograms track distributions of values.

| Metric Name | Labels | Description |
|-------------|--------|-------------|
| `pulo_agent_runs_duration_ms` | `agent_type` | Agent run durations in milliseconds |
| `pulo_events_processing_time_ms` | `type` | Event processing time in milliseconds |

## Gauge Metrics

Gauges can both increase and decrease.

| Metric Name | Labels | Description |
|-------------|--------|-------------|
| `pulo_queue_depth` | - | Total pending + running jobs |
| `pulo_queue_pending_jobs` | - | Jobs waiting to be processed |
| `pulo_queue_running_jobs` | - | Jobs currently being processed |
| `pulo_uptime_seconds` | - | Process uptime in seconds |

## Accessing Metrics

### Prometheus Format

```bash
curl http://localhost:4311/metrics
```

Returns output in Prometheus text format:

```
# TYPE pulo_agent_runs_total counter
# TYPE pulo_uptime_seconds gauge
pulo_uptime_seconds 3600
```

### JSON Format

```bash
curl http://localhost:4311/metrics?format=json
```

Returns:

```json
{
  "metrics": [
    {
      "name": "pulo_agent_runs_total",
      "type": "counter",
      "value": 150,
      "labels": { "agent_type": "truth", "status": "completed" },
      "timestamp": "2026-05-08T12:00:00Z"
    }
  ],
  "uptime": 3600,
  "timestamp": "2026-05-08T12:00:00Z"
}
```

## Metric Functions

In `@pulo/observability`:

```typescript
import {
  incrementCounter,
  recordHistogram,
  setGauge,
  recordAgentRun,
  recordLLMUsage,
  recordTruthCheck,
  recordAlertDelivered,
  recordSafetyBlock,
  recordPublish,
} from '@pulo/observability';

// Simple counter
incrementCounter('my_counter');
incrementCounter('my_counter', { label: 'value' }, 5);

// Histogram
recordHistogram('processing_time', 150);
recordHistogram('processing_time', 150, { type: 'cast' });

// Gauge
setGauge('queue_depth', 42);

// High-level helpers
recordAgentRun('truth', 'completed', 1500);
recordLLMUsage(1000, 0.02, 'gpt-4o-mini');
recordTruthCheck('true');
recordAlertDelivered('miniapp');
recordSafetyBlock('spam');
recordPublish(true);
```