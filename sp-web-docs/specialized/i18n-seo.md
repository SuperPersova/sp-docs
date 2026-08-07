---
title: i18n & SEO Strategy
version: 1.0.0
status: baseline
owner: Internationalization Lead
audience: developer
lastUpdated: 2025-11-23
tags: [i18n, seo, ssr, localization]
locales: [en, fr, hi]
changeLog:
  - 2025-11-23: Migrated with front matter.
---

# i18n + SEO Plan

## Internationalization

- `i18next` + `react-i18next` namespaces per feature.
- Locale negotiation via URL segment `/:lang/*`.
- ICU pluralization & `Intl` for dates/numbers.

### Workflow UI Coverage

- WorkflowManagementPage, WorkflowBuilderPage, WorkflowDetailPage (definition + instance) use `workflows` namespace keys.
- Shared `SearchableSelectField` uses `common` keys for labels and hints; placeholders should reflect `minSearchChars` dynamically.
- Reviewer tags and badges render plain text; never render raw HTML.

## SEO

- Per-route metadata via `@tanstack/react-head`.
- SSR streaming for marketing pages; private app routes `noindex`.
- Sitemaps per locale; canonical + hreflang tags.

### Fonts & Theming

- Font size preference from `preferences.fontSize` applies globally (`sm`/`md`/`lg`). Workflow pages and shared components should inherit font size via root container classes.
- Theme variables (`bg-background`, `text-foreground`, `border-border`, etc.) must be used in all workflow UI components. Avoid hardcoded colors.

## Performance & Hygiene

- Lazy-load below-the-fold assets.
- Preload critical fonts (swap strategy).
- Lighthouse targets: LCP <2.5s, CLS <0.1, INP <200ms.

## Example Metadata

```tsx
<Head>
  <Title>Pricing · SuperPersova</Title>
  <Meta name="description" content="Transparent plans" />
  <Link rel="canonical" href="https://example.com/en/pricing" />
</Head>
```

### Examples

```tsx
// WorkflowManagementPage
<h1>{t('workflows.title', { defaultValue: 'Workflows' })}</h1>;

// SearchableSelectField placeholder reflecting min chars
const placeholder = t('common.search_min_chars', {
  count: minSearchChars,
  defaultValue: 'Type at least {{count}} characters to search...',
});
```

## Setup Summary

Install packages then initialize i18n once in app entry.

## Future Enhancements

- Dynamic locale negotiation via Accept-Language fallback chain.
- Server-side translated sitemaps.

---

End of i18n & SEO Strategy.
