# PULO User Settings API

## Overview
REST API for managing user settings, preferences, and profile data.

## Base URL
```
http://localhost:4311
```

## Authentication
All settings endpoints require authentication via `pulo_demo_session` cookie.

## Endpoints

### GET /api/me
Get current authenticated user.

**Response:**
```json
{
  "id": 1,
  "fid": 12345,
  "username": "vitalik",
  "displayName": "Vitalik Buterin",
  "plan": "pro",
  "createdAt": "2024-01-15T00:00:00Z"
}
```

### POST /api/auth/demo
Demo login - creates session for FID.

**Request:**
```json
{
  "fid": 12345,
  "username": "vitalik"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "fid": 12345,
    "username": "vitalik",
    "displayName": "Vitalik",
    "plan": "pro"
  }
}
```

### GET /api/settings
Get all user settings.

**Response:**
```json
{
  "voice": {
    "language": "en",
    "tone": "balanced",
    "replyStyle": "helpful",
    "humorLevel": 50,
    "technicalDepth": 50,
    "conciseVsDetailed": 50,
    "exampleCasts": []
  },
  "alerts": {
    "allowedTopics": [],
    "blockedTopics": [],
    "riskTolerance": "medium",
    "frequency": "realtime",
    "allowMiniAppNotifications": true,
    "allowDirectCasts": false,
    "dailyAlertLimit": 50
  },
  "automation": {
    "autoReplyMode": "off",
    "mentionOnlyMode": true,
    "preferredChannels": []
  }
}
```

### PATCH /api/settings
Update multiple settings at once.

**Request:** Same structure as GET, all fields optional.

### GET /api/settings/voice
Get voice/style settings.

**Response:**
```json
{
  "language": "en",
  "tone": "balanced",
  "replyStyle": "helpful",
  "humorLevel": 50,
  "technicalDepth": 50,
  "conciseVsDetailed": 50,
  "exampleCasts": []
}
```

### PATCH /api/settings/voice
Update voice settings.

**Request:**
```json
{
  "language": "en",
  "tone": "casual",
  "replyStyle": "detailed"
}
```

### GET /api/settings/alerts
Get alert/notification settings.

**Response:**
```json
{
  "allowedTopics": [],
  "blockedTopics": [],
  "riskTolerance": "medium",
  "frequency": "realtime",
  "allowMiniAppNotifications": true,
  "allowDirectCasts": false,
  "dailyAlertLimit": 50
}
```

### PATCH /api/settings/alerts
Update alert settings.

**Request:**
```json
{
  "riskTolerance": "high",
  "frequency": "digest",
  "allowDirectCasts": true,
  "dailyAlertLimit": 100
}
```

## Field Definitions

### Voice Settings
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| language | string | "en" | ISO language code |
| tone | enum | "balanced" | balanced, formal, casual, witty |
| replyStyle | enum | "helpful" | helpful, brief, detailed, persuasive |
| humorLevel | number | 50 | 0-100 |
| technicalDepth | number | 50 | 0-100 |
| conciseVsDetailed | number | 50 | 0=concise, 100=detailed |

### Alert Settings
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| allowedTopics | string[] | [] | Topics to receive alerts for |
| blockedTopics | string[] | [] | Topics to never alert on |
| riskTolerance | enum | "medium" | low, medium, high |
| frequency | enum | "realtime" | realtime, digest, minimal |
| allowMiniAppNotifications | boolean | true | Send mini app notifications |
| allowDirectCasts | boolean | false | Send direct cast replies |
| dailyAlertLimit | number | 50 | Max alerts per day |

### Automation Settings
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| autoReplyMode | enum | "off" | off, draft, publish |
| mentionOnlyMode | boolean | true | Only auto-reply mentions |
| preferredChannels | string[] | [] | Channels to prioritize |

## Default Values
- `allowDirectCasts`: **false** (opt-in)
- `autoReplyMode`: **"off"** (disabled by default)
- `allowMiniAppNotifications`: **true**

## Error Responses

### 401 Unauthorized
```json
{ "error": "Not authenticated" }
```
Session cookie missing or invalid.

### 400 Bad Request
```json
{
  "error": "Invalid alert settings",
  "details": [
    { "path": "dailyAlertLimit", "message": "Number must be between 1 and 1000" }
  ]
}
```
Invalid input data.

## Database Schema
Settings are stored in `user_preferences` table with FK to `users`.
