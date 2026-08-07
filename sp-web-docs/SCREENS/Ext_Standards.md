# SuperPersova Extension (`sp-web-ext`) Standards

This document outlines the core architectural and development standards for the SuperPersova Chrome Extension (`sp-web-ext`). Adhering to these standards ensures consistency, maintainability, and scalability across the codebase.

---

## 1. Internationalization (i18n) Architecture

When implementing multilingual support (`i18next`), we use the **Centralized Approach** rather than the **Colocated Approach**. 

### The "Centralized" Approach (Chosen Standard)
All translation strings are housed in global dictionaries under `src/i18n/locales/en/` (e.g., `pages.json`, `features.json`, `auth.json`, `common.json`).
* **Why we use it:** 
  * **Ease of Translation:** It is extremely easy to manage for external translators or translation services (like Crowdin or Phrase) as they only need to handle a few consolidated files.
  * **Bundling Efficiency:** Loading a few centralized JSON files is highly efficient for the Vite bundler in a Chrome Extension environment, avoiding the overhead of fetching hundreds of tiny dynamic imports.
  * **Shared Strings:** Prevents duplication of common strings (e.g., "Save", "Cancel") across multiple pages.

### The "Colocated" Approach (Alternative)
Translations live right next to the component code (e.g., `collabspace/collabspace_i18n.json`).
* **Why we don't use it:** While this provides perfect feature isolation, it requires complex dynamic loaders to prevent heavy bundle sizes, and forces translation teams to hunt through hundreds of nested directories to update strings.

---

## 2. UI & Responsiveness

* **Must Be Responsive:** The extension UI (specifically the side panel) must be completely fluid. Use Tailwind CSS flexbox, CSS grid, and relative units (`w-full`, `flex-1`) to ensure the UI gracefully adapts to any panel width the user chooses.
* **Modern Aesthetics:** Follow the established premium design system. Use deep dark modes (`bg-slate-950`), vibrant accents (`emerald-400`, `indigo-500`), glassmorphism (`backdrop-blur`), and smooth micro-animations (`transition-all active:scale-95`).
* **Icons:** Use the centralized `src/components/ui/icons.tsx` for all SVG icons to maintain a unified stroke width and style.

---

## 3. Shared Packages & API (`packages/shared`)

The project operates as a monorepo. To share business logic seamlessly between the web app (`sp-web`) and the extension (`sp-web-ext`):
* **API Clients & Services:** All Axios instances, interceptors, and service wrappers (e.g., `auth.service.ts`, `propulse.service.ts`) MUST live inside `packages/shared`. Do not define APIs directly inside the extension.
* **Shared Types:** All TypeScript interfaces, models, and enums must be defined in `packages/shared`.
* **Configurations:** Global constants and configuration flags should be centralized in the shared package to prevent desynchronization.

---

## 4. Data Validation

* **Frontend Validation:** Use robust client-side validation for all forms before triggering API calls. Ensure that visual feedback (error states, toast notifications) is provided to the user.
* **Type Safety:** Maintain strict TypeScript compliance (`pnpm tsc --noEmit` must pass). Avoid using `any`; utilize the shared interfaces defined in the `packages/shared` directory.

---

## 5. State Management

* **Zustand:** Use Zustand for global state management (e.g., `useAuthStore`). Keep stores small, modular, and focused on specific domains.
* **Persistence:** When persisting state across extension reloads or side panel toggles, utilize local storage intelligently within the Zustand store configuration.

---

## 6. Tenant & Company Context

* **Tenant Switching:** The user's active tenant (`x-tenant-id`) is managed globally and injected automatically into the headers of all API requests via the shared interceptor.
* **Company Context:** The active `companyId` is NOT passed globally as a header. It must be explicitly passed in the request body or query parameters on a per-request basis where applicable.
