# Overview Tab Implementation

Adding a new "Overview" tab to the main navigation that follows the visual layout of the provided reference image (Scooter Care) while maintaining the project's "Dark Garage" aesthetic and tab system.

## User Review Required

> [!IMPORTANT]
> - The reference image shows features like "Oil Health", "Tire Pressure", and "Battery %" which are not currently in the database. I will map these to existing maintenance statuses (e.g., Oil Health based on "Engine Oil" schedule).
> - "Service Booking" will be implemented as a shortcut to the Log Maintenance dialog.
> - "Maintenance Guides" will be a placeholder section as there is no guide content currently.

## Technical Details

### Navigation Update
- Add "Overview" to the `NAV` array in `src/components/AppShell.tsx`.
- Place it first in the list to match the "Home" role.

### Overview Route (`src/routes/_authenticated/overview.tsx`)
- Create a new route for the overview page.
- Layout structure matching the image:
  - Hero section: Active bike image + large icon/logo.
  - 2x2 Grid:
    - **Bike Status**: Summary of critical fluids/parts health.
    - **Service Booking**: Calendar/Wrench icon with "Schedule Now" button.
    - **Maintenance Guides**: Book/Engine icons with "Explore Guides" button.
    - **Service History**: List of the 2-3 most recent service events.

### Data Integration
- Use `useBikes` to get the primary bike's status.
- Use `useDashboardHistory` to populate the Service History tile.
- Map `service_schedules` to the "Oil Health" etc. percentages in the UI.

### Styling
- Maintain current `panel` and `text-display` utilities.
- Use `Bebas Neue` for headings and `JetBrains Mono` for percentages.
- Maintain the Amber (#c79848) accent color for icons and buttons.
