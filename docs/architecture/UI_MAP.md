# PULO UI Map

## Overview
PULO uses a premium dark-mode-first design with glass panels, soft borders, and calm gradients.

## Design Tokens
```css
--color-pulo-bg: #09090b          /* Deep black background */
--color-pulo-surface: #18181b    /* Card/panel surfaces */
--color-pulo-border: #27272a     /* Subtle borders */
--color-pulo-muted: #71717a      /* Secondary text */
--color-pulo-text: #fafafa        /* Primary text */
--color-pulo-accent: #a855f7     /* Purple accent */
--color-pulo-accent-hover: #9333ea
--color-pulo-success: #22c55e   /* Green */
--color-pulo-warning: #f59e0b    /* Amber */
--color-pulo-danger: #ef4444     /* Red */
--color-pulo-info: #3b82f6       /* Blue */
```

## Pages

### Public
| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `pages/index.tsx` | Landing page with hero, capabilities, stats, quick start |
| `/pricing` | `pages/pricing.tsx` | Pricing tiers (Free, Pro, Team, Enterprise) |
| `/docs` | `pages/docs.tsx` | Documentation with sidebar nav |
| `/login` | `pages/login.tsx` | Login placeholder |
| `/miniapp` | `pages/miniapp.tsx` | Miniapp placeholder |

### Dashboard
| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard` | `pages/dashboard/index.tsx` | Home dashboard with status cards |
| `/dashboard/inbox` | `pages/dashboard/inbox.tsx` | Inbox for mentions/messages |
| `/dashboard/composer` | `pages/dashboard/composer.tsx` | Reply composer |
| `/dashboard/radar` | `pages/dashboard/radar/index.tsx` | Trend radar list |
| `/dashboard/radar/[id]` | `pages/dashboard/radar/[id].tsx` | Trend detail |
| `/dashboard/truth` | `pages/dashboard/truth/index.tsx` | Truth checks list |
| `/dashboard/truth/[id]` | `pages/dashboard/truth/[id].tsx` | Truth check detail |
| `/dashboard/alerts` | `pages/dashboard/alerts.tsx` | Alerts management |
| `/dashboard/settings` | `pages/dashboard/settings/index.tsx` | Settings home |
| `/dashboard/settings/voice` | `pages/dashboard/settings/voice.tsx` | Voice settings |
| `/dashboard/settings/alerts` | `pages/dashboard/settings/alerts.tsx` | Alert settings |
| `/dashboard/billing` | `pages/dashboard/billing.tsx` | Billing & subscription |

### Admin
| Route | Component | Description |
|-------|-----------|-------------|
| `/admin` | `pages/admin/index.tsx` | Admin home with system health |
| `/admin/events` | `pages/admin/events.tsx` | Event log |
| `/admin/runs` | `pages/admin/runs.tsx` | Agent run history |
| `/admin/radar` | `pages/admin/radar/index.tsx` | Radar admin |
| `/admin/radar/[id]` | `pages/admin/radar/[id].tsx` | Radar admin detail |
| `/admin/truth-checks` | `pages/admin/truth-checks.tsx` | Truth check admin |
| `/admin/alerts` | `pages/admin/alerts.tsx` | Alert admin |
| `/admin/users` | `pages/admin/users.tsx` | User management |
| `/admin/safety` | `pages/admin/safety.tsx` | Safety flags |
| `/admin/technical-debt` | `pages/admin/technical-debt.tsx` | Tech debt tracker |
| `/admin/system` | `pages/admin/system.tsx` | System diagnostics |

## Layout Structure

```
AppShell
├── Sidebar (left, collapsible)
│   ├── Logo
│   ├── Navigation sections
│   │   ├── Dashboard
│   │   ├── Analysis
│   │   ├── Admin (if admin)
│   │   └── Settings
│   └── User menu
├── Topbar (top bar with search, notifications)
│   ├── Search/command bar
│   ├── Notifications bell
│   └── User avatar
└── Main content area
    └── Page content
```

## Component Library

### Badges
- `StatusBadge` - system status (operational, degraded, down)
- `RiskBadge` - risk level (low, medium, high, critical)
- `VerdictBadge` - truth verdict (true, false, unverified, misleading)
- `PlanBadge` - plan tier (free, pro, team, enterprise)

### Cards
- `TrendCard` - trend summary with sparkline
- `TruthReportCard` - truth check report
- `AlertCard` - alert notification
- `UsageLimitMeter` - usage/capacity gauge

### Timeline
- `AgentRunTimeline` - agent execution timeline

### Lists
- `SafetyFlagList` - safety flag items
- `DataTable` - sortable data table

### States
- `EmptyState` - empty state placeholder
- `ErrorState` - error state with retry
- `LoadingSkeleton` - loading placeholder
- `ConfirmDialog` - confirmation modal

## Responsive Breakpoints
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

## Mock Data
All mock data sections are labeled with `[MOCK]` prefix in UI or documented in mock-data.ts.
