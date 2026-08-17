---
title: Maintenance Alerts and Activity Log Separation
description: Implement maintenance alerts on dashboard and bike cards, and separate fuel and maintenance logs into distinct sections.
---

# Plan - Maintenance Alerts and Activity Log Separation

## User Requirements
- Add maintenance alerts on the dashboard and bike cards when tasks are due.
- Separate fuel and maintenance logs in the dashboard (currently they are merged in "Recent Logs").

## Proposed Changes

### 1. Maintenance Alerts System
- **Logic**: Use the existing `computeSchedule` logic from `src/lib/moto.ts` to determine if a bike has any "due-soon" or "overdue" items.
- **Bike Cards (`src/routes/_authenticated/bikes.tsx`)**:
  - Replace the static `<StatusPill status="good" />` with a calculated status based on the bike's maintenance schedule.
  - Show a summary of due items if applicable.
- **Dashboard (`src/routes/_authenticated/dashboard.tsx`)**:
  - Ensure the "Alerts" section correctly pulls and displays items that are due based on the computed schedule, not just manual reminders.
  - Add a dedicated "Maintenance Status" summary card.

### 2. Log Separation on Dashboard
- **Dashboard (`src/routes/_authenticated/dashboard.tsx`)**:
  - Replace the "Recent Logs" section with two distinct sections: "Maintenance History" and "Fuel History".
  - Update `useDashboardHistory` hook to return separate lists or handle the split in the UI.

### 3. Technical Implementation
- **Hooks**:
  - Enhance `useBikes` or create a new hook `useBikeStatus` that wraps `computeSchedule` for multiple bikes.
  - Update `useDashboardHistory` to return structured data for separation.
- **UI Components**:
  - Update `StatusPill` usage to be dynamic.
  - Split the "Recent Logs" panel into a two-column layout or two stacked panels.

## Verification Plan
- **Automated**: Run `bun run build:dev` to ensure no syntax or type errors.
- **Manual**: 
  - Verify that a bike with an overdue maintenance item (e.g., Engine Oil > 2000km) shows an "Overdue" pill in the garage.
  - Verify that the Dashboard shows a specific alert for that item.
  - Verify that Maintenance and Fuel logs appear in separate lists on the Dashboard.
