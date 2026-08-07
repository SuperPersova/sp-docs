# Breaks Screen & Active Break Timer

## Purpose
The Breaks functionality is responsible for tracking employee time away from keyboard (manual breaks) and system idle times. It provides both a dedicated history screen (`BreaksPage.tsx`) and an inline active timer embedded within the Collabspace App Card.

## Flow, How Screen Working
- **Starting a Break**: Users can trigger manual breaks (Coffee, Meal, Fresh Air) from the `BreaksPage`. Once triggered, the payload is immediately synced to the backend to ensure HR visibility.
- **Active Break UI**:
  - The active break banner (both on the `BreaksPage` and inline on the `CollabspaceApp` card) dynamically maps the break type to a specific icon (e.g., ☕, 🍽️).
  - It features a "running feel" animation utilizing cycling dots (`.` to `.....`) alongside a live `X min` timer.
- **Stopping a Break**: The user clicks the Stop/Finish button, terminating the timer, saving the payload locally in `useBreaksStore`, and firing a backend sync via `employeeTrackingService`.

## State Management
- **`useBreaksStore` (Zustand)**: The central source of truth containing `entries` (history) and `activeBreak` (current). 
- **Timer Ref**: `setInterval` is managed via a `useRef` to guarantee safe cleanup on component unmount and prevent memory leaks.
- **Storage/Backend**: Connects to the browser extension API and `employeeTrackingService` to persist GPS location and tracking records.

## Logic Checks and Discussion Done
- **Timer Animation**: 
  - *Discussion*: A static `0m` timer felt unresponsive since it only updates every 60 seconds.
  - *Logic Check*: Implemented an animated string of dots bound to a fixed-width container (`w-4` on card, `w-6` on page) to simulate a running clock without causing horizontal layout shift.
- **Component Symmetry**:
  - *Discussion*: User requested the exact same "running feel" layout for both the inline card and the dedicated breaks page.
  - *Logic Check*: Both UIs were synchronized to use the same logic for `formatDuration`, emoji mapping, and dot calculation (`Math.floor(elapsed / 1000) % 5 + 1`).
