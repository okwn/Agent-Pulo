# PULO Far caster Auth Plan

## Status
Demo auth implemented. SIWF and Neynar auth planned but not yet implemented.

## Overview
PULO will support authentication via Sign In with Far caster (SIWF) and/or Neynar. This document outlines the implementation plan.

## Authentication Options

### Option 1: Sign In with Far caster (SIWF)
**Standard**: Official Far caster protocol

**Flow:**
1. User initiates login via "Sign in with Far caster" button
2. PULO generates a random nonce and stores in session
3. Redirect to Warpcast with signedKeyRequest payload containing:
   - `requestPublicKey`: PULO's app key
   - `nonce`: Random nonce from session
   - `signature`: User's signature (obtained via Warpcast)
4. User approves in Warpcast
5. Warpcast redirects back with signature
6. PULO verifies signature against custody address
7. Extract FID from signature
8. Upsert user, create session

**Pros:**
- Official protocol
- No external dependencies
- Decentralized

**Cons:**
- Complex flow
- Requires Warpcast for approval

### Option 2: Neynar Signer
**Alternative**: Neynar provides managed signer infrastructure

**Flow:**
1. User clicks "Login with Neynar"
2. PULO redirects to Neynar OAuth flow
3. User approves in Neynar
4. Neynar redirects back with signer UUID
5. PULO verifies signer UUID via Neynar API
6. Extract FID from signer info
7. Upsert user, create session

**Pros:**
- Simpler integration
- Managed infrastructure
- Good developer experience

**Cons:**
- External dependency on Neynar
- Additional latency for verification

### Option 3: Hybrid Approach
Support both SIWF and Neynar, prefer SIWF when available.

## Implementation Plan

### Phase 1: Demo Mode (Done)
- Cookie-based demo auth
- FID + username login
- Session tokens

### Phase 2: Neynar Integration
1. Add Neynar SDK dependency
2. Create `NeynarAuthProvider`
3. Implement OAuth redirect flow
4. Add signer verification endpoint
5. Test with Neynar sandbox

### Phase 3: SIWF Integration
1. Add app key pair generation
2. Create `Far casterAuthProvider`
3. Implement signedKeyRequest flow
4. Add custody address verification
5. Test with Warpcast devnet

### Phase 4: Unified Auth Layer
1. Auth abstraction already exists
2. Configure provider based on env
3. Add fallback providers
4. Session migration tooling

## Environment Variables

```env
# Auth provider selection
PULO_AUTH_PROVIDER=demo|neynar|farcaster

# Neynar
NEYNAR_API_KEY=your_key
NEYNAR_CLIENT_ID=your_client_id

# SIWF
FARCASTER_APP_PUBLIC_KEY=0x...
FARCASTER_APP_PRIVATE_KEY=0x...
```

## Migration Path

Existing demo users can be migrated to SIWF by:
1. User initiates SIWF login with same FID
2. System detects existing user
3. Updates custody address from verified signature
4. Links new auth method to existing account

## Security Considerations

1. **Nonce reuse prevention**: Store used nonces, reject duplicates
2. **Signature verification**: Always verify on server side
3. **Custody address validation**: Ensure signer owns the address
4. **Session fixation**: Generate new session on successful auth
5. **CSRF protection**: Validate redirect URLs

## Testing

### Demo Auth Tests
- [x] Demo user can login with FID
- [x] Session persists across requests
- [x] Invalid session rejected

### SIWF Tests (Future)
- [ ] Valid signature accepted
- [ ] Invalid signature rejected
- [ ] Nonce reuse prevented
- [ ] Wrong custody address rejected

### Neynar Tests (Future)
- [ ] Valid signer accepted
- [ ] Expired signer rejected
- [ ] API key validated
