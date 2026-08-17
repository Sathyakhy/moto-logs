# Upcoming Maintenance Fix

The dashboard was not showing upcoming maintenance tasks because existing bikes did not have service schedules initialized, and logging new maintenance records did not update those schedules.

## Technical Details

- **Schedule Initialization**: Added logic to initialize service schedules when a new bike is added, using the user's default settings.
- **Schedule Updates**: Modified maintenance logging to automatically update the corresponding service schedule's `last_service_odometer` and `last_service_date`.
- **Dashboard Filtering**: Refined the dashboard's upcoming maintenance query to filter for items that are not in a 'good' status and limited the view to the top 5 most urgent tasks.
- **Log Management**: Consolidated maintenance and fuel log hooks to ensure data consistency and automatic cache invalidation.
