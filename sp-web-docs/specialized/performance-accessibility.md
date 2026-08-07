---
title: Performance & Accessibility Guide
version: 1.0.0
status: baseline
owner: Frontend Performance
audience: developer
lastUpdated: 2025-11-23
tags: [performance, accessibility, vitals, a11y]
metrics:
  lcp: < 2500ms
  cls: < 0.1
  inp: < 200ms
  tti: < 5000ms
changeLog:
  - 2025-11-23: Migrated + enriched KPIs.
  - 2025-11-23: Added Prefetch Waste Ratio metric & version reload impact notes.
  - 2025-11-23: Final baseline — KPIs established (LCP, CLS, INP, TTI), added Prefetch Waste Ratio, version mismatch reload impact (stale session duration), and optimization guidance for adaptive prefetch & visibility strategies.
---

# Performance & Accessibility

## Performance Checklist

- Code-split routes/features (dynamic imports for heavy widgets).
- Prefetch route bundles on hover/focus/idle.
- Optimize images (AVIF/WebP) + responsive sizes (`<img loading="lazy">`).
- Memoize expensive derived values (`useMemo`) & stable callbacks (`useCallback`).
- Monitor Web Vitals (LCP, CLS, INP) → send to analytics endpoint.
- Track Prefetch Waste Ratio to tune heuristics.

### Metrics Extension

Prefetch Waste Ratio:

```
prefetch_waste_ratio = prefetched_routes_never_visited_within_TTL / total_prefetched_routes
```

Goal: Keep < 0.35 after initial tuning; adjust hover/idle strategy or introduce visibility-based prefetch.

Version Reload Impact:

- Automatic reload on version mismatch lowers stale interaction latency (time user spends on outdated bundle) — indirectly improves INP for interactions reliant on new code paths.
- Metric: `stale_session_duration` (last_poll_timestamp - mismatch_detected_timestamp). Target < 120s average.

### Optimization Notes

- If waste ratio high, defer idle prefetch until after first user navigation.
- Introduce IntersectionObserver for visible navigation groups to lower unnecessary speculation.

## Accessibility Checklist

- Keyboard reachable components (Tab, Shift+Tab, Arrow for menus).
- Visible focus indicators using Tailwind focus utilities.
- Use semantic elements; apply ARIA roles only when semantics unavailable.
- Respect `prefers-reduced-motion` (conditional motion classes).

### Workflow UI & Shared Component Notes

- `SearchableSelectField` must provide accessible labels; tags and remove buttons include `aria-label` (e.g., `Remove {label}`).
- Checkbox clicks inside options should stop propagation to prevent unintended selection toggles while preserving keyboard accessibility.
- Announce loading states (e.g., "Searching...") for debounced search operations.

## Examples

### Memoization

```tsx
const total = useMemo(() => items.reduce((s, i) => s + i.price, 0), [items]);
```

### Stable Callbacks

```tsx
const handleSelect = useCallback((id: string) => {
  /* ... */
}, []);
```

## Future Enhancements

- Bundle analyzer report gating (max initial JS threshold).
- Adaptive prefetch heuristics based on user navigation patterns.
- Stale session dashboard (tracking version adoption time).

### Workflow Performance Notes

- Debounce search inputs at 300ms standard in all management pages and shared components.
- Use RTK Query caching to avoid duplicate workflow fetches; enable skip logic in dual-query detail page to reduce unnecessary calls.

---

End of Performance & Accessibility Guide.
