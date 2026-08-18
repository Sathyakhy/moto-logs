# Plan: Dynamic Maintenance Logic

The goal is to ensure that "Default Maintenance Intervals" (configured in Settings) are dynamically applied using the bike's maintenance history to calculate upcoming service status. Currently, the status calculations on the Overview page rely on manual `service_schedules` records. I will update the logic to automatically pick the latest maintenance entry for a category and use the user's default interval if no specific schedule overrides it.

## User Review Required

> [!IMPORTANT]
> - Should specific bike overrides (custom schedules) still take priority over the global "Default Maintenance Intervals"? (Assuming yes).
> - When a user logs a maintenance task for a category like "Engine Oil", should the system automatically update the "Last Service Odometer" for that category? (Assuming yes, as this is the core of the request).

## Proposed Changes

### Logic & Data Handling (`src/lib/moto.ts`)
- Update `computeSchedule` to accept optional history data if a formal schedule row is missing.
- Add a helper to match maintenance categories against default intervals.

### Hooks (`src/hooks/useBikes.ts` & `src/hooks/useMaintenance.ts`)
- Ensure `useBikes` and `useBike` include recent maintenance history in their computations.
- Update `useCreateMaintenanceRecord` (in `useUpdateLogs.ts`) to automatically update or create the relevant `service_schedules` entry when a maintenance task is logged, ensuring the status cards update immediately.

### Overview Page (`src/routes/_authenticated/overview.tsx`)
- Modify `getStatusInfo` to fallback to default intervals from the user's profile if no specific `service_schedules` entry exists for a bike.
- Use the latest maintenance record odometer for a category to calculate `usageSinceLast`.

### Settings Page (`src/routes/_authenticated/settings.tsx`)
- Ensure the wording "Default Maintenance Intervals" is used correctly as per the request.

## Technical Details

- **Database Interaction**: When logging maintenance, check if a row in `service_schedules` exists for the `bike_id` and `category`. If so, update `last_service_odometer` and `last_service_date`. If not, create one using the default interval from the user's profile.
- **Frontend State**: Aggressively invalidate `service-schedules` and `bikes` queries when maintenance is logged or deleted.
- **Predictive Estimation**: Maintain the existing `dailyUsage` logic to estimate service dates.
