# Implementation Plan - MotoLog Maintenance Tracker

Building out the core functionality for the motorcycle maintenance tracker, focusing on the garage (bikes), maintenance records, and service schedules.

## User-Facing Changes

### 1. Garage Management (`/bikes`)
- Implement a bike creation/editing dialog.
- Display bike cards with key stats (current odometer, last service).
- Support uploading bike photos.

### 2. Bike Details & Maintenance (`/bikes/$bikeId`)
- Add a dedicated page for each bike.
- **Service Schedule**: View upcoming maintenance based on odometer/date.
- **Maintenance History**: Log new services (oil, filters, etc.) with costs and receipts.
- **Fuel Logs**: Track consumption and mileage.

### 3. Dashboard (`/dashboard`)
- Summary stats: Total spent this month/year (in USD/KHR).
- Service Alerts: Show bikes that need attention soon.
- Recent Activity: Latest logs across all bikes.

## Technical Details

### Data Hooks
- `useMaintenance`: Fetch/create records for a specific bike.
- `useSchedules`: Manage service intervals and calculate status.
- `useFuelLogs`: Fetch/create fuel logs and calculate efficiency.

### Components
- `AddBikeDialog`: Shadcn Dialog for bike metadata.
- `LogMaintenanceDialog`: Form for service logs with category selection.
- `ScheduleCard`: Visual indicator of maintenance progress.

### Utilities
- Extend `moto.ts` with cost aggregation helpers.
- Use `money.ts` for all display values to respect user currency preferences.
