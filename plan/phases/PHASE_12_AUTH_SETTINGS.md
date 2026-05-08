# Phase 12: Authentication & Settings

## Status: Completed

## Goals
Implement local-first authentication with demo mode and prepare for future SIWF/Neynar integration. Connect settings pages to real API.

## Completed

### Auth Abstraction (`@pulo/auth`)
- [x] `AuthProvider` interface
- [x] `DemoAuthProvider` with cookie-based sessions
- [x] `FarcaSterAuthProvider` placeholder (throws not implemented)
- [x] `NeynarAuthProvider` placeholder (throws not implemented)
- [x] Session token creation/verification
- [x] `DEMO_COOKIE` constant

### API Endpoints (`/api/*`)
- [x] `GET /api/me` - Get current user
- [x] `POST /api/auth/demo` - Demo login by FID
- [x] `GET /api/settings` - Get all settings
- [x] `PATCH /api/settings` - Update settings
- [x] `GET /api/settings/voice` - Get voice settings
- [x] `PATCH /api/settings/voice` - Update voice settings
- [x] `GET /api/settings/alerts` - Get alert settings
- [x] `PATCH /api/settings/alerts` - Update alert settings

### Web Client
- [x] `lib/api.ts` - API client functions
- [x] `lib/auth-context.tsx` - React context for auth state
- [x] `components/providers/auth-provider.tsx` - Auth provider wrapper
- [x] Dashboard layout uses AuthProvider
- [x] Admin layout uses AuthProvider
- [x] Login page with demo auth form

### Settings Pages
- [x] `/dashboard/settings` - Profile with real user data
- [x] `/dashboard/settings/voice` - Connected to API
- [x] `/dashboard/settings/alerts` - Connected to API with opt-in defaults

### Documentation
- [x] `docs/security/AUTH_MODEL.md` - Auth architecture
- [x] `docs/api/USER_SETTINGS_API.md` - API reference
- [x] `docs/farcaster/FARCASTER_AUTH_PLAN.md` - Future auth plans
- [x] `plan/phases/PHASE_12_AUTH_SETTINGS.md` - This file

## Default Values (Verified)
- `allowDirectCasts`: **false** (must opt-in)
- `autoReplyMode`: **"off"** (disabled by default)
- `allowMiniAppNotifications`: **true**
- `mentionOnlyMode`: **true**
- `riskTolerance`: **"medium"**
- `frequency`: **"realtime"**

## Testing
- [x] Demo user can login with FID
- [x] Settings update persists to DB
- [x] Direct cast opt-in defaults to false
- [x] Auto publish defaults to off
- [x] Invalid settings rejected with 400

## Notes
- Auth abstraction allows adding SIWF/Neynar without breaking existing code
- Demo mode NOT suitable for production
- Session tokens are signed but not encrypted
- All settings stored in `user_preferences` table

## Future Work
- SIWF implementation
- Neynar signer integration
- Session migration tooling
- OAuth2/OIDC support (potential)
