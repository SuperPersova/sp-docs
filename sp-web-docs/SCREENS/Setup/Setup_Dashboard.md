# Setup Dashboard (App Card)

## Purpose
The Setup App Card is highly targeted at new tenant onboarding and foundational system initialization. Its core purpose is to guide organization owners through necessary deployment steps, such as setting up departments, leave policies, and organizational hierarchy.

## Flow, How Screen Working
- **Initialization**: Contained within `SetupApp.tsx`.
- **Default State**: Conditionally renders progress indicators for pending onboarding steps.
- **Interaction**: Provides jump-links to unfinished setup modules.

## State Management
- **Tenant Context**: Uses `resolvedCompanyId` and `selectedTenantId` to query the backend for setup completion status.
- **Local Progress State**: Evaluates which setup flags are true/false to dynamically determine which onboarding buttons to display to the user.

## Logic Checks and Discussion Done
- **Component Segregation**:
  - *Discussion*: Setup logic is irrelevant once an organization is fully onboarded. Keeping it in the main `HomePage` was unnecessary overhead.
  - *Logic Check*: By creating `SetupApp.tsx`, we allow the system to potentially omit rendering this card entirely for fully set-up organizations without polluting the home component.
- **PascalCase Compliance**:
  - *Discussion*: Renamed from `setupApp.tsx` to `SetupApp.tsx`.
  - *Logic Check*: Maintained the uniform structural standard established over the last few development sessions to fix type-check failures.
