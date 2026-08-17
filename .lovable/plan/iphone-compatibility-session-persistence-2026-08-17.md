# iPhone Compatibility & Session Persistence

Make the UI responsive for iPhone and ensure the user session persists across browser restarts until an explicit logout.

## Changes

### UI & Responsiveness
- **Root Metadata**: Add iOS-specific meta tags (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`) and set `viewport-fit=cover` for notched displays.
- **AppShell Layout**:
  - Add a sticky bottom navigation bar for mobile users (Dashboard, Garage, Settings).
  - Adjust header to hide labels on mobile, keeping icons.
  - Add padding for the "Safe Area" (notches/home indicators).
  - Make headers (`h1`) and subtitles slightly smaller on mobile to fit the screen.
- **Dashboard & Stats**: Force 2-column grid for small devices instead of single-column to utilize space efficiently.
- **CSS Safe Areas**: Define `--safe-area-inset` variables and a `pb-safe` utility for content spacing.

### Session Persistence
- **Supabase Client**: Ensure `persistSession: true` is set (already default in generated client, but verified).
- **Auth Flow**: The application already uses `onAuthStateChange` to invalidate the router, which correctly handles persistent sessions.

## Technical Details
- Modify `src/routes/__root.tsx` for metadata.
- Modify `src/components/AppShell.tsx` for responsive navigation.
- Modify `src/styles.css` for safe-area utilities.
- Refine grid layouts in `src/routes/_authenticated/dashboard.tsx` and `src/routes/_authenticated/bikes.$bikeId.tsx`.
