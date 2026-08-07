# Job and Placements Dashboard (App Card)

## Purpose
The Job and Placements App Card serves as the central entry point on the main dashboard for recruitment and talent acquisition activities. Its primary purpose is to give HR professionals and hiring managers immediate visibility into open job pipelines without navigating into deeper recruitment modules.

## Flow, How Screen Working
- **Initialization**: The card logic was extracted into `RecruitmentApp.tsx` to render alongside other dashboard App Cards.
- **Default State**: Displays concise metrics and quick-action buttons related to hiring (e.g., active job postings, pending applications).
- **Interaction**: Clicking on the card or its internal links routes the user into the detailed `/recruitment` routes for comprehensive management.

## State Management
- **Local State**: Handles UI interactions such as dropdowns or specific quick-actions located on the card.
- **Global State**: Connected to the broader application state to access tenant configurations, ensuring the recruitment metrics shown are strictly scoped to the user's selected company.

## Logic Checks and Discussion Done
- **UI Modularization**:
  - *Discussion*: The Home Page was described as "very big and complicated". We isolated the Job and Placements logic into its own component.
  - *Logic Check*: Componentization ensures that any heavy data-fetching logic required for job metrics is encapsulated within `RecruitmentApp.tsx` and doesn't block the rendering of the core dashboard.
- **File Naming Standards**:
  - *Discussion*: We performed a comprehensive renaming of all AppCard files to enforce PascalCase (e.g., `recruitmentApp.tsx` -> `RecruitmentApp.tsx`).
  - *Logic Check*: This resolved strict file resolution paths in the TypeScript compilation (`tsc`) step and adheres to standard React ecosystem best practices.
