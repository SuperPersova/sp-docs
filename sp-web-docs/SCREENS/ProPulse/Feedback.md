# Feedback Screen (ProPulse)

## Purpose
The Feedback screen allows users to submit bugs, feature requests, or general feedback directly from within the extension. It features attachment and screen recording capabilities to provide the development team with rich, visual context for troubleshooting.

## Flow, How Screen Working
- Users navigate to the Add Feedback page to describe their issue.
- Users can choose to attach a static screenshot of the active tab or record a video of their screen.
- **Screenshot Capture**: The extension triggers a capture of the visible tab, securely capturing the underlying webpage.
- **Screen Recording**: A native browser picker allows the user to select which specific monitor, window, or Chrome tab they want to record, natively supporting multi-monitor desktop setups.

## State Management
- **Media State**: Manages the captured screenshot blobs or recorded video streams in memory before submission.
- **Form State**: Tracks the text input for the feedback description and upload progress statuses.

## Logic Checks and Discussion Done
- **Avoiding Extension UI in Captures**:
  - *Discussion*: Can we avoid capturing the extension's own screen/panel when a user takes a screenshot from the Feedback page?
  - *Logic Check*: Yes. By using the `chrome.tabs.captureVisibleTab()` API, the extension automatically captures only the active web page's DOM. Because native Chrome Side Panels and Popups are rendered in separate window contexts outside of the page DOM, they are automatically excluded from the resulting screenshot. (Note: If UI is ever injected directly into the webpage as a floating widget, it would require a temporary `display: none` toggle right before capture).
- **Handling Multiple Monitors**:
  - *Discussion*: How is screen recording handled if the user has multiple monitors connected?
  - *Logic Check*: When invoking the recording APIs (`chrome.desktopCapture` or `navigator.mediaDevices.getDisplayMedia`), the browser natively handles multi-monitor environments. It triggers an OS-level dialog box prompting the user to select exactly which screen (e.g., "Screen 1", "Screen 2") or application window they wish to capture. This entirely removes the need for custom multi-monitor detection logic within the extension code.
