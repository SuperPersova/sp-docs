# Integrations Dashboard (App Card)

## Purpose
The Integrations App Card is responsible for displaying the connection health and status of third-party platforms linked to the workspace (e.g., Calendar syncs, Slack, Teams). Its purpose is to provide a single pane of glass for monitoring external data pipelines.

## Flow, How Screen Working
- **Default State**: Shows active/inactive badges for configured external tools directly on the home dashboard.
- **Interaction**: Navigates the user to the integrations marketplace or configuration screen to resolve broken syncs.

## State Management
- **Integration Store**: Listens to an integrations registry to fetch the last-synced timestamps and authentication health of external providers.

## Logic Checks and Discussion Done
- **Dashboard Modularity**:
  - *Discussion*: In line with the recent push to completely decentralize the `HomePage.tsx` logic.
  - *Logic Check*: Integrations often require calling third-party APIs or checking token validity. Isolating this into an App Card ensures that external API latency does not impact the loading time of core modules like Collabspace.
