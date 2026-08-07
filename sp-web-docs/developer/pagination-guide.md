# Generic Pagination System

This folder contains reusable pagination components and hooks for implementing both desktop pagination and mobile infinite scroll.

## Components

### 1. `usePagination` Hook

Generic hook that handles pagination logic for both desktop and mobile views.

```tsx
import { usePagination } from 'shared/hooks/usePagination';

const MyListPage = () => {
  const [items, setItems] = useState([
    /* your items */
  ]);

  // Apply filters first to get filtered items
  const filteredItems = useMemo(() => {
    return items.filter(/* your filter logic */);
  }, [items]);

  // Use pagination hook
  const pagination = usePagination(filteredItems, {
    desktopPageSize: 10, // items per page on desktop
    mobilePageSize: 10, // items to load at once on mobile
  });

  // Reset pagination when filters change
  useEffect(
    () => {
      pagination.reset();
    },
    [
      /* your filter dependencies */
    ],
  );

  // Use pagination.items to render your list
  return (
    <div>
      {pagination.items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
};
```

### 2. `useInfiniteScroll` Hook

Handles scroll detection for mobile infinite scroll.

```tsx
import { useInfiniteScroll } from 'shared/hooks/useInfiniteScroll';

// Setup infinite scroll
const scrollRef = useInfiniteScroll({
  onLoadMore: pagination.loadMore,
  hasMore: pagination.hasMore,
  enabled: pagination.isMobile,
  threshold: 0.8, // Load when scrolled to 80% of content
});

// Attach ref to your scrollable container
<div ref={scrollRef} className="overflow-y-auto max-h-[600px]">
  {/* Your list items */}
</div>;
```

### 3. `PaginationControls` Component

Pre-built pagination UI for desktop views.

```tsx
import { PaginationControls } from 'shared/ui/PaginationControls';

<PaginationControls
  currentPage={pagination.currentPage}
  totalPages={pagination.totalPages}
  totalItems={pagination.totalItems}
  pageSize={pagination.pageSize}
  onPageChange={pagination.setCurrentPage}
  onFirst={pagination.goToFirstPage}
  onPrevious={pagination.goToPreviousPage}
  onNext={pagination.goToNextPage}
  onLast={pagination.goToLastPage}
  canGoPrevious={pagination.canGoPrevious}
  canGoNext={pagination.canGoNext}
/>;
```

### 4. `InfiniteScrollLoader` Component

Loading indicator for mobile infinite scroll.

```tsx
import { InfiniteScrollLoader } from 'shared/ui/InfiniteScrollLoader';

<InfiniteScrollLoader hasMore={pagination.hasMore} />;
```

## Complete Example

```tsx
import { useMemo, useState, useEffect } from 'react';
import { usePagination } from 'shared/hooks/usePagination';
import { useInfiniteScroll } from 'shared/hooks/useInfiniteScroll';
import { PaginationControls } from 'shared/ui/PaginationControls';
import { InfiniteScrollLoader } from 'shared/ui/InfiniteScrollLoader';

const MembersPage = () => {
  const { data } = useGetMembersQuery();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});

  // Apply filters
  const filteredMembers = useMemo(() => {
    if (!data?.items) return [];
    let result = data.items;

    if (search) {
      result = result.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));
    }

    // Apply other filters...

    return result;
  }, [data?.items, search, filters]);

  // Setup pagination
  const pagination = usePagination(filteredMembers, {
    desktopPageSize: 20,
    mobilePageSize: 15,
  });

  // Reset when filters change
  useEffect(() => {
    pagination.reset();
  }, [search, filters]);

  // Setup infinite scroll for mobile
  const scrollRef = useInfiniteScroll({
    onLoadMore: pagination.loadMore,
    hasMore: pagination.hasMore,
    enabled: pagination.isMobile,
  });

  return (
    <div className="p-6">
      {/* Search and filters */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search members..."
      />

      {/* Desktop Table */}
      <div className="hidden md:block">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {pagination.items.map((member) => (
              <tr key={member.id}>
                <td>{member.name}</td>
                <td>{member.email}</td>
                <td>{member.role}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination controls */}
        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setCurrentPage}
          onFirst={pagination.goToFirstPage}
          onPrevious={pagination.goToPreviousPage}
          onNext={pagination.goToNextPage}
          onLast={pagination.goToLastPage}
          canGoPrevious={pagination.canGoPrevious}
          canGoNext={pagination.canGoNext}
        />
      </div>

      {/* Mobile Cards with Infinite Scroll */}
      <div ref={scrollRef} className="md:hidden space-y-3 max-h-[600px] overflow-y-auto">
        {pagination.items.map((member) => (
          <div key={member.id} className="border rounded-lg p-4">
            <h3>{member.name}</h3>
            <p>{member.email}</p>
            <span>{member.role}</span>
          </div>
        ))}

        <InfiniteScrollLoader hasMore={pagination.hasMore} />
      </div>
    </div>
  );
};
```

## Features

- ✅ **Automatic mobile/desktop detection**
- ✅ **Desktop pagination** with page controls
- ✅ **Mobile infinite scroll** with automatic loading
- ✅ **Theme support** (dark/light mode)
- ✅ **Font size preferences** integration
- ✅ **i18n support** for all text
- ✅ **Keyboard navigation** for pagination
- ✅ **ARIA labels** for accessibility
- ✅ **Responsive breakpoint** at 768px (md)

## Customization

All components support:

- Custom page sizes
- Custom scroll threshold
- Custom styling via className prop
- Translation key overrides

## Translation Keys

Required keys in `common.json`:

```json
{
  "pagination": {
    "showing": "Showing {{start}} to {{end}} of {{total}}",
    "first": "First page",
    "previous": "Previous page",
    "next": "Next page",
    "last": "Last page",
    "page": "Page {{page}}",
    "loadingMore": "Loading more..."
  }
}
```
