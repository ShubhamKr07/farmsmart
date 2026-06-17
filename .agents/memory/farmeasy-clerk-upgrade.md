---
name: FarmEasy Clerk package upgrade
description: Clerk v2→v3 migration details for FarmEasy Expo app — package rename, API changes, and proxyUrl fix.
---

## The Rule
FarmEasy uses `@clerk/expo` (v3), not the old `@clerk/clerk-expo` (v2). All imports across the app must use `@clerk/expo`.

**Why:** The old `@clerk/clerk-expo` package used Clerk Core v2 APIs which are incompatible with v3. Using the wrong package/API silently prevented sign-in from working.

**How to apply:** Any new file that needs Clerk hooks (`useAuth`, `useUser`, `useSignIn`, `useSignUp`) must import from `@clerk/expo`, not `@clerk/clerk-expo`.

## v2 → v3 API Differences (sign-in)

| v2 | v3 |
|---|---|
| `const { signIn, setActive, isLoaded } = useSignIn()` | `const { signIn, errors, fetchStatus } = useSignIn()` |
| `signIn.create({ identifier, password })` | `signIn.password({ emailAddress, password })` returns `{ error }` |
| `setActive({ session: result.createdSessionId })` | `signIn.finalize({ navigate: ({ decorateUrl }) => ... })` |
| `result.status === 'needs_second_factor'` | `signIn.status === 'needs_client_trust'` |
| `signIn.prepareSecondFactor(...)` | `signIn.mfa.sendEmailCode()` |
| `signIn.attemptSecondFactor(...)` | `signIn.mfa.verifyEmailCode({ code })` |
| `isLoading` state variable | `fetchStatus === 'fetching'` |

## proxyUrl Fix

In `_layout.tsx`, canonical proxyUrl:
```typescript
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;
```

**Wrong pattern (was in codebase):**
```typescript
const internalDomain = process.env.REPLIT_INTERNAL_APP_DOMAIN;
const proxyUrl = internalDomain ? `https://${internalDomain}/api/__clerk` : undefined;
```
`REPLIT_INTERNAL_APP_DOMAIN` is a server-side env var that is NOT bundled into Expo (only `EXPO_PUBLIC_*` vars are). In dev, this evaluates to `undefined` (harmless), but it's wrong by design and breaks prod.

## tokenCache Fix

Use `@clerk/expo/token-cache` (NOT `secure-store` which only exports deprecated `secureStore`):
```typescript
import { tokenCache } from "@clerk/expo/token-cache";
```
Returns `TokenCache | undefined` — undefined on web, expo-secure-store backed on native.

## errors.fields Shape (v3)

`errors` from `useSignIn()` is always defined. Initial state:
```json
{"fields": {"identifier": null, "password": null, "code": null}, "raw": null, "global": null}
```
Check `errors.fields.identifier` (truthy when non-null) to show inline validation. No `as any` cast needed.

## finalize() Navigation

```typescript
await signIn.finalize({
  navigate: ({ session, decorateUrl }) => {
    if (session?.currentTask) { console.log(session.currentTask); return; }
    const url = decorateUrl("/");
    if (url.startsWith("http")) { (window as any).location.href = url; }
    else { router.push(url as Href); }
  },
});
```

## Verify Step

Use `signIn.status === 'needs_client_trust'` directly for conditional rendering — no separate `step` state needed. Use `signIn.reset()` for "start over".

## build.js Fix

Metro spawn env must include:
```javascript
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY || "",
EXPO_PUBLIC_CLERK_PROXY_URL: clerkProxyUrl,
```
where `clerkProxyUrl = process.env.CLERK_PROXY_URL ? \`https://${domain}${process.env.CLERK_PROXY_URL}\` : ""`.
