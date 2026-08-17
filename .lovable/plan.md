# Plan: Configurable Maintenance Schedule

The user wants to configure the default maintenance schedule (Engine Oil, CVT Cleaning, etc.) from the settings page, including custom intervals for alerts.

## Proposed Changes

### 1. Database Schema
- Modify `profiles` table to store `default_maintenance_schedule` as a JSONB array.
- This allows each user to have their own global defaults that are applied when a new bike is added.

### 2. Logic Update
- Update `DEFAULT_SCHEDULE_ITEMS` in `src/lib/moto.ts` to be a fallback, but primary values should come from the user's profile.
- Update `useCreateBike` (or the logic in `AddBikeDialog`) to use the user's custom defaults when initializing a new bike's `service_schedules`.

### 3. Settings UI
- Add a new section in `src/routes/_authenticated/settings.tsx` for "Default Maintenance Intervals".
- List all categories (Engine Oil, CVT Cleaning, etc.).
- Provide inputs for `interval_km` and `interval_days`.
- Save this list to the profile.

### 4. Component Refactoring
- Create a `MaintenanceSettings` component to manage these defaults.

## Technical Details
- **Migration**: Add `default_maintenance_schedule` to `profiles` table.
- **Data Shape**: `Array<{ item: string, interval_km: number, interval_days?: number }>`.
- **UI**: Use a table or list of cards in settings for better mobile responsiveness.

## User Impact
- Users can now customize how often they get alerts for specific maintenance tasks across all their bikes by default.
- Existing bikes will keep their current schedules unless manually updated (or we could add a "Reset to Defaults" button on the bike detail page later).
