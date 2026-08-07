# TanStack Table Implementation Guide

## Overview

This project now uses **TanStack Table v8** (formerly React Table) combined with **shadcn/ui** components for powerful, type-safe data tables.

## Architecture

### Pattern: TanStack Table + shadcn/ui

- **TanStack Table**: Business logic (sorting, filtering, selection, pagination)
- **shadcn/ui**: Visual components (Table, Card, Badge, etc.)

### Key Components

1. **DataTable** (`src/shared/ui/data-table.tsx`)
   - Generic reusable table component
   - Handles TanStack Table setup with sensible defaults
   - Supports loading states and empty messages
   - Built-in row selection, sorting, filtering

2. **Column Definitions** (e.g., `src/features/tenants/components/TenantTableColumns.tsx`)
   - Declarative column definitions using `ColumnDef<T>`
   - Type-safe with full TypeScript support
   - Custom cell renderers for complex UIs
   - Action columns with dropdown menus

3. **Page Implementation** (e.g., `src/features/tenants/pages/TenantsPage.tsx`)
   - Uses DataTable for desktop view
   - Custom mobile cards for responsive design
   - Server-side pagination via RTK Query
   - Infinite scroll for mobile

## Implementation Example

### 1. Install Dependencies

```bash
pnpm add @tanstack/react-table
```

### 2. Create Column Definitions

```typescript
import type { ColumnDef } from '@tanstack/react-table';

type CreateColumnsOptions = {
  onAction: (id: string) => void;
};

export const createColumns = ({ onAction }: CreateColumnsOptions): ColumnDef<DataType>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <DropdownMenu>
        {/* Action items */}
      </DropdownMenu>
    ),
  },
];
```

### 3. Use DataTable in Page

```typescript
import { DataTable } from '@/shared/ui/data-table';
import { createColumns } from '../components/columns';

const MyPage = () => {
  const { data, isLoading } = useGetDataQuery();

  const columns = createColumns({
    onAction: handleAction,
  });

  return (
    <div>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        emptyMessage="No results found."
      />
    </div>
  );
};
```

## Responsive Design

### Desktop: TanStack Table

```tsx
<div className="hidden md:block">
  <DataTable columns={columns} data={data} />
  <PaginationControls {...paginationProps} />
</div>
```

### Mobile: Custom Cards

```tsx
<div className="md:hidden space-y-3" ref={scrollContainerRef}>
  {data.map((item) => (
    <Card key={item.id}>{/* Custom card layout */}</Card>
  ))}
  <InfiniteScrollLoader hasMore={hasMore} />
</div>
```

## Key Features

### Row Selection

Built-in support for selecting rows:

```typescript
const table = useReactTable({
  enableRowSelection: true,
  onRowSelectionChange: setRowSelection,
  state: { rowSelection },
  // ...
});

// Get selected rows
const selectedRows = table.getSelectedRowModel().rows;
```

### Sorting

Enable column sorting:

```typescript
{
  accessorKey: 'createdAt',
  header: 'Created',
  enableSorting: true, // default is true
}
```

### Custom Cell Renderers

Full control over cell rendering:

```typescript
{
  id: 'status',
  cell: ({ row }) => {
    const status = row.getValue('status');
    return <Badge variant={getVariant(status)}>{status}</Badge>;
  },
}
```

### Actions Column

Dropdown menus for row actions:

```typescript
{
  id: 'actions',
  cell: ({ row }) => {
    const item = row.original;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon">
            <IconMoreVertical size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleView(item.id)}>
            View
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  },
}
```

## Pagination

### Server-Side Pagination

Use `useServerPagination` hook:

```typescript
const pagination = useServerPagination(totalItems, {
  desktopPageSize: 10,
  mobilePageSize: 10,
});

const { data } = useGetDataQuery({
  ...pagination.queryParams, // { page, pageSize }
});
```

### Pagination Controls

```typescript
<PaginationControls
  currentPage={pagination.currentPage}
  totalPages={pagination.totalPages}
  totalItems={totalItems}
  pageSize={pagination.queryParams.pageSize}
  onPageChange={pagination.setCurrentPage}
  onFirst={pagination.goToFirstPage}
  onPrevious={pagination.goToPreviousPage}
  onNext={pagination.goToNextPage}
  onLast={pagination.goToLastPage}
  canGoPrevious={pagination.canGoPrevious}
  canGoNext={pagination.canGoNext}
/>
```

## Best Practices

### 1. Separate Column Definitions

Keep column definitions in separate files for reusability:

```
features/
  tenants/
    components/
      TenantTableColumns.tsx  ✅
    pages/
      TenantsPage.tsx
```

### 2. Use Callbacks for Actions

Pass action handlers as options to column factory functions:

```typescript
const columns = createColumns({
  onEdit: handleEdit,
  onDelete: handleDelete,
});
```

### 3. Type Safety

Always use TypeScript generics:

```typescript
ColumnDef<TenantSummary>[]  // ✅ Type-safe
ColumnDef[]                  // ❌ Not type-safe
```

### 4. Mobile Considerations

Always provide mobile-friendly alternative:

```typescript
// Desktop: Complex table with many columns
<DataTable columns={columns} data={data} />

// Mobile: Simplified card layout
<Card>{/* Essential info only */}</Card>
```

### 5. Performance

For large datasets, consider:

- Virtual scrolling (TanStack Virtual)
- Server-side filtering/sorting
- Memoization of column definitions

## Migration from HTML Tables

### Before (HTML Table)

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.status}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### After (TanStack Table)

```tsx
const columns: ColumnDef<DataType>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'status', header: 'Status' },
];

<DataTable columns={columns} data={data} />;
```

## Resources

- [TanStack Table Docs](https://tanstack.com/table/v8)
- [shadcn/ui Table](https://ui.shadcn.com/docs/components/table)
- [Example: TenantsPage](../../../src/features/tenants/pages/TenantsPage.tsx)
- [Example: TenantTableColumns](../../../src/features/tenants/components/TenantTableColumns.tsx)

## When NOT to Use TanStack Table

- **Simple lists**: Use basic shadcn/ui Table for < 5 columns with no interactivity
- **Mobile-only views**: Use Card components directly
- **Custom layouts**: When table structure doesn't fit your needs (use custom HTML)

## Troubleshooting

### "Property 'xxx' does not exist on type"

Ensure your data type matches the column accessors:

```typescript
// ✅ Good
const columns: ColumnDef<TenantSummary>[] = [
  { accessorKey: 'name' }, // 'name' exists in TenantSummary
];

// ❌ Bad
{
  accessorKey: 'domain';
} // if 'domain' doesn't exist in TenantSummary
```

### Navigation not working in action dropdowns

Use `onClick={(e) => e.stopPropagation()}` on trigger:

```typescript
<DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
  <Button>Actions</Button>
</DropdownMenuTrigger>
```

### Row selection not working

Ensure `enableRowSelection: true` in table config:

```typescript
const table = useReactTable({
  enableRowSelection: true,
  onRowSelectionChange: setRowSelection,
  state: { rowSelection },
  // ...
});
```
