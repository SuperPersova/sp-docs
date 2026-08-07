# UI Standards

## 1. Design Principles

- **Consistency:** Maintain uniform design patterns, typography, and interactive behaviors across all application modules.
- **Accessibility First:** Ensure the application is usable by everyone, adhering strictly to WCAG 2.1 AA standards.
- **Responsive & Adaptive:** UIs must scale gracefully from mobile devices to large desktop monitors.
- **Feedback & State:** Clearly communicate system status to users (loading, success, error, empty states).

## 2. Color Palette & Theming

- **Tokens Over Values:** Never use hardcoded hex or RGB values in components. Always use semantic design tokens (e.g., `var(--color-primary)`, `text-primary`, `bg-background`).
- **Dark Mode Support:** All colors must have corresponding light and dark mode variables. Test interfaces in both themes.
- **Contrast Ratios:** Ensure text and interactive elements meet the minimum contrast ratio of 4.5:1 against their backgrounds.

## 3. Typography

- **Font Families:** Use the designated system fonts to ensure fast loading and native feel unless a specific brand font is required.
- **Hierarchy:** Use semantic HTML tags (`h1` through `h6`) for structural hierarchy.
- **Sizing:** Use relative units (`rem`, `em`) for font sizes to respect user browser preferences. Do not use `px` for font sizing.

## 4. Spacing & Layout

- **Grid & Flexbox:** Prefer CSS Grid for page layouts and Flexbox for 1-dimensional component layouts.
- **Spacing Scale:** Adhere strictly to the defined spacing scale (e.g., 4px, 8px, 16px, 24px, 32px). Do not use arbitrary spacing values.
- **Responsive Breakpoints:** 
  - `sm`: 640px (Mobile)
  - `md`: 768px (Tablet)
  - `lg`: 1024px (Desktop)
  - `xl`: 1280px (Large Desktop)

## 5. Component Guidelines

- **Atomic Design:** Break down complex interfaces into smaller, reusable components (Atoms, Molecules, Organisms).
- **Interactive Elements:** Buttons and links must have distinct visual states for `default`, `hover`, `active`, `focus`, and `disabled`.
- **Focus Rings:** Never remove the outline on focus (`outline: none`) without providing an accessible alternative focus state.
- **Modals & Dialogs:** Must trap focus within the dialog when open and return focus to the triggering element when closed. They must be dismissible via the `Escape` key.
- **Module Components Location:** For each module, feature-specific components must be created in the `sp-web-ext/src/components/features` directory.

## 6. State Management (UI)

Always account for and explicitly design the following states:
- **Loading:** Use skeleton screens or targeted spinners. Avoid full-page blocking loaders unless necessary.
- **Empty:** Provide helpful illustrations or text guiding the user on what to do when no data is present.
- **Error:** Present clear, actionable error messages. Avoid technical jargon.
- **Disabled:** Visually indicate that an element is unavailable but ensure it is still accessible to screen readers if contextually required.

## 7. Animation and Transitions

- **Purposeful Motion:** Use animations to guide the user's attention or provide context for state changes, not just for decoration.
- **Duration:** Keep UI transitions snappy. Typical micro-interactions should last between 150ms and 300ms.
- **Reduced Motion:** Always respect the user's OS-level motion preferences using the `@media (prefers-reduced-motion: reduce)` media query to disable non-essential animations.

## 8. Styling Methodology

- Use the chosen framework (e.g., Tailwind CSS, CSS Modules, Styled Components) consistently.
- **Avoid Inline Styles:** Do not use the `style={{}}` attribute in React components unless calculating dynamic values that cannot be handled by classes.
- **Utility Classes:** Group utility classes logically (e.g., layout, spacing, typography, colors, interactions).

## 9. Monorepo & Shared Packages Strategy

- **Shared Theme File:** All central UI definitions (colors, typography, spacing, breakpoints) must reside in a centralized theme file within the shared package (`packages/shared`). This ensures that all applications and modules within the monorepo consume identical design tokens.
- **Common APIs & Constants:** Common API endpoints (e.g., `api-endpoints.ts`), interfaces, and data types should be centralized in shared packages. This prevents duplication and ensures a single source of truth across different frontends.
- **Component Reusability:** When building a UI component that is used across multiple projects in the workspace, it should be extracted and maintained in the shared component package rather than duplicated in app-specific codebases.

## 10. Naming Conventions

- **Intent-Based Naming:** Use full, descriptive, intent-based names for variables, properties, and functions. Avoid abbreviations or shortcuts.
  - *Correct:* `application`, `candidateInterview`, `applicationsWithInterviews`
  - *Incorrect:* `app`, `a`, `iv`, `intApps`
- **Placeholder and Unused Variables:** Do NOT use placeholder variables like `_`, `__`, or single letters (e.g., `s`, `x`) for ignored or unused variables in destructuring or callbacks. Always use proper full names (e.g., `unusedValue`, `ignoredEvent`) to maintain complete code clarity.
- **Iteration and Callbacks (`map`, `filter`, `forEach`):** Do not use single-letter variables (e.g., `a`, `i`) or shortcuts (e.g., `app`, `iv`) in iteration callbacks. Use the full singular form of the array's conceptual entity (e.g., `applications.map(application => ...)` instead of `applications.map(a => ...)`). This ensures code remains highly readable, especially when callbacks span multiple lines or contain nested logic.
- **Promise Handlers:** Name response parameters based on the data they represent rather than using generic abbreviations. Prefer `.then(userResponse => ...)` over `.then(res => ...)` when the additional context improves readability and maintainability.
- **Request and Payload Parameters:** Do not use generic parameter names like `data`, `payload`, `body`, or `req` for function arguments or API request payloads. Use descriptive names that reflect the exact type or purpose of the payload (e.g., `createRoleRequest`, `userSearchPayload`, `updateProfileData`).
- **Clarity Over Brevity:** The purpose of a variable should be immediately clear to any developer reading the code without needing to trace its origin.

---

End of UI Standards.
