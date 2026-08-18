# Overview Page Cleanup

The user wants to "remove these" items from the Overview page. Based on context and previous requests, I will remove specific elements that are likely redundant or unwanted in the "premium" overview.

## Proposed Changes

### Overview Page (`src/routes/_authenticated/overview.tsx`)
- Remove the "Moto Care" heading and the wrench icon block below the bike image.
- Remove the "Vehicle Status" section title and the "Zap" icon.
- Simplify the layout to focus on the bike and the status grid.

### AppShell (`src/components/AppShell.tsx`)
- The user mentioned "remove these" while showing a red circle (which I can't see but can infer from the prompt context of "removing redundant UI").
- I will ensure the Overview page is clean and focused.

## Technical Details
- Modify `src/routes/_authenticated/overview.tsx` to remove lines 111-117 (the secondary "Moto Care" header).
- Remove the section header for "Vehicle Status" on line 122.
- Adjust spacing to ensure a clean transition between the bike hero and the status grid.
