# Eliminate Login Flash

The user sees the login screen briefly before their session is restored on mobile. This plan implements a root-level loading state and refines the auth gate to ensure the UI only transitions to the login page if the session is confirmed as absent.

## Proposed Changes

### Components
- `src/components/AuthLoading.tsx`: Create a high-quality loading screen matching the "dark garage" aesthetic (Bebas Neue, primary amber accents).

### Routing
- `src/routes/_authenticated/route.tsx`:
    - Add a `pendingComponent` using the new `AuthLoading` to cover the async `getUser()` check.
- `src/routes/auth.tsx`:
    - Wrap the login UI in a conditional that checks `isLoading` from Supabase's `getSession()`.
    - Render `AuthLoading` while the session is being determined to prevent the flash.

### Root Layout
- `src/routes/__root.tsx`:
    - Ensure `onAuthStateChange` correctly invalidates the router to trigger re-checks without UI glitches.

## Technical Details
- Using TanStack Router's `pendingComponent` for the `_authenticated` layout ensures that children aren't even attempted to be rendered (avoiding double-redirects) while the server function/Supabase check is in flight.
- SSR is already disabled on the auth route (`ssr: false`), so we rely on client-side state for the flash prevention.
