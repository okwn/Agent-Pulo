# PULO UI Product Specification

## Vision
PULO is a premium, dark-mode-first AI intelligence agent interface. The UI should feel like a sophisticated command center — calm, precise, and powerful. Think Linear meets Vercel dashboard, but with a distinct personality that conveys trust and expertise in the decentralized social space.

## Design Language

### Aesthetic Direction
**"Calm Command Center"** — A dark, muted interface with subtle depth through glass panels and soft borders. Purple accent provides energy without being overwhelming. The design prioritizes readability and information density while maintaining visual calm.

### Color Palette
| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#09090b` | Page background (zinc-950) |
| Surface | `#18181b` | Cards, panels (zinc-900) |
| Border | `#27272a` | Subtle dividers (zinc-800) |
| Muted | `#71717a` | Secondary text (zinc-500) |
| Text | `#fafafa` | Primary text (zinc-50) |
| Accent | `#a855f7` | Primary accent (purple-500) |
| Accent Hover | `#9333ea` | Purple-600 |
| Success | `#22c55e` | Green-500 |
| Warning | `#f59e0b` | Amber-500 |
| Danger | `#ef4444` | Red-500 |
| Info | `#3b82f6` | Blue-500 |

### Typography
- **Font**: Inter (Google Fonts) with system fallbacks
- **Scale**: 12px (xs), 14px (sm/base), 16px (md), 18px (lg), 24px (xl), 32px (2xl), 48px (3xl)
- **Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
- **Line height**: 1.5 for body, 1.2 for headings

### Spatial System
- **Base unit**: 4px
- **Spacing scale**: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
- **Border radius**: 6px (sm), 8px (md), 12px (lg), 16px (xl)
- **Card padding**: 20px
- **Section gaps**: 24px

### Motion Philosophy
- **Duration**: 150ms (micro), 200ms (standard), 300ms (emphasis)
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` (standard), `cubic-bezier(0, 0, 0.2, 1)` (enter), `cubic-bezier(0.4, 0, 1, 1)` (exit)
- **Hover**: Scale 1.01, border color shift
- **Focus**: Ring 2px offset, accent color
- **Loading**: Subtle pulse animation

### Visual Assets
- **Icons**: Lucide React (consistent, clean line icons)
- **No emoji** in UI — SVG icons only
- **Glass effect**: `backdrop-blur-xl bg-opacity-60` on overlays
- **Gradients**: Subtle purple-to-indigo for emphasis only

## Layout & Structure

### AppShell
Full-height shell with collapsible left sidebar (240px expanded, 64px collapsed), topbar (56px), and scrollable main content area.

### Sidebar Navigation
```
┌──────────────────────────────────────┐
│ [P] PULO                             │
├──────────────────────────────────────┤
│ Dashboard                            │
│   ├─ Home                           │
│   ├─ Inbox                          │
│   ├─ Composer                       │
├──────────────────────────────────────┤
│ Analysis                             │
│   ├─ Radar                          │
│   ├─ Truth                         │
│   ├─ Alerts                        │
├──────────────────────────────────────┤
│ Settings                             │
│   ├─ General                        │
│   ├─ Voice                         │
│   ├─ Alerts                        │
│   └─ Billing                       │
├──────────────────────────────────────┤
│ Admin (visible if admin role)        │
│   ├─ Overview                      │
│   ├─ Events                        │
│   ├─ Runs                          │
│   ├─ Users                         │
│   └─ System                        │
└──────────────────────────────────────┘
```

### Topbar
- Left: Breadcrumb or page title
- Center: Command/search bar with `/` shortcut hint
- Right: Notification bell with badge, user avatar dropdown

### Page Grid
- Max width: 1440px
- Padding: 24px
- Grid: 12-column, gap 24px
- Cards: equal height in rows

## Features & Interactions

### Dashboard Home
Displays:
- **PULO Status** — system operational indicator with last check time
- **User Plan** — current plan badge with upgrade CTA if free
- **Daily Usage** — circular progress for casts used/limit
- **Pending Drafts** — count and quick access
- **Recent Alerts** — last 5 alerts with severity badges
- **Active Trends** — last 3 trending topics with sparklines
- **Recent Truth Checks** — last 3 checks with verdict badges
- **Safety Notices** — active safety flags count

### Admin Home
Displays:
- **Worker Health** — 4 workers with status (healthy/degraded/down)
- **API Health** — endpoints with latency and status
- **DB Health** — connection pool, query latency
- **Redis Health** — memory, connection status
- **Last Webhook Events** — last 10 events in timeline
- **Failed Agent Runs** — last 5 failures
- **Pending Trend Approvals** — queue count
- **Safety Flags** — active count by severity
- **Technical Debt Count** — categorized count

### State Handling
- **Empty**: Centered illustration placeholder, message, and CTA button
- **Loading**: Skeleton cards matching content shape, pulse animation
- **Error**: Red-tinted panel, error message, retry button
- **Success**: Brief toast notification, auto-dismiss 3s

### Interactions
- **Hover on cards**: Subtle border glow, scale 1.005
- **Active nav item**: Background highlight, left accent bar
- **Buttons**: Press scale 0.98, color shift on hover
- **Tables**: Row hover highlight, sortable column headers
- **Modals**: Backdrop blur, scale enter animation

## Component Inventory

### StatusBadge
States: operational (green), degraded (amber), down (red), unknown (gray)
Appearance: Pill badge with dot indicator, 12px font

### RiskBadge
States: low (green), medium (amber), high (orange), critical (red)
Appearance: Pill badge with optional label

### VerdictBadge
States: true (green check), false (red x), unverified (gray dash), misleading (purple warning)
Appearance: Icon + text pill

### PlanBadge
States: free (gray), pro (purple), team (blue), enterprise (amber)
Appearance: Pill badge with tier name

### TrendCard
Content: Title, category, mention count, sparkline, time
Appearance: Surface card with border

### TruthReportCard
Content: Claim text, verdict badge, confidence score, sources list
Appearance: Surface card with verdict color accent

### AlertCard
Content: Alert type icon, title, description, severity badge, timestamp
Appearance: Surface card with severity left border

### EmptyState
Content: Icon placeholder, title, description, CTA button
Appearance: Centered, muted colors

### ErrorState
Content: Error icon, title, message, retry button
Appearance: Red-tinted surface, centered

### LoadingSkeleton
Content: Mimics content shape (cards, rows, text lines)
Appearance: Surface color, pulse animation

### DataTable
Features: Sortable columns, row hover, pagination
Appearance: Surface header, bordered rows

## Technical Approach

### Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4 with CSS variables
- **Icons**: Lucide React
- **State**: React hooks + SWR for data fetching
- **Types**: TypeScript strict mode

### File Structure
```
apps/web/src/
├── app/
│   ├── (public)/
│   │   ├── page.tsx           # /
│   │   ├── pricing/page.tsx
│   │   ├── docs/page.tsx
│   │   ├── login/page.tsx
│   │   └── miniapp/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx         # Dashboard shell
│   │   ├── page.tsx          # /dashboard
│   │   ├── inbox/page.tsx
│   │   ├── composer/page.tsx
│   │   ├── radar/
│   │   ├── truth/
│   │   ├── alerts/page.tsx
│   │   ├── settings/
│   │   └── billing/page.tsx
│   └── (admin)/
│       ├── layout.tsx         # Admin shell
│       └── pages...
├── components/
│   ├── ui/                    # Base components
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── button.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── app-shell.tsx
│   │   ├── sidebar.tsx
│   │   └── topbar.tsx
│   └── features/
│       ├── trend-card.tsx
│       └── ...
├── lib/
│   ├── mock-data.ts           # Seed data
│   └── utils.ts
└── styles/
    └── globals.css
```

### Mock Data Strategy
All mock data is clearly labeled:
- UI components render with `[MOCK]` visible labels during development
- Mock data functions have `getMock*` prefix
- In production, real API calls replace mock functions
