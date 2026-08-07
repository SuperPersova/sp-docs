# Collabspace Dashboard (App Card)

## Purpose
The Collabspace Dashboard serves as the gateway on the main home screen to team collaboration tools, time tracking, and leave management. Its goal is to surface immediate actions (like starting or stopping a break) without requiring the user to navigate away from their primary workspace.

## Flow, How Screen Working
- The dashboard is rendered as a modular card component (`CollabspaceApp.tsx`).
- It displays a 2x2 grid of quick-actions when expanded:
  - **Today**: Quick navigation to daily agenda.
  - **Active Projects**: Shows count and Add (+).
  - **Breaks**: Conditionally renders. If a break is active, it transforms from a static button into an active, pulsing timer.
  - **Leave**: Provides shortcuts to Apply Leave and Request Comp-Off modals.

## State Management
- **Local State**: Controls the visibility of internal modals (`showApplyModal`, `showCompOffModal`) and tracks the exact `elapsed` time of an active break.
- **Global State**: Ties into `useBreaksStore` to sync the current `activeBreak` and past `entries` across all screens instantly.

## Logic Checks and Discussion Done
- **Modularization**: Discussion highlighted that the Home Page was "very big and complicated". We isolated Collabspace into its own App Card component to improve performance and code maintainability.
- **Capitalization**: Renamed to PascalCase (`CollabspaceApp.tsx`) to resolve TS/vite build path issues.
