# Plan - Upcoming Maintenance & Predictive Analytics

Add an "Upcoming Maintenance" section to the dashboard that estimates the next service dates for each bike based on its actual usage patterns (km per day) calculated from refueling logs.

## User Review Required

> [!IMPORTANT]
> The predictive maintenance relies on having at least two refueling logs with odometer readings for a bike to calculate an accurate average daily usage. If not enough data is available, it will default to the static duration defined in the maintenance schedule.

## Proposed Changes

### Maintenance Logic
- Update `src/lib/moto.ts`:
    - Add `calculateDailyUsage` function to compute average km/day from fuel logs.
    - Enhance `computeSchedule` to accept `dailyUsage` and return an `estimatedDate` for when the odometer threshold will be reached.
    - Handle edge cases where `dailyUsage` is 0 or data is missing.

### Data Fetching
- Update `src/hooks/useDashboard.ts`:
    - Create a new `useUpcomingMaintenance` hook.
    - Fetch all bikes, their service schedules, and their recent fuel logs (to calculate usage).
    - Combine these to generate a list of upcoming maintenance items sorted by the estimated due date.

### Dashboard UI
- Update `src/routes/_authenticated/dashboard.tsx`:
    - Add an "Upcoming Maintenance" panel below or next to "Alerts".
    - Display a list of items showing:
        - Bike name and maintenance task.
        - Estimated due date (e.g., "In 5 days" or "Next Tuesday").
        - Progress bar for the mileage/time threshold.
        - Predictive "Usage" badge (e.g., "Predictive: ~25km/day").

## Technical Details

- **Usage Calculation**: `(Latest Odometer - Oldest Odometer) / Days Between`.
- **Date Estimation**: `Today + (Remaining Km / Daily Usage)`.
- **UI Components**: Use existing `StatusPill` and Tailwind utility classes for progress bars to maintain the "Dark Garage" aesthetic.
