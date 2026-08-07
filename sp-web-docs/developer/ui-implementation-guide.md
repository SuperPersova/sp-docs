---
title: UI Implementation Guide
version: 2.0.0
status: active
owner: Frontend Platform
audience: developer
lastUpdated: 2025-11-25
tags: [ui, shadcn, responsive, pagination, i18n]
changeLog:
  - 2025-11-25: Created comprehensive UI implementation guide based on tenant module patterns
  - 2025-11-25: Added ShadCN integration, responsive patterns, pagination, and icon standards
---

# UI Implementation Guide

Complete guide for implementing consistent, accessible, and responsive UI components following the patterns established in the tenant module.

## Table of Contents

1. [Quick Start](#quick-start)
2. [ShadCN Components](#shadcn-components)
3. [Responsive Design](#responsive-design)
4. [Pagination](#pagination)
5. [Icon System](#icon-system)
6. [Theming & Preferences](#theming--preferences)
7. [Internationalization (i18n)](#internationalization-i18n)
8. [Confirm Dialogs](#confirm-dialogs)
9. [Complete Page Example](#complete-page-example)
10. [Workflow Tasks Filters](#workflow-tasks-filters)

---

## Quick Start

### Prerequisites

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Access application
http://localhost:5173/
```

### Tech Stack

- **React 19.2.0** - Latest React with modern patterns
- **Vite 7.2.4** - Fast build tool and dev server
- **TanStack Router 1.139.3** - Type-safe routing
- **Redux Toolkit 2.10.1** - State management + RTK Query
- **i18next 23.16.8** - Internationalization
- **Tailwind CSS 3.4.18** - Utility-first styling
- **ShadCN UI** - Accessible component primitives
- **Radix UI** - Headless UI components

---

## ShadCN Components

### Installed Components

Current ShadCN components available in `src/shared/ui/`:

```typescript
// Layout & Structure
- card           // Card container with header/content/footer
- separator      // Visual divider line
- tabs           // Tabbed navigation interface

// Forms & Inputs
- button         // Primary interaction buttons
- input          // Text input fields
- label          // Form field labels
- textarea       // Multi-line text input
- select         // Dropdown selection
- checkbox       // Checkbox input
- switch         // Toggle switch
- slider         // Range slider input

// Data Display
- table          // Data table structure
- badge          // Status/tag indicators

// Overlays & Modals
- dialog         // Modal dialog
- alert-dialog   // Confirmation dialog
- dropdown-menu  // Context menu dropdown

// Feedback
- sonner         // Toast notifications (replaces custom ToastProvider)

// Layout Utilities
- resizable      // Resizable panel groups (replaces custom ResizablePane)

// Data Visualization
- charts         // Chart components (Bar, Line, Pie) - located in src/shared/ui/charts/
```

### Installation Pattern

When you need a new ShadCN component:

```bash
# Install the component
npx shadcn@latest add <component-name>

# Example: Add accordion
npx shadcn@latest add accordion

# Result: Creates src/shared/ui/accordion.tsx
```

### Post-Installation Checklist

After installing a new ShadCN component:

1. **Replace lucide-react icons** with centralized icons from `src/shared/ui/icons.tsx`
2. **Update React.ElementRef** to `React.ComponentRef` (modern API)
3. **Test theme compatibility** (light/dark mode)
4. **Verify responsive behavior** on mobile/desktop

**Example Fix:**

```tsx
// ❌ Before (default ShadCN)
import { Check } from 'lucide-react';
const Component = React.forwardRef<
  React.ElementRef<typeof Primitive.Root>
  // ...
>;

// ✅ After (project standard)
import { IconCheck } from './icons';
const Component = React.forwardRef<
  React.ComponentRef<typeof Primitive.Root>
  // ...
>;
```

---

## Responsive Design

## Workflow Tasks Filters

### Overview

The Workflow Tasks page consolidates approvals into a single, server-filtered experience with quick tiles and a condensed filter row.

### Filter Row (Order & Labels)

- Search: labeled “Search” with tooltip explaining name/ID/message matching.
- Resources: labeled “Resources”; default option shows “All”.
- Priorities: labeled “Priorities”; default option shows “All”.
- Workflows: labeled “Workflows”; default option shows “All”.

Reasoning:

- Aligns with attached design (tiles above, single-row filters below).
- Reduces cognitive load by collapsing “All Types/Priorities/Workflows” into a consistent “All”.

Example Snippet (from `WorkflowTasksFilter.tsx`):

```tsx
<LabelInputField label={t('workflows.search')}>
  <input ... value={search} onChange={(e) => setSearch(e.target.value)} />
</LabelInputField>

<LabelInputField label={t('workflows.resources')}>
  <Select value={resourceTypeFilter} onValueChange={(v) => setResourceTypeFilter(v as ResourceType)}>
    <SelectTrigger><SelectValue placeholder={t('workflows.filters.all')} /></SelectTrigger>
    <SelectContent>
      <SelectItem value="ALL">{t('workflows.filters.all')}</SelectItem>
      <SelectItem value="ROLE">{t('workflows.filters.roles')}</SelectItem>
      ...
    </SelectContent>
  </Select>
</LabelInputField>
```

### Quick Tiles

- All, Pending, Approved, Rejected, Overdue with status/urgency binding.
- Active styles via subtle ring to indicate selection.

### Footer Action

- Removed “View all instances” footer button from `WorkflowTasksPage.tsx` to keep focus on assigned tasks.

### Breakpoint Strategy

**Tailwind Breakpoints:**

```typescript
// tailwind.config.ts
screens: {
  'sm': '640px',   // Small devices
  'md': '768px',   // Tablets (CRITICAL: Desktop/Mobile split)
  'lg': '1024px',  // Laptops
  'xl': '1280px',  // Desktops
  '2xl': '1536px'  // Large screens
}
```

**Key Breakpoint: 768px (md)**

- Below 768px = Mobile (cards, infinite scroll)
- Above 768px = Desktop (tables, pagination)

### Mobile-First Patterns

#### Pattern 1: Desktop Table → Mobile Cards

```tsx
// Desktop: Table with columns
<div className="hidden md:block">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {items.map(item => (
        <TableRow key={item.id}>
          <TableCell>{item.name}</TableCell>
          <TableCell>{item.email}</TableCell>
          <TableCell>
            <Badge variant={getVariant(item.status)}>
              {item.status}
            </Badge>
          </TableCell>
          <TableCell>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <IconMoreVertical size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleEdit(item.id)}>
                  <IconEdit size={16} className="mr-2" />
                  Edit
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>

// Mobile: Cards with essential info
<div className="md:hidden space-y-3">
  {items.map(item => (
    <Card key={item.id}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold">{item.name}</h3>
            <p className="text-sm text-muted-foreground">{item.email}</p>
          </div>
          <Badge variant={getVariant(item.status)}>
            {item.status}
          </Badge>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleEdit(item.id)}>
            <IconEdit size={14} className="mr-1" />
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}>
            <IconDelete size={14} />
          </Button>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

#### Pattern 2: Responsive Layout

```tsx
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id}>{item.name}</Card>)}
</div>

// Responsive flex
<div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
  <Input className="w-full md:w-auto" />
  <Button className="w-full md:w-auto">Submit</Button>
</div>

// Responsive padding
<div className="p-4 md:p-6">
  <h1 className="text-xl md:text-2xl">Title</h1>
</div>
```

---

## Pagination

See `src/shared/hooks/PAGINATION_GUIDE.md` for complete documentation.

### Quick Implementation

**Step 1: Setup Pagination Hook**

```tsx
import { usePagination } from 'shared/hooks/usePagination';
import { useInfiniteScroll } from 'shared/hooks/useInfiniteScroll';
import { PaginationControls } from 'shared/ui/PaginationControls';
import { InfiniteScrollLoader } from 'shared/ui/InfiniteScrollLoader';

const pagination = usePagination(filteredItems, {
  desktopPageSize: 20, // Items per page on desktop
  mobilePageSize: 15, // Items to load at once on mobile
});
```

**Step 2: Setup Infinite Scroll (Mobile)**

```tsx
const scrollRef = useInfiniteScroll({
  onLoadMore: pagination.loadMore,
  hasMore: pagination.hasMore,
  enabled: pagination.isMobile,
  threshold: 0.8, // Load when 80% scrolled
});
```

**Step 3: Render Desktop Pagination**

```tsx
<div className="hidden md:block">
  <Table>{/* Table content with pagination.items */}</Table>

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
```

**Step 4: Render Mobile Infinite Scroll**

```tsx
<div ref={scrollRef} className="md:hidden space-y-3 overflow-y-auto max-h-[600px]">
  {pagination.items.map((item) => (
    <Card key={item.id}>{/* Card content */}</Card>
  ))}

  <InfiniteScrollLoader hasMore={pagination.hasMore} />
</div>
```

**Step 5: Reset on Filter Changes**

```tsx
useEffect(() => {
  pagination.reset();
}, [search, filters]); // Reset when filters change
```

### Pagination Features

✅ **Automatic mobile/desktop detection** (768px breakpoint)  
✅ **Desktop**: Page-based navigation with controls  
✅ **Mobile**: Infinite scroll with auto-loading  
✅ **Theme support**: Dark/light mode compatible  
✅ **Font size**: Respects user preferences  
✅ **i18n**: All text translatable  
✅ **Accessibility**: ARIA labels, keyboard navigation

---

## Icon System

### Centralized Icons (`src/shared/ui/icons.tsx`)

**Why Centralized Icons?**

- ✅ **Consistency**: All icons follow same style and size
- ✅ **Performance**: No duplicate icon dependencies
- ✅ **Maintainability**: Single source of truth
- ✅ **Tree-shaking**: Only used icons in bundle
- ✅ **Customization**: Easy to modify or replace icons

### Available Icons

```typescript
// Navigation
(IconHome,
  IconChevron,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconChevronDown,
  IconChevronsLeft,
  IconChevronsRight);

// Actions
(IconEdit,
  IconDelete,
  IconSuspend,
  IconPlus,
  IconX,
  IconCheck,
  IconSearch,
  IconFilter,
  IconMoreVertical,
  IconSliders);

// Content
(IconReport,
  IconProject,
  IconUsers,
  IconFeatures,
  IconUserPlus,
  IconSettings,
  IconTheme,
  IconText,
  IconLogout);

// Status
(IconAlertTriangle, IconAlertCircle, IconCircle, IconLoader);

// Misc
(IconEye, IconEyeOff, IconLock, IconCreditCard, IconBarChart, IconGripVertical);
```

### Usage

```tsx
import { IconEdit, IconDelete, IconCheck } from 'shared/ui/icons';

// Basic usage
<IconEdit />

// With custom size
<IconEdit size={20} />

// With className
<IconEdit className="text-red-500" />

// In buttons
<Button>
  <IconEdit size={16} className="mr-2" />
  Edit
</Button>
```

### Adding New Icons

```tsx
// src/shared/ui/icons.tsx

// Add new icon
export const IconNewIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M..." /> {/* Your SVG path */}
  </Svg>
);
```

**Icon Guidelines:**

- Use 24x24 viewBox for consistency
- Keep stroke-width at 1.8
- Use stroke (not fill) for line icons
- Follow existing naming: `Icon<Name>`

---

## Theming & Preferences

### Theme System

**Three Themes:**

1. **Light Mode** - Default light background
2. **Dark Mode** - Dark background
3. **System** - Follows OS preference

### CSS Variables

Themes use CSS variables defined in `src/shared/styles/index.css`:

```css
@layer base {
  :root {
    /* Light mode (default) */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    /* ... more variables */
  }

  .dark {
    /* Dark mode overrides */
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    /* ... more variables */
  }
}
```

### Font Size Preferences

**Three Sizes:**

- `sm` - Small (0.875rem / 14px)
- `md` - Medium (1rem / 16px) - Default
- `lg` - Large (1.125rem / 18px)

### Language Support

**Available Languages:**

- `en` - English
- `es` - Spanish
- More can be added in `src/shared/i18n/locales/`

### Using Preferences

```tsx
import type { RootState } from 'app/store';
import { useSelector } from 'react-redux';

function MyComponent() {
  const { theme, fontSize, language } = useSelector((s: RootState) => s.preferences);

  // Font size class
  const fontSizeClass = fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg' : 'text-base';

  return <div className={fontSizeClass}>Content</div>;
}
```

### Preferences Page

Users can change preferences in: `/app/preferences`

**Features:**

- Theme toggle (light/dark/system)
- Font size selector (sm/md/lg)
- Language selector
- UI density (compact/comfortable)
- Persisted in localStorage

---

## Internationalization (i18n)

### Translation Files

**Location:** `src/shared/i18n/locales/<lang>/<namespace>.json`

```
src/shared/i18n/locales/
  en/
    common.json      # Shared translations
    tenant.json      # Tenant module
    preferences.json # Preferences
    auth.json        # Authentication
  es/
    common.json
    tenant.json
    ...
```

### Using Translations

```tsx
import i18next from 'i18next';

function MyComponent() {
  const t = i18next.t.bind(i18next);

  return (
    <div>
      {/* Basic translation */}
      <h1>{t('title', { ns: 'common' })}</h1>

      {/* With default value */}
      <p>
        {t('description', {
          ns: 'tenant',
          defaultValue: 'Default text',
        })}
      </p>

      {/* With variables */}
      <span>
        {t('welcome', {
          ns: 'common',
          name: user.name,
        })}
      </span>

      {/* Pluralization */}
      <span>
        {t('items', {
          ns: 'common',
          count: items.length,
        })}
      </span>
    </div>
  );
}
```

### Translation Key Structure

```json
{
  "tenants": {
    "title": "Tenant Management",
    "subtitle": "Manage and monitor tenants",
    "actions": {
      "create": "Create Tenant",
      "edit": "Edit Tenant",
      "delete": "Delete Tenant"
    },
    "status": {
      "active": "Active",
      "suspended": "Suspended",
      "trial": "Trial"
    }
  },
  "common": {
    "actions": {
      "save": "Save",
      "cancel": "Cancel",
      "delete": "Delete"
    },
    "pagination": {
      "showing": "Showing {{start}} to {{end}} of {{total}}",
      "first": "First page",
      "previous": "Previous page",
      "next": "Next page",
      "last": "Last page"
    }
  }
}
```

### Best Practices

✅ **Use namespaces** to organize translations by feature  
✅ **Always provide defaults** for new keys  
✅ **Use variables** instead of string concatenation  
✅ **Leverage pluralization** for count-based text  
✅ **Keep keys descriptive** but concise  
✅ **Group related keys** under common parent objects

---

## Confirm Dialogs

### Using ConfirmDialog

**Component:** `src/shared/ui/ConfirmDialog.tsx`

```tsx
import { ConfirmDialog } from 'shared/ui/ConfirmDialog';
import { useState } from 'react';

function MyComponent() {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'default' as const,
  });

  const handleDelete = (item: Item) => {
    setConfirmState({
      isOpen: true,
      title: t('delete.title', { ns: 'tenant' }),
      message: t('delete.confirm', {
        ns: 'tenant',
        name: item.name,
      }),
      variant: 'destructive',
    });
  };

  const handleConfirm = async () => {
    // Perform action
    await deleteItem(item.id);
    setConfirmState({ ...confirmState, isOpen: false });
  };

  const handleCancel = () => {
    setConfirmState({ ...confirmState, isOpen: false });
  };

  return (
    <>
      <Button onClick={() => handleDelete(item)}>Delete</Button>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}
```

### ConfirmDialog Variants

```typescript
type Variant = 'default' | 'destructive' | 'warning';

// default - Blue accent, for general confirmations
<ConfirmDialog variant="default" />

// destructive - Red accent, for delete/remove actions
<ConfirmDialog variant="destructive" />

// warning - Orange/yellow accent, for risky actions
<ConfirmDialog variant="warning" />
```

### Pattern: Multiple Confirm States

```tsx
const [confirmDialog, setConfirmDialog] = useState<{
  isOpen: boolean;
  type: 'suspend' | 'delete' | null;
  itemId: string | null;
  itemName: string | null;
}>({
  isOpen: false,
  type: null,
  itemId: null,
  itemName: null,
});

const handleSuspend = (id: string, name: string) => {
  setConfirmDialog({
    isOpen: true,
    type: 'suspend',
    itemId: id,
    itemName: name,
  });
};

const handleDelete = (id: string, name: string) => {
  setConfirmDialog({
    isOpen: true,
    type: 'delete',
    itemId: id,
    itemName: name,
  });
};

const handleConfirm = async () => {
  if (!confirmDialog.itemId) return;

  if (confirmDialog.type === 'suspend') {
    await suspendItem(confirmDialog.itemId);
  } else if (confirmDialog.type === 'delete') {
    await deleteItem(confirmDialog.itemId);
  }

  setConfirmDialog({
    isOpen: false,
    type: null,
    itemId: null,
    itemName: null,
  });
};
```

---

## Complete Page Example

Here's a complete implementation following all standards:

```tsx
// src/features/members/pages/MembersPage.tsx

import { useNavigate } from '@tanstack/react-router';
import type { RootState } from 'app/store';
import {
  useGetMembersQuery,
  useSuspendMemberMutation,
  useDeleteMemberMutation,
} from 'features/members/api/membersApi';
import i18next from 'i18next';
import { useMemo, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { ROUTES } from 'shared/constants/routes';
import { useInfiniteScroll } from 'shared/hooks/useInfiniteScroll';
import { usePagination } from 'shared/hooks/usePagination';
import { ConfirmDialog } from 'shared/ui/ConfirmDialog';
import { Button } from 'shared/ui/button';
import { Input } from 'shared/ui/input';
import { Badge } from 'shared/ui/badge';
import { Card, CardContent } from 'shared/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'shared/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'shared/ui/dropdown-menu';
import {
  IconSearch,
  IconMoreVertical,
  IconEdit,
  IconSuspend,
  IconDelete,
  IconPlus,
} from 'shared/ui/icons';
import { InfiniteScrollLoader } from 'shared/ui/InfiniteScrollLoader';
import { PaginationControls } from 'shared/ui/PaginationControls';

export function MembersPage() {
  // Hooks
  const { data, isLoading } = useGetMembersQuery();
  const [suspendMember] = useSuspendMemberMutation();
  const [deleteMember] = useDeleteMemberMutation();
  const navigate = useNavigate();
  const { fontSize } = useSelector((s: RootState) => s.preferences);
  const t = i18next.t.bind(i18next);

  // Local state
  const [search, setSearch] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: null as 'suspend' | 'delete' | null,
    memberId: null as string | null,
    memberName: null as string | null,
  });

  // Font size styling
  const fontSizeClass = fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg' : 'text-base';

  // Filter members
  const filteredMembers = useMemo(() => {
    if (!data?.items) return [];
    let result = data.items;

    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(lowerSearch) || m.email.toLowerCase().includes(lowerSearch),
      );
    }

    return result;
  }, [data?.items, search]);

  // Setup pagination
  const pagination = usePagination(filteredMembers, {
    desktopPageSize: 20,
    mobilePageSize: 15,
  });

  // Setup infinite scroll
  const scrollRef = useInfiniteScroll({
    onLoadMore: pagination.loadMore,
    hasMore: pagination.hasMore,
    enabled: pagination.isMobile,
    threshold: 0.8,
  });

  // Reset pagination on search change
  useEffect(() => {
    pagination.reset();
  }, [search]);

  // Action handlers
  const handleSuspend = (memberId: string, memberName: string) => {
    setConfirmDialog({
      isOpen: true,
      type: 'suspend',
      memberId,
      memberName,
    });
  };

  const handleDelete = (memberId: string, memberName: string) => {
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      memberId,
      memberName,
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog.memberId) return;

    try {
      if (confirmDialog.type === 'suspend') {
        await suspendMember(confirmDialog.memberId).unwrap();
      } else if (confirmDialog.type === 'delete') {
        await deleteMember(confirmDialog.memberId).unwrap();
      }
      setConfirmDialog({
        isOpen: false,
        type: null,
        memberId: null,
        memberName: null,
      });
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  const handleCancelAction = () => {
    setConfirmDialog({
      isOpen: false,
      type: null,
      memberId: null,
      memberName: null,
    });
  };

  const getStatusVariant = (status: string) => {
    if (status === 'active') return 'default';
    if (status === 'suspended') return 'destructive';
    return 'secondary';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse h-6 w-40 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className={`p-4 md:p-6 space-y-6 ${fontSizeClass}`}>
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('members.title', { ns: 'members', defaultValue: 'Team Members' })}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('members.subtitle', {
              ns: 'members',
              defaultValue: 'Manage team members and their roles.',
            })}
          </p>
        </div>
        <Button onClick={() => navigate({ to: ROUTES.members.create })}>
          <IconPlus size={16} className="mr-2" />
          {t('members.actions.create', { ns: 'members', defaultValue: 'Add Member' })}
        </Button>
      </header>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder={t('members.search', { ns: 'members', defaultValue: 'Search members...' })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {t('members.table.name', { ns: 'members', defaultValue: 'Name' })}
              </TableHead>
              <TableHead>
                {t('members.table.email', { ns: 'members', defaultValue: 'Email' })}
              </TableHead>
              <TableHead>
                {t('members.table.role', { ns: 'members', defaultValue: 'Role' })}
              </TableHead>
              <TableHead>
                {t('members.table.status', { ns: 'members', defaultValue: 'Status' })}
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.items.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>{member.role}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(member.status)}>{member.status}</Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <IconMoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => navigate({ to: ROUTES.members.edit(member.id) })}
                      >
                        <IconEdit size={16} className="mr-2" />
                        {t('members.actions.edit', { ns: 'members', defaultValue: 'Edit' })}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleSuspend(member.id, member.name)}>
                        <IconSuspend size={16} className="mr-2" />
                        {t('members.actions.suspend', { ns: 'members', defaultValue: 'Suspend' })}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(member.id, member.name)}
                      >
                        <IconDelete size={16} className="mr-2" />
                        {t('members.actions.delete', { ns: 'members', defaultValue: 'Delete' })}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <PaginationControls {...pagination} />
      </div>

      {/* Mobile Cards with Infinite Scroll */}
      <div ref={scrollRef} className="md:hidden space-y-3 overflow-y-auto max-h-[600px]">
        {pagination.items.map((member) => (
          <Card key={member.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                  <p className="text-sm mt-1">{member.role}</p>
                </div>
                <Badge variant={getStatusVariant(member.status)}>{member.status}</Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate({ to: ROUTES.members.edit(member.id) })}
                >
                  <IconEdit size={14} className="mr-1" />
                  {t('members.actions.edit', { ns: 'members', defaultValue: 'Edit' })}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(member.id, member.name)}
                >
                  <IconDelete size={14} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <InfiniteScrollLoader hasMore={pagination.hasMore} />
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={
          confirmDialog.type === 'suspend'
            ? t('members.confirm.suspend.title', {
                ns: 'members',
                defaultValue: 'Suspend Member',
              })
            : t('members.confirm.delete.title', {
                ns: 'members',
                defaultValue: 'Delete Member',
              })
        }
        message={
          confirmDialog.type === 'suspend'
            ? t('members.confirm.suspend.message', {
                ns: 'members',
                defaultValue: 'Are you sure you want to suspend {{name}}?',
                name: confirmDialog.memberName,
              })
            : t('members.confirm.delete.message', {
                ns: 'members',
                defaultValue:
                  'Are you sure you want to delete {{name}}? This action cannot be undone.',
                name: confirmDialog.memberName,
              })
        }
        variant={confirmDialog.type === 'delete' ? 'destructive' : 'warning'}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
      />
    </div>
  );
}
```

---

## ShadCN Charts (Data Visualization)

### Why ShadCN Charts Over Direct Recharts?

We use **ShadCN chart components** instead of direct Recharts imports for several critical reasons:

#### 1. **Theme Integration**

```typescript
// ❌ BAD: Manual theme handling with direct Recharts
const isDark = theme === 'dark';
const chartColors = {
  primary: isDark ? '#60a5fa' : '#3b82f6',
  grid: isDark ? '#374151' : '#e5e7eb',
};

// ✅ GOOD: Automatic theme integration with ShadCN
const chartConfig = {
  value: {
    label: 'Tenants',
    color: 'hsl(var(--chart-1))', // Auto-adapts to theme
  },
} satisfies ChartConfig;
```

#### 2. **Consistent Styling**

- ShadCN charts match your design system automatically
- Tooltips, legends, and axes styled consistently
- No manual CSS overrides needed

#### 3. **Better Developer Experience**

- Cleaner API with `ChartContainer` wrapper
- Type-safe configuration with `ChartConfig`
- Less boilerplate code (no ResponsiveContainer, manual colors, etc.)

#### 4. **Maintainability**

- Centralized chart styling in CSS variables
- Easy to update all charts at once
- Follows project standards (like button, card, etc.)

### Installation

```bash
# Install ShadCN chart component
npx shadcn@latest add chart

# Result: Creates src/shared/ui/chart.tsx
# Recharts installed automatically as peer dependency
```

**Post-Installation Setup:**

1. **Move to charts folder** (follows project structure):

```bash
mkdir src/shared/ui/charts
mv src/shared/ui/chart.tsx src/shared/ui/charts/chart.tsx
```

2. **Create index.tsx** for clean exports:

```typescript
// src/shared/ui/charts/index.tsx
export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  type ChartConfig,
} from './chart';
```

3. **Add chart color variables** to `src/shared/styles/index.css`:

```css
:root {
  /* Existing variables... */
  --chart-1: 12 76% 61%; /* Coral/Red */
  --chart-2: 173 58% 39%; /* Teal */
  --chart-3: 197 37% 24%; /* Dark Blue */
  --chart-4: 43 74% 66%; /* Yellow */
  --chart-5: 27 87% 67%; /* Orange */
}

.dark {
  /* Existing variables... */
  --chart-1: 220 70% 50%; /* Blue */
  --chart-2: 160 60% 45%; /* Green */
  --chart-3: 30 80% 55%; /* Orange */
  --chart-4: 280 65% 60%; /* Purple */
  --chart-5: 340 75% 55%; /* Pink */
}
```

### Chart Types & Examples

#### Line Chart (Trends Over Time)

```typescript
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/shared/ui/charts';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

// Define chart configuration
const chartConfig = {
  value: {
    label: 'Tenant Growth',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

function TenantGrowthChart({ data }: { data: Array<{ date: string; value: number }> }) {
  return (
    <ChartContainer config={chartConfig} className="h-[400px]">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--color-value)"
          strokeWidth={2}
          dot={{ fill: 'var(--color-value)', r: 4 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
```

**Key Points:**

- `ChartContainer` wraps the chart and provides theme context
- `className="h-[400px]"` sets height (no ResponsiveContainer needed)
- `stroke="var(--color-value)"` references the config automatically
- Clean axes: `tickLine={false}`, `axisLine={false}` for modern look

#### Bar Chart (Comparisons)

```typescript
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/shared/ui/charts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const chartConfig = {
  value: {
    label: 'Tenants',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

function InfrastructureChart({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <ChartContainer config={chartConfig} className="h-[300px]">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
```

**Key Points:**

- `radius={[8, 8, 0, 0]}` rounds top corners for modern aesthetic
- `vertical={false}` removes vertical grid lines (cleaner look)
- Colors automatically adapt to light/dark theme

#### Pie Chart (Proportions)

```typescript
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/shared/ui/charts';
import { PieChart, Pie, Cell } from 'recharts';

const chartConfig = {
  Active: { label: 'Active', color: 'hsl(var(--chart-1))' },
  Trial: { label: 'Trial', color: 'hsl(var(--chart-2))' },
  Suspended: { label: 'Suspended', color: 'hsl(var(--chart-3))' },
  Pending: { label: 'Pending', color: 'hsl(var(--chart-4))' },
} satisfies ChartConfig;

function StatusDistributionChart({ data }: { data: Array<{ name: string; value: number; percentage: number }> }) {
  return (
    <ChartContainer config={chartConfig} className="h-[300px]">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={(entry) => `${entry.name} (${entry.percentage.toFixed(1)}%)`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={`var(--color-${entry.name})`} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
```

**Key Points:**

- Each slice references config by name: `var(--color-${entry.name})`
- `hideLabel` in tooltip for cleaner pie chart tooltips
- Custom label shows percentages inline

#### Multi-Line Chart (Multiple Series)

```typescript
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/shared/ui/charts';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

const chartConfig = {
  '1-10': { label: '1-10 users', color: 'hsl(var(--chart-1))' },
  '11-50': { label: '11-50 users', color: 'hsl(var(--chart-2))' },
  '51-200': { label: '51-200 users', color: 'hsl(var(--chart-3))' },
  '200+': { label: '200+ users', color: 'hsl(var(--chart-4))' },
} satisfies ChartConfig;

type UserCountRange = {
  name: string;
  series: Array<{ date: string; value: number }>;
};

function UserTrendsChart({ data }: { data: UserCountRange[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[400px]">
      <LineChart>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} allowDuplicatedCategory={false} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {data.map((range) => (
          <Line
            key={range.name}
            type="monotone"
            dataKey="value"
            data={range.series}
            name={range.name}
            stroke={`var(--color-${range.name})`}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
```

**Key Points:**

- Each Line gets its own `data` prop for separate series
- `allowDuplicatedCategory={false}` required for multiple series with same X-axis
- `ChartLegend` with `ChartLegendContent` for consistent legend styling
- `dot={false}` for cleaner multi-line charts

### Complete Analytics Page Example

**File:** `src/features/analytics/pages/TenantAnalyticsPage.tsx`

```typescript
import type { RootState } from 'app/store';
import { useGetAnalyticsQuery } from 'features/analytics/api/analyticsApi.mock';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/shared/ui/charts';

type TimePeriod = '7days' | '30days' | '90days' | '1year';

const TenantAnalyticsPage = () => {
  const [period, setPeriod] = useState<TimePeriod>('30days');
  const { data, isLoading } = useGetAnalyticsQuery({ period });

  // Chart configurations
  const tenantGrowthConfig = {
    value: {
      label: 'Tenants',
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig;

  const statusConfig = {
    Active: { label: 'Active', color: 'hsl(var(--chart-1))' },
    Trial: { label: 'Trial', color: 'hsl(var(--chart-2))' },
    Suspended: { label: 'Suspended', color: 'hsl(var(--chart-3))' },
    Pending: { label: 'Pending', color: 'hsl(var(--chart-4))' },
  } satisfies ChartConfig;

  if (isLoading || !data) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header with period selector */}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tenant Analytics</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as TimePeriod)}
          className="border rounded-md px-3 py-2"
        >
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
          <option value="1year">Last Year</option>
        </select>
      </header>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tenant Growth Line Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tenant Growth Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={tenantGrowthConfig} className="h-[400px]">
              <LineChart data={data.tenantGrowth.data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-value)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--color-value)', r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={statusConfig} className="h-[300px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={data.statusDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.name} (${entry.percentage.toFixed(1)}%)`}
                >
                  {data.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`var(--color-${entry.name})`} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Infrastructure Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Infrastructure Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={tenantGrowthConfig} className="h-[300px]">
              <BarChart data={data.infrastructureDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TenantAnalyticsPage;
```

### Best Practices

#### 1. Always Use ChartConfig

```typescript
// ✅ GOOD: Type-safe config
const config = {
  value: {
    label: 'Users',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

// ❌ BAD: Hard-coded colors
stroke = '#3b82f6';
```

#### 2. Consistent Height Classes

```typescript
// Small charts
className = 'h-[300px]';

// Large/primary charts
className = 'h-[400px]';

// Responsive height
className = 'h-[300px] md:h-[400px]';
```

#### 3. Clean Axes Styling

```typescript
// Modern, minimal axes
<XAxis
  dataKey="date"
  tickLine={false}      // No tick marks
  axisLine={false}      // No axis line
  tickMargin={8}        // Spacing from chart
/>
```

#### 4. Vertical Grid Lines

```typescript
// Only horizontal grid (cleaner)
<CartesianGrid strokeDasharray="3 3" vertical={false} />
```

#### 5. Rounded Bar Corners

```typescript
// Modern bar styling
<Bar
  dataKey="value"
  fill="var(--color-value)"
  radius={[8, 8, 0, 0]}  // Top corners rounded
/>
```

### Common Patterns

#### Loading State

```typescript
if (isLoading || !data) {
  return (
    <div className="p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-60 bg-muted rounded" />
        <div className="h-[400px] bg-muted rounded" />
      </div>
    </div>
  );
}
```

#### Empty State

```typescript
if (!data || data.length === 0) {
  return (
    <Card>
      <CardContent className="flex items-center justify-center h-[300px]">
        <p className="text-muted-foreground">No data available</p>
      </CardContent>
    </Card>
  );
}
```

#### Card Layout Pattern

```typescript
<Card className="lg:col-span-2"> {/* Span 2 columns on large screens */}
  <CardHeader>
    <CardTitle>Chart Title</CardTitle>
  </CardHeader>
  <CardContent>
    <ChartContainer config={config} className="h-[400px]">
      {/* Chart component */}
    </ChartContainer>
  </CardContent>
</Card>
```

### Migration from Direct Recharts

If you have existing charts using direct Recharts:

**Before:**

```typescript
import { ResponsiveContainer, LineChart, Line, Tooltip, Legend } from 'recharts';

<ResponsiveContainer width="100%" height={400}>
  <LineChart data={data}>
    <Tooltip
      contentStyle={{
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        border: '1px solid #e5e7eb',
      }}
    />
    <Legend />
    <Line dataKey="value" stroke="#3b82f6" />
  </LineChart>
</ResponsiveContainer>
```

**After:**

```typescript
import { LineChart, Line } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/shared/ui/charts';

const config = {
  value: {
    label: 'Value',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

<ChartContainer config={config} className="h-[400px]">
  <LineChart data={data}>
    <ChartTooltip content={<ChartTooltipContent />} />
    <ChartLegend content={<ChartLegendContent />} />
    <Line dataKey="value" stroke="var(--color-value)" strokeWidth={2} />
  </LineChart>
</ChartContainer>
```

---

## Advanced UX Patterns

### Role Search with Minimum Character Requirement

**Problem**: Displaying all roles by default creates performance issues and overwhelms users when dealing with large datasets (100+ roles).

**Solution**: Implement minimum character requirement (5 chars) with incremental pagination (5 items per batch).

#### Why This Pattern?

1. **Performance**: Avoids rendering 100+ checkbox components simultaneously
2. **User Experience**: Encourages intentional searching instead of scrolling through long lists
3. **Scalability**: Handles growing role collections without degradation
4. **Progressive Disclosure**: Shows relevant results as user types

#### Implementation

**State Management:**

```typescript
// Pagination state for each search context
const [roleSearchQuery, setRoleSearchQuery] = useState('');
const [displayedRolesCount, setDisplayedRolesCount] = useState(5);

// For bulk mode (if applicable)
const [bulkRoleSearchQuery, setBulkRoleSearchQuery] = useState('');
const [bulkDisplayedRolesCount, setBulkDisplayedRolesCount] = useState(5);
```

**Filter Function with Minimum Requirement:**

```typescript
/**
 * Filter roles based on search query with minimum character requirement
 * @param searchQuery - User's search input
 * @param pageSize - Number of results to display (for pagination)
 * @returns Filtered and paginated roles array
 */
const getFilteredRoles = (searchQuery: string, pageSize: number): Role[] => {
  // Require minimum 5 characters before showing any results
  if (searchQuery.trim().length < 5) {
    return [];
  }

  const query = searchQuery.toLowerCase();
  const filtered = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(query) || role.description?.toLowerCase().includes(query),
  );

  // Apply pagination - show only up to pageSize
  return filtered.slice(0, pageSize);
};
```

**Check for More Results:**

```typescript
/**
 * Determine if more roles are available beyond current page
 * @param searchQuery - Current search query
 * @param currentCount - Number of currently displayed roles
 * @returns true if more results exist
 */
const hasMoreRoles = (searchQuery: string, currentCount: number): boolean => {
  if (searchQuery.trim().length < 5) return false;

  const query = searchQuery.toLowerCase();
  const totalFiltered = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(query) || role.description?.toLowerCase().includes(query),
  ).length;

  return totalFiltered > currentCount;
};
```

**Load More Handler:**

```typescript
/**
 * Increase the number of displayed roles by 5
 * @param isForBulk - Whether this is for bulk mode (optional)
 */
const loadMoreRoles = (isForBulk: boolean = false) => {
  if (isForBulk) {
    setBulkDisplayedRolesCount((prev) => prev + 5);
  } else {
    setDisplayedRolesCount((prev) => prev + 5);
  }
};
```

**Reset Pagination on Query Change:**

```typescript
/**
 * Update search query and reset pagination
 * This ensures users see the first batch of new results
 */
const handleRoleSearchChange = (value: string) => {
  setRoleSearchQuery(value);
  setDisplayedRolesCount(5); // Reset to initial count
};

const handleBulkRoleSearchChange = (value: string) => {
  setBulkRoleSearchQuery(value);
  setBulkDisplayedRolesCount(5); // Reset to initial count
};
```

**Text Highlighting Helper:**

```typescript
/**
 * Highlight matching text in search results
 * @param text - The text to search within
 * @param query - The search query to highlight
 * @returns React fragment with highlighted matches
 */
const highlightText = (text: string, query: string) => {
  if (!query.trim()) return text;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};
```

#### UI Implementation

**Search Input with Feedback:**

```tsx
<Input
  type="text"
  placeholder={t('users.invite.searchRoles', {
    ns: 'users',
    defaultValue: 'Type at least 5 characters to search roles...',
  })}
  value={roleSearchQuery}
  onChange={(e) => handleRoleSearchChange(e.target.value)}
  className="h-9"
/>;

{
  /* Hint when < 5 characters typed */
}
{
  roleSearchQuery.length > 0 && roleSearchQuery.length < 5 && (
    <p className="text-xs text-muted-foreground">
      {t('users.invite.minSearchChars', {
        ns: 'users',
        defaultValue: 'Type at least 5 characters to see suggestions',
      })}
    </p>
  );
}
```

**Results Display with Pagination:**

```tsx
<div className="border rounded-md overflow-hidden">
  {roleSearchQuery.trim().length >= 5 ? (
    <>
      {getFilteredRoles(roleSearchQuery, displayedRolesCount).length > 0 ? (
        <>
          {/* Results list */}
          <div className="max-h-[200px] overflow-y-auto">
            {getFilteredRoles(roleSearchQuery, displayedRolesCount).map((role) => (
              <div
                key={role.id}
                className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                onClick={() => toggleRole(role.id)}
              >
                <Checkbox
                  id={`role-${role.id}`}
                  checked={selectedRoleIds.includes(role.id)}
                  onCheckedChange={() => toggleRole(role.id)}
                />
                <div className="flex-1">
                  <Label htmlFor={`role-${role.id}`} className="font-medium cursor-pointer">
                    {highlightText(role.name, roleSearchQuery)}
                  </Label>
                  {role.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {highlightText(role.description, roleSearchQuery)}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  {role.type}
                </Badge>
              </div>
            ))}
          </div>

          {/* Load More button */}
          {hasMoreRoles(roleSearchQuery, displayedRolesCount) && (
            <div className="p-2 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => loadMoreRoles(false)}
                className="w-full"
              >
                {t('users.invite.loadMore', {
                  ns: 'users',
                  defaultValue: 'Load More (5)',
                })}
              </Button>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground p-3">
          {t('users.invite.noMatchingRoles', {
            ns: 'users',
            defaultValue: 'No roles match your search',
          })}
        </p>
      )}
    </>
  ) : (
    <p className="text-sm text-muted-foreground p-3">
      {t('users.invite.searchToSeeRoles', {
        ns: 'users',
        defaultValue: 'Search to see available roles',
      })}
    </p>
  )}
</div>
```

#### UI States

| State          | Condition                          | Display                                         |
| -------------- | ---------------------------------- | ----------------------------------------------- |
| **Empty**      | `query.length === 0`               | "Search to see available roles"                 |
| **Hint**       | `0 < query.length < 5`             | "Type at least 5 characters to see suggestions" |
| **Results**    | `query.length >= 5 && hasResults`  | Filtered roles with "Load More" button          |
| **No Results** | `query.length >= 5 && !hasResults` | "No roles match your search"                    |

#### Benefits

1. **Performance**: Only renders visible items (initial 5, then +5 per load)
2. **UX**: Clear feedback at every stage guides user behavior
3. **Scalability**: Handles 100+ roles without lag
4. **Discoverability**: Progressive disclosure doesn't overwhelm users
5. **Search Hygiene**: Forces intentional searches vs mindless scrolling

#### Real-World Example

See complete implementation in `src/features/user-mgmt/components/InviteUserDialog.tsx`:

- Single invitation mode (lines ~360-480)
- Bulk invitation mode (lines ~620-750)
- Both modes use identical pattern with separate state

#### Testing Considerations

```typescript
// Test: Minimum character requirement
expect(getFilteredRoles('abc', 5)).toEqual([]); // < 5 chars
expect(getFilteredRoles('admin', 5).length).toBeGreaterThan(0); // >= 5 chars

// Test: Pagination
const results = getFilteredRoles('admin', 5);
expect(results.length).toBeLessThanOrEqual(5);

// Test: Has more results
expect(hasMoreRoles('admin', 5)).toBe(true); // Assuming > 5 results
expect(hasMoreRoles('admin', 100)).toBe(false); // All results shown

// Test: Reset on query change
handleRoleSearchChange('test');
expect(displayedRolesCount).toBe(5); // Reset to initial
```

---

## Complete Page Example

value: { label: 'Value', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig;

<ChartContainer config={config} className="h-[400px]">
  <LineChart data={data}>
    <ChartTooltip content={<ChartTooltipContent />} />
    <ChartLegend content={<ChartLegendContent />} />
    <Line dataKey="value" stroke="var(--color-value)" />
  </LineChart>
</ChartContainer>
```

**Benefits:**

- ✅ No manual theme handling
- ✅ Cleaner code (less boilerplate)
- ✅ Automatic responsive sizing
- ✅ Consistent tooltip/legend styling
- ✅ Type-safe configuration

### Troubleshooting

#### Chart Colors Not Working

```typescript
// Problem: Colors not showing
<Line dataKey="value" stroke="hsl(var(--chart-1))" />

// Solution: Use var(--color-{key}) to reference config
<Line dataKey="value" stroke="var(--color-value)" />
```

#### Chart Not Responsive

```typescript
// Problem: Fixed width
<ChartContainer config={config} style={{ width: '600px' }}>

// Solution: Use className with height only
<ChartContainer config={config} className="h-[400px]">
```

#### Multiple Series Not Working

```typescript
// Problem: Duplicate categories error
<XAxis dataKey="date" />

// Solution: Add allowDuplicatedCategory
<XAxis dataKey="date" allowDuplicatedCategory={false} />
```

### Reference Implementation

**Complete working example:** `src/features/analytics/pages/TenantAnalyticsPage.tsx`

This page demonstrates:

- ✅ 6 different chart types
- ✅ Proper ChartConfig usage
- ✅ Theme integration
- ✅ Responsive layouts
- ✅ Loading states
- ✅ Period selection
- ✅ Multi-series charts

---

## Summary

This guide covers all essential patterns for implementing UI components in the SuperPersova Web application:

✅ **ShadCN Components** - Installation and customization  
✅ **ShadCN Charts** - Data visualization with theme integration  
✅ **Responsive Design** - Mobile-first patterns with 768px breakpoint  
✅ **Pagination** - Desktop pagination + mobile infinite scroll  
✅ **Icon System** - Centralized icons for consistency  
✅ **Theming** - Light/dark mode with CSS variables  
✅ **i18n** - Multi-language support with i18next  
✅ **Confirm Dialogs** - Consistent confirmation patterns  
✅ **Complete Example** - Full page implementation

**Reference Implementation:** `src/features/tenant/pages/TenantsPage.tsx`

**Next Steps:**

1. Review the complete page example
2. Check pagination guide for advanced patterns
3. Explore tenant pages for real-world examples
4. Follow icon system for consistency
5. Use confirm dialog pattern for all destructive actions
