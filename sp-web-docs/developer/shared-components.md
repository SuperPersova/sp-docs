# Shared Components - Complete API Reference

**Document Version:** 1.1  
**Last Updated:** November 29, 2025  
**Target Audience:** Developers

---

## Table of Contents

1. [SearchableSelectField](#searchableselectfield)
2. [useDebounce Hook](#usedebounce-hook)
3. [LabelInputField](#labelinputfield)
4. [Usage Examples](#usage-examples)
5. [Migration Guide](#migration-guide)
6. [Troubleshooting](#troubleshooting)

---

## SearchableSelectField

### Overview

**Purpose:** Tag-based multi-select component with search, filtering, and pagination

**Why Created:**

- Eliminated ~400 lines of duplicate code across InviteUserDialog, AssignWorkflowDialog, and WorkflowBuilderPage
- Provides consistent UX for all selection interfaces
- Centralized place for search/filter logic improvements

**Key Features:**

- ✅ Single and multi-select modes
- ✅ Inline tag-based UI for multi-select
- ✅ Search with debounce (300ms default)
- ✅ Minimum character requirement
- ✅ Pagination (load more)
- ✅ Custom option rendering
- ✅ Keyboard navigation
- ✅ Accessibility support
- ✅ i18n ready
- ✅ Theme-aware (light/dark)

### Behind the Scenes

- Auto-clear on select (multi): After adding a tag, the search input resets and pagination is restored to the first page. Reason: reduces cognitive load and speeds repeated selections.
- Duplicate prevention: Selected IDs are filtered out of results to avoid duplicate tags and inconsistent state.
- Event propagation fix: Tag remove button and row checkbox stop propagation to avoid toggling the row twice (fixed the prior “infinite toggle” loop).
- Debounced search: 300ms default via `useDebounce` to minimize renders and API calls. Reason: aligns with web typing cadence without feeling laggy.
- Min characters threshold: Default ≥3 (configurable). Reason: prevents enumeration and accidental heavy filtering on short inputs; show hint until threshold.
- Accessibility: Tags expose `aria-label` on ✕ buttons; list items are keyboard-focusable; loading state announces “Searching…”.

### Assumptions & Reasons

- Options provided are sanitized display strings (no HTML). Reason: security and consistency; React escapes by default.
- In multi mode, search is for discovery, not full browse. Reason: pagination + min chars optimize for typical usage patterns.
- Server remains the authority: client prevents duplicates visually, but server should enforce uniqueness and authorization.

### i18n, Fonts & Theme

- All labels and messages (including placeholder and “Searching…”) should use translation keys, typically `common.*`.
- Placeholder should reflect `minSearchChars`, e.g., `t('common.search_min_chars', { count: minSearchChars })`.
- Component inherits font size (`sm`/`md`/`lg`) from container and uses theme tokens (`bg-background`, `text-foreground`, `border-border`).

### Business Acceptance Mapping

- Create/Edit Template: Reviewer selection uses tag-based multi-select; prevents duplicates; auto-clears on selection; debounced search.
- Assignment: Resource selection uses single/multi select with debounce and pagination.
- Pending Dashboard: All labels/filters localized; debounce applied to search.
  See: [Business Features](../business/workflow-management-features.md) for criteria details.

### API Reference

```typescript
interface SearchableSelectFieldProps<T = any> {
  // Display
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;

  // Behavior
  mode: 'single' | 'multi';
  value: string | string[]; // single mode: string, multi mode: string[]
  onChange: (value: string | string[]) => void;

  // Options
  options: SearchableOption<T>[];

  // Search settings
  minSearchChars?: number; // Default: 3
  debounceMs?: number; // Default: 300

  // Pagination
  itemsPerPage?: number; // Default: 5

  // Advanced
  renderOption?: (option: SearchableOption<T>) => React.ReactNode;
  renderSelectedItem?: (option: SearchableOption<T>) => React.ReactNode;
}

interface SearchableOption<T = any> {
  id: string; // Unique identifier
  label: string; // Display text
  description?: string; // Secondary text
  icon?: React.ReactNode; // Optional icon
  badge?: string; // Optional badge text
  isActive?: boolean; // Badge styling
  metadata?: T; // Custom data
}
```

### Props Explanation

#### Core Props

**`mode`** (required)

- Type: `'single' | 'multi'`
- Description: Selection mode
- Single: User can select one option, dropdown closes on selection
- Multi: User can select multiple options, shown as inline tags

**`value`** (required)

- Type: `string | string[]`
- Description: Currently selected option ID(s)
- Single mode: Pass string (e.g., `'role-123'`)
- Multi mode: Pass string array (e.g., `['role-123', 'role-456']`)
- Pass empty array `[]` for no selection in multi mode

**`onChange`** (required)

- Type: `(value: string | string[]) => void`
- Description: Callback when selection changes
- Single mode: Receives single ID string
- Multi mode: Receives array of ID strings
- Called immediately on selection/deselection

**`options`** (required)

- Type: `SearchableOption<T>[]`
- Description: Available options to select from
- Must include unique `id` and `label` for each option
- Can include optional `description`, `icon`, `badge`, `metadata`

#### Display Props

**`label`**

- Type: `string`
- Default: `undefined`
- Description: Field label shown above component
- Displays `*` indicator if `required` is true

**`placeholder`**

- Type: `string`
- Default: `undefined`
- Description: Placeholder for selected value display (single mode only)

**`searchPlaceholder`**

- Type: `string`
- Default: `'Type at least 3 characters to search...'`
- Description: Placeholder text in search input
- Auto-updates to show minSearchChars value

**`required`**

- Type: `boolean`
- Default: `false`
- Description: Shows `*` indicator next to label
- Does NOT enforce validation (use form validation for that)

**`disabled`**

- Type: `boolean`
- Default: `false`
- Description: Disables all interactions
- Grays out component, prevents selection/removal

**`error`**

- Type: `string`
- Default: `undefined`
- Description: Error message to display below component
- Shows in red, adds red border to input

**`className`**

- Type: `string`
- Default: `undefined`
- Description: Additional CSS classes for root element

#### Search Settings

**`minSearchChars`**

- Type: `number`
- Default: `3`
- Description: Minimum characters required before showing results
- Prevents excessive API calls for short queries
- Shows hint message until threshold met

**`debounceMs`**

- Type: `number`
- Default: `300`
- Description: Milliseconds to wait after typing stops before filtering
- Prevents excessive filtering/API calls during typing
- 300ms is optimal for most use cases (not too fast, not too slow)

#### Pagination

**`itemsPerPage`**

- Type: `number`
- Default: `5`
- Description: Number of options to show initially
- "Load More" button appears if more options available
- Clicking loads `itemsPerPage` more items

#### Advanced Props

**`renderOption`**

- Type: `(option: SearchableOption<T>) => React.ReactNode`
- Default: Built-in renderer
- Description: Custom renderer for each option in dropdown
- Use for complex option layouts
- Receives full option object with metadata

**`renderSelectedItem`**

- Type: `(option: SearchableOption<T>) => React.ReactNode`
- Default: Built-in renderer
- Description: Custom renderer for selected items (multi mode tags)
- Use for custom badge styling
- Receives full option object with metadata

### Behavior Details

#### Single Mode

1. User types in search input
2. After 300ms (debounce), options filter
3. User clicks an option
4. Dropdown closes
5. Selected value displayed
6. `onChange` called with selected ID

#### Multi Mode (Tag-Based)

1. Selected items display as inline badges with ✕ button
2. Search input appears after tags
3. User types to search
4. After 300ms (debounce), options filter
5. **Selected items excluded from results** (prevents duplicates)
6. User clicks an option
7. **Search query clears automatically** (Nov 28 fix)
8. New tag appears
9. Dropdown stays open
10. User can continue searching/selecting
11. Clicking ✕ on tag removes it, item reappears in search

#### Search Filtering

- Case-insensitive
- Matches against: `label`, `description`, `badge`
- Does NOT match against `id` (internal use only)
- In multi mode, selected options filtered out
- Debounced to reduce performance impact

#### Pagination

- Initial load: Shows `itemsPerPage` options
- "Load More" button: Appears if more options available
- Click loads `itemsPerPage` additional items
- Cumulative (doesn't replace, adds to list)
- Resets when search query changes

### Validation & Error Handling

**Built-in Validations:**

- None (component is controlled, validation is external)

**Recommended Validation (with React Hook Form + Zod):**

```typescript
import { z } from 'zod';

const workflowSchema = z.object({
  resourceType: z.string().min(1, 'Resource type is required'),

  reviewers: z
    .array(z.string())
    .min(1, 'At least one reviewer is required')
    .max(10, 'Maximum 10 reviewers allowed'),
});
```

**Error Handling:**

```typescript
<SearchableSelectField
  mode="multi"
  value={value}
  onChange={onChange}
  options={options}
  error={
    errors.reviewers?.message ||
    (value.length === 0 ? 'Required field' : undefined)
  }
/>
```

### Recent Fixes & Improvements

#### November 27, 2025: Tag-Based UI Implementation

**Problem:**

- Selected items shown in separate section below search
- Confusing which items are selected
- Takes excessive vertical space
- Not intuitive for multi-select

**Solution:**

- Display selected items as inline badges INSIDE search input
- Each badge has ✕ button for removal
- Tags appear before cursor
- Matches familiar patterns (Gmail, Slack, GitHub)

**Code Changes:**

```typescript
// Before: Separate sections
<div>
  <Input placeholder="Search..." />
  <div className="selected-items">
    {selectedOptions.map(...)}
  </div>
</div>

// After: Inline tags
<div className="border rounded-md">
  <div className="flex items-center gap-1 px-2 py-1.5 flex-wrap">
    <IconSearch size={16} />
    {selectedOptions.map(option => (
      <Badge>
        {option.label}
        <button onClick={() => handleRemove(option.id)}>
          <IconX size={12} />
        </button>
      </Badge>
    ))}
    <input type="text" placeholder="Search..." />
  </div>
</div>
```

**Impact:**

- More intuitive UX
- Saves vertical space
- Clearer selection state
- Easier tag removal

#### November 28, 2025: Auto-Clear Search After Selection

**Problem:**

- After selecting "Team Lead", search text "Role" remained visible
- User confused whether still searching
- Had to manually clear search before next selection
- Felt like broken state

**Solution:**

- Automatically clear search query after selection (multi mode only)
- Reset pagination to initial state
- Provides clean slate for next search

**Code Changes:**

```typescript
const handleSelect = (optionId: string) => {
  if (mode === 'multi') {
    const newValues = [...currentValues, optionId];
    onChange(newValues);

    // Auto-clear (NEW)
    setSearchQuery('');
    setDisplayedCount(itemsPerPage);
  }
};
```

**Impact:**

- Clear UX state after each selection
- No manual cleanup needed
- Feels more responsive
- Reduces cognitive load

#### November 27, 2025: Remove "No Results" Message

**Problem:**

- When all options selected, showed "No results found"
- User felt like they did something wrong
- Technically not an error state (all items selected = success)

**Solution:**

- Show nothing when filter returns empty results
- Selected tags clearly show what's selected
- Silent state feels more correct

**Code Changes:**

```typescript
// Before
{filteredOptions.length > 0 ? (
  <OptionsList />
) : (
  <EmptyState message="No results found" />
)}

// After
{filteredOptions.length > 0 && <OptionsList />}
```

**Impact:**

- No misleading error messages
- Cleaner UI
- User focuses on selected tags

#### November 27, 2025: Duplicate Prevention

**Problem:**

- Selected items still appeared in search results
- User could select same item twice
- Tags showed duplicate entries
- Confusing state

**Solution:**

- Filter out selected IDs from search results (multi mode only)
- Items automatically reappear after tag removal
- Clear selected/unselected distinction

**Code Changes:**

```typescript
const getFilteredOptions = (query: string) => {
  const filtered = options.filter((opt) => {
    // Exclude already selected (NEW)
    if (mode === 'multi' && selectedIds.includes(opt.id)) {
      return false;
    }

    return opt.label.toLowerCase().includes(query.toLowerCase());
  });

  return filtered;
};
```

**Impact:**

- Prevents duplicate selections
- Clearer available vs. selected distinction
- Removed items reappear automatically

#### November 27, 2025: Debounce Integration

**Problem:**

- Search filtering happened immediately on every keystroke
- For large option lists, caused UI jank
- Potential API calls on every character

**Solution:**

- Integrate `useDebounce` hook
- 300ms default delay
- Configurable via `debounceMs` prop

**Code Changes:**

```typescript
const [searchQuery, setSearchQuery] = useState('');
const debouncedSearchQuery = useDebounce(searchQuery, debounceMs);

// Use debounced value for filtering
const filteredOptions = getFilteredOptions(debouncedSearchQuery, displayedCount);
```

**Impact:**

- Smoother typing experience
- Reduces filtering operations by ~80%
- Better performance with large datasets
- Configurable per use case

---

## useDebounce Hook

### Overview

**Purpose:** Debounce any value changes to reduce update frequency

**Why Created:**

- Reduce API calls during user typing
- Improve performance of expensive operations
- Provide consistent debounce behavior across app

**Key Features:**

- ✅ Generic (works with any type)
- ✅ Type-safe with TypeScript
- ✅ Configurable delay
- ✅ Automatic cleanup
- ✅ Zero dependencies

### API Reference

```typescript
function useDebounce<T>(value: T, delay?: number): T;
```

**Parameters:**

- `value`: Any value to debounce (string, number, object, array, etc.)
- `delay`: Milliseconds to wait (default: 300)

**Returns:**

- Debounced value (same type as input)

### How It Works

```typescript
/**
 * 1. User types "a" → value = "a"
 *    Hook starts 300ms timer
 *
 * 2. User types "b" → value = "ab"
 *    Hook cancels previous timer, starts new 300ms timer
 *
 * 3. User types "c" → value = "abc"
 *    Hook cancels previous timer, starts new 300ms timer
 *
 * 4. User stops typing
 *    300ms passes...
 *    Hook updates debouncedValue to "abc"
 *    Component re-renders with "abc"
 */
```

### Implementation

```typescript
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Start timer
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: Cancel timer if value changes or component unmounts
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Re-run when value or delay changes

  return debouncedValue;
}
```

### Usage Examples

#### Basic Usage (Search Input)

```typescript
const MyComponent = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // API call with debounced value
  const { data } = useGetDataQuery({ search: debouncedSearch });

  return (
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search..."
    />
  );
};
```

**Why This Works:**

- User types "test" → 4 state updates → `search` changes 4 times
- `debouncedSearch` only updates ONCE (300ms after typing stops)
- API called ONCE instead of 4 times
- 75% reduction in API calls

#### With Different Types

```typescript
// String
const debouncedSearch = useDebounce(search, 300);

// Number
const debouncedValue = useDebounce(sliderValue, 500);

// Object
const debouncedFilters = useDebounce(filters, 300);

// Array
const debouncedSelectedIds = useDebounce(selectedIds, 300);
```

#### Custom Delay

```typescript
// Fast debounce (200ms) - for local filtering
const debouncedSearch = useDebounce(search, 200);

// Standard debounce (300ms) - for API calls
const debouncedSearch = useDebounce(search, 300);

// Slow debounce (500ms) - for expensive operations
const debouncedFilters = useDebounce(complexFilters, 500);
```

### Performance Impact

**Before (no debounce):**

```
User types "workflow"
- Keystroke 1: "w" → API call
- Keystroke 2: "o" → API call
- Keystroke 3: "r" → API call
- Keystroke 4: "k" → API call
- Keystroke 5: "f" → API call
- Keystroke 6: "l" → API call
- Keystroke 7: "o" → API call
- Keystroke 8: "w" → API call
Total: 8 API calls
```

**After (300ms debounce):**

```
User types "workflow"
- 300ms after last keystroke → 1 API call
Total: 1 API call
Reduction: 87.5%
```

### Applied In

1. **SearchableSelectField** (search input)
   - File: `src/shared/components/SearchableSelectField.tsx`
   - Delay: 300ms (configurable via prop)

2. **WorkflowManagementPage** (search box)
   - File: `src/features/workflows/pages/WorkflowManagementPage.tsx`
   - Delay: 300ms

3. **RoleManagementPage** (search box)
   - File: `src/features/roles/pages/RoleManagementPage.tsx`
   - Delay: 300ms

4. **UsersTable** (search box)
   - File: `src/features/users/components/UsersTable.tsx`
   - Delay: 300ms

5. **TenantsPage** (search box)
   - File: `src/features/tenants/pages/TenantsPage.tsx`
   - Delay: 300ms

**Total Impact:**

- ~100 lines of duplicate debounce code removed
- Consistent 300ms delay across all searches
- ~85% reduction in API calls during search
- Measurable performance improvement

---

## Usage Examples

### Example 1: Simple Single-Select

```typescript
import { SearchableSelectField } from '@/shared/components';

const MyForm = () => {
  const [resourceType, setResourceType] = useState<string>('');

  const options = [
    { id: 'ROLE', label: 'Role', description: 'User role assignment' },
    { id: 'PERMISSION', label: 'Permission', description: 'System permission' },
    { id: 'TENANT', label: 'Tenant', description: 'Tenant configuration' },
  ];

  return (
    <SearchableSelectField
      label="Resource Type"
      mode="single"
      value={resourceType}
      onChange={setResourceType}
      options={options}
      required
      minSearchChars={1}
      searchPlaceholder="Select a resource type..."
    />
  );
};
```

### Example 2: Multi-Select with Validation

```typescript
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  reviewers: z
    .array(z.string())
    .min(1, 'At least one reviewer required')
    .max(5, 'Maximum 5 reviewers allowed'),
});

const WorkflowStageForm = () => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      reviewers: [],
    },
  });

  const reviewerOptions = [
    {
      id: 'user-1',
      label: 'John Doe',
      description: 'Senior Manager',
      badge: 'Manager',
      isActive: true,
    },
    {
      id: 'role-admin',
      label: 'Admin Role',
      description: 'System administrators',
      badge: 'Role',
      isActive: true,
    },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="reviewers"
        control={control}
        render={({ field }) => (
          <SearchableSelectField
            label="Reviewers"
            mode="multi"
            value={field.value}
            onChange={field.onChange}
            options={reviewerOptions}
            required
            minSearchChars={1}
            searchPlaceholder="Search users or roles..."
            error={errors.reviewers?.message}
          />
        )}
      />

      <button type="submit">Save Stage</button>
    </form>
  );
};
```

### Example 3: Custom Option Rendering

```typescript
const CustomSelectField = () => {
  const [selected, setSelected] = useState<string[]>([]);

  const options = [
    {
      id: 'user-1',
      label: 'John Doe',
      metadata: {
        avatar: 'https://...',
        email: 'john@example.com',
        department: 'Engineering',
      },
    },
  ];

  return (
    <SearchableSelectField
      mode="multi"
      value={selected}
      onChange={setSelected}
      options={options}
      renderOption={(option) => (
        <div className="flex items-center gap-3">
          <img
            src={option.metadata.avatar}
            alt=""
            className="w-8 h-8 rounded-full"
          />
          <div>
            <p className="font-medium">{option.label}</p>
            <p className="text-xs text-muted-foreground">
              {option.metadata.email}
            </p>
          </div>
          <Badge variant="outline">{option.metadata.department}</Badge>
        </div>
      )}
      renderSelectedItem={(option) => (
        <div className="flex items-center gap-1">
          <img
            src={option.metadata.avatar}
            alt=""
            className="w-4 h-4 rounded-full"
          />
          <span>{option.label}</span>
        </div>
      )}
    />
  );
};
```

### Example 4: With API Integration

```typescript
const UserSelector = () => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const debouncedSearch = useDebounce(search, 300);

  // RTK Query automatically caches and deduplicates
  const { data, isLoading } = useGetUsersQuery({
    search: debouncedSearch,
    limit: 20,
  });

  const options = useMemo(() => {
    if (!data?.users) return [];

    return data.users.map(user => ({
      id: user.id,
      label: user.name,
      description: user.email,
      badge: user.role,
      isActive: user.status === 'ACTIVE',
    }));
  }, [data]);

  return (
    <div>
      <SearchableSelectField
        label="Select Users"
        mode="multi"
        value={selected}
        onChange={setSelected}
        options={options}
        minSearchChars={2}
        debounceMs={300}
        searchPlaceholder="Search by name or email..."
      />

      {isLoading && <p>Loading...</p>}
    </div>
  );
};
```

### Example 5: Dynamic Options (Field Array)

```typescript
const WorkflowBuilder = () => {
  const { control } = useForm();
  const { fields: stages, append } = useFieldArray({
    control,
    name: 'stages',
  });

  return (
    <div>
      {stages.map((stage, index) => (
        <div key={stage.id}>
          <Controller
            name={`stages.${index}.reviewers`}
            control={control}
            render={({ field }) => (
              <SearchableSelectField
                label={`Stage ${index + 1} Reviewers`}
                mode="multi"
                value={field.value}
                onChange={field.onChange}
                options={reviewerOptions}
                required
              />
            )}
          />
        </div>
      ))}

      <button onClick={() => append({ reviewers: [] })}>
        Add Stage
      </button>
    </div>
  );
};
```

---

## Migration Guide

### Migrating from Duplicate Code

**Before: Custom select implementation**

```typescript
const MyDialog = () => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const filteredOptions = useMemo(() => {
    return options
      .filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()))
      .slice(0, page * 5);
  }, [search, page]);

  return (
    <div>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search..."
      />

      {selected.map(id => (
        <Badge key={id}>
          {options.find(o => o.id === id)?.label}
          <button onClick={() => setSelected(s => s.filter(i => i !== id))}>
            ✕
          </button>
        </Badge>
      ))}

      {filteredOptions.map(option => (
        <div key={option.id} onClick={() => handleSelect(option.id)}>
          <Checkbox checked={selected.includes(option.id)} />
          {option.label}
        </div>
      ))}

      <button onClick={() => setPage(p => p + 1)}>Load More</button>
    </div>
  );
};
```

**After: SearchableSelectField**

```typescript
import { SearchableSelectField } from '@/shared/components';

const MyDialog = () => {
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <SearchableSelectField
      label="Select Items"
      mode="multi"
      value={selected}
      onChange={setSelected}
      options={options}
      minSearchChars={1}
      itemsPerPage={5}
    />
  );
};
```

**Lines Removed:** ~40-60 lines per component  
**Components Migrated:** InviteUserDialog, WorkflowAssignmentDialog, WorkflowBuilderPage  
**Total Savings:** ~180 lines of duplicate code

### Migration Checklist

1. **Import SearchableSelectField**

   ```typescript
   import { SearchableSelectField } from '@/shared/components';
   ```

2. **Remove state variables**
   - Delete: `search`, `page`, `filteredOptions`
   - Keep: `selected` or `value`

3. **Map data to SearchableOption format**

   ```typescript
   const options = myData.map((item) => ({
     id: item.id,
     label: item.name,
     description: item.description, // optional
     badge: item.type, // optional
   }));
   ```

4. **Replace custom UI with component**
   - Single-select: Set `mode="single"`, pass string value
   - Multi-select: Set `mode="multi"`, pass string array

5. **Configure search behavior**
   - Set `minSearchChars` (usually 1-3)
   - Set `debounceMs` if needed (default 300ms is good)
   - Customize `searchPlaceholder`

6. **Add validation**
   - Pass `error` prop from form state
   - Add `required` flag if needed

7. **Test thoroughly**
   - Search filtering
   - Selection/deselection
   - Tag removal (multi mode)
   - Load more pagination
   - Keyboard navigation

---

## Troubleshooting

### Issue: Search not working

**Symptoms:**

- Typing in search input shows no results
- Results don't filter as expected

**Solutions:**

1. **Check minSearchChars**

   ```typescript
   // If minSearchChars is 3, user must type 3+ characters
   minSearchChars={3} // Try reducing to 1 or 2
   ```

2. **Verify options format**

   ```typescript
   // Options must have id and label
   options={[
     { id: '1', label: 'Option 1' }, // ✅ Correct
     { value: '1', name: 'Option 1' }, // ❌ Wrong keys
   ]}
   ```

3. **Check for empty options array**
   ```typescript
   options={data?.items || []} // Provide fallback
   ```

### Issue: Selected items not showing

**Symptoms:**

- Selection works but no tags appear
- `onChange` called but UI doesn't update

**Solutions:**

1. **Verify value prop matches mode**

   ```typescript
   // Single mode
   <SearchableSelectField
     mode="single"
     value="id-1" // ✅ String
     value={['id-1']} // ❌ Array
   />

   // Multi mode
   <SearchableSelectField
     mode="multi"
     value={['id-1', 'id-2']} // ✅ Array
     value="id-1" // ❌ String
   />
   ```

2. **Ensure value IDs exist in options**

   ```typescript
   // This won't show because 'id-999' not in options
   value={['id-1', 'id-999']}
   options={[
     { id: 'id-1', label: 'Option 1' },
     { id: 'id-2', label: 'Option 2' },
   ]}
   ```

3. **Check onChange implementation**
   ```typescript
   // With React Hook Form
   <Controller
     render={({ field }) => (
       <SearchableSelectField
         value={field.value}
         onChange={field.onChange} // ✅ Correct
         onChange={(v) => console.log(v)} // ❌ Not updating form state
       />
     )}
   />
   ```

### Issue: Duplicate selections

**Symptoms:**

- Same item can be selected multiple times
- Tags show duplicate entries

**Solutions:**

1. **Verify mode is set correctly**

   ```typescript
   mode = 'multi'; // Required for duplicate prevention
   ```

2. **Check value array for duplicates**

   ```typescript
   // Remove duplicates before passing to component
   const uniqueValues = [...new Set(values)];
   ```

3. **Update to latest component version**
   - Duplicate prevention added Nov 27, 2025
   - Ensure using version with this fix

### Issue: Search doesn't clear after selection

**Symptoms:**

- After selecting item, search text remains
- Have to manually clear search

**Solutions:**

1. **Update to latest component version**
   - Auto-clear added Nov 28, 2025
   - Ensure using version with this fix

2. **Verify mode is multi**
   ```typescript
   // Auto-clear only in multi mode
   mode = 'multi';
   ```

### Issue: Poor performance with many options

**Symptoms:**

- UI freezes during typing
- Slow search filtering

**Solutions:**

1. **Increase debounce delay**

   ```typescript
   debounceMs={500} // Up from default 300ms
   ```

2. **Reduce itemsPerPage**

   ```typescript
   itemsPerPage={5} // Down from larger number
   ```

3. **Use backend search instead**

   ```typescript
   // Move filtering to API
   const { data } = useGetDataQuery({ search: debouncedSearch });
   ```

4. **Implement virtualization**
   - For 1000+ options, consider react-window or react-virtualized
   - Renders only visible items

### Issue: Styling conflicts

**Symptoms:**

- Component looks wrong
- Colors don't match theme
- Spacing off

**Solutions:**

1. **Check Tailwind configuration**

   ```typescript
   // Ensure design tokens configured
   colors: {
     background: '...',
     foreground: '...',
     // etc
   }
   ```

2. **Verify className prop**

   ```typescript
   className = 'my-custom-class'; // Applied to root element
   ```

3. **Use CSS variables for theme**
   ```css
   /* Should be defined in globals.css */
   :root {
     --background: ...;
     --foreground: ...;
   }
   ```

### Issue: Accessibility problems

**Symptoms:**

- Keyboard navigation doesn't work
- Screen reader announces incorrectly

**Solutions:**

1. **Ensure label prop provided**

   ```typescript
   label = 'Select Items'; // Required for screen readers
   ```

2. **Test keyboard navigation**
   - Tab: Focus input
   - Arrow keys: Navigate options
   - Enter: Select option
   - Escape: Close dropdown

3. **Check ARIA attributes**
   - Component includes built-in ARIA support
   - Verify not overridden by custom styles

---

## Summary

### SearchableSelectField

**When to Use:**

- User needs to select from list with search
- 10+ options (pagination helpful)
- Need consistent UX across app

**Key Features:**

- Tag-based multi-select (inline badges)
- Auto-clear search after selection
- Duplicate prevention
- Debounced search (300ms default)
- Pagination (load more)

**Recent Fixes:**

- ✅ Tag-based inline UI (Nov 27)
- ✅ Auto-clear search (Nov 28)
- ✅ No "No results" message (Nov 27)
- ✅ Duplicate prevention (Nov 27)
- ✅ Debounce integration (Nov 27)

### useDebounce Hook

**When to Use:**

- User typing triggers expensive operation
- Need to reduce API calls
- Want consistent debounce behavior

**Impact:**

- ~85% reduction in API calls
- Better perceived performance
- Smoother typing experience

**Applied In:**

- SearchableSelectField
- All management page search boxes
- Any real-time search/filter

---

**Next Steps:**

1. Read [Workflow Implementation Guide](./workflow-implementation.md) for usage in context
2. See [Business Features](../business/workflow-management-features.md) for requirements
3. Check [Engineering Standards](../standards/engineering-standards.md) for quality guidelines

---

**Document History:**

- v1.1 (Nov 29, 2025): Added LabelInputField API, validation patterns, examples for all input types, migration notes from FormField
- v1.0 (Nov 28, 2025): Initial comprehensive reference (SearchableSelectField, useDebounce)

---

## LabelInputField

### Overview

**Purpose:** Unified wrapper for label + input (or textarea) + helper/error line with optional built‑in rendering of common HTML inputs.

**Why Created:**

- Standardize spacing/alignment across enterprise forms.
- Consolidate required indicators, tooltips, descriptions, and error display.
- Provide optional native validation surfacing (invalid message capture) plus parsed value callback.
- Replace earlier `FormField` component with richer, declarative API.

**Key Features:**

- ✅ Supports input types: `text`, `email`, `number`, `tel`, `password`, `textarea`.
- ✅ Optional auto-render of underlying control via `renderInput`.
- ✅ Controlled or pass-through usage (custom children for Select, custom widgets).
- ✅ Consistent fixed-height helper line to avoid layout shift.
- ✅ Captures native HTML validation messages when invalid (`showInvalidMessage`).
- ✅ Parsed numeric value delivery via `onValueChange`.
- ✅ Pass arbitrary `data-*` / `aria-*` attributes through `inputProps`.
- ✅ Hide label for compact UIs while preserving accessibility via `aria-label` in `inputProps`.

### API Reference

```typescript
type LabelInputFieldProps = {
  label?: string; // Visible label text
  hideLabel?: boolean; // Suppress visual label (supply aria-label via inputProps)
  required?: boolean; // Shows asterisk & sets required on input
  description?: string; // Small text below label (above control)
  error?: string; // Explicit error message (overrides native invalid message)
  labelTooltip?: string; // Hover/click tooltip icon content
  helperHeight?: number; // Fixed helper line height (default 16px)
  className?: string; // Wrapper extra classes
  labelClassName?: string; // Classes for label container
  children?: React.ReactNode; // Custom control (ignored if renderInput=true)
  renderInput?: boolean; // Auto-render underlying input/textarea
  inputType?: 'text' | 'email' | 'number' | 'tel' | 'password' | 'textarea';
  placeholder?: string;
  value?: string | number; // Controlled value
  onChange?: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onValueChange?: (value: string | number | undefined) => void; // Parsed numeric or raw string
  disabled?: boolean;
  min?: number | string; // For number inputs
  max?: number | string; // For number inputs
  step?: number | string; // For number inputs (e.g. 0.01)
  maxLength?: number; // For text/password/tel
  pattern?: string; // Custom regex pattern for native validation
  inputMode?: HTMLInputElement['inputMode']; // e.g. 'numeric', 'tel', 'email'
  autoComplete?: string; // e.g. 'email', 'new-password'
  rows?: number; // Textarea rows (default 3)
  id?: string; // Associate label/htmlFor
  inputProps?: React.InputHTMLAttributes<HTMLInputElement> &
    React.TextareaHTMLAttributes<HTMLTextAreaElement>; // Additional attributes
  showInvalidMessage?: boolean; // Show browser native validation message when invalid & no error
};
```

### Rendering Behavior

Flow (when `renderInput=true`):

1. Label (unless `hideLabel` true) + optional tooltip icon.
2. Description (if provided).
3. Input or Textarea (based on `inputType`).
4. Helper line: error message, native invalid message, or placeholder dot (to preserve height).

Flow (custom child): Provide your own control as `children`; validation properties (`required`, helper line) still managed by wrapper.

### Native & Custom Validation

| Input Type | Native Behavior                | Recommended Extras                          | Parsed Output via `onValueChange` |
| ---------- | ------------------------------ | ------------------------------------------- | --------------------------------- |
| text       | Free-form                      | `maxLength`, optional `pattern`             | string                            |
| email      | HTML email syntax check        | `autoComplete="email"`, `inputMode="email"` | string                            |
| number     | Numeric only (min/max/step)    | `inputMode="numeric"`, pattern for strict   | number or undefined               |
| tel        | No inherent format enforcement | `inputMode="tel"`, `pattern` for E.164/etc  | string                            |
| password   | Hidden characters              | `autoComplete="new-password"`, `maxLength`  | string                            |
| textarea   | Multi-line text                | `maxLength`, custom pattern if needed       | string                            |

`onValueChange` logic for `number`:

- Empty string → `undefined` (avoid accidental zero)
- Non-numeric or `NaN` → `undefined`
- Valid numeric → parsed `number`

### Pattern Examples

| Use Case               | Pattern                                 | Notes                             |
| ---------------------- | --------------------------------------- | --------------------------------- |
| E.164 phone            | `^\\+?[1-9]\\d{1,14}$`                  | International format only         |
| Flexible phone         | `^[0-9()+\\-\\s]{7,20}$`                | Allows spaces & symbols           |
| Decimal (2 places)     | `^\d+(?:\.\d{1,2})?$`                   | Integer or X.YY                   |
| Alphanumeric slug      | `^[a-z0-9-]{3,63}$`                     | Lowercase slug (tenant domain)    |
| Strong password hint\* | `^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$` | Basic complexity (not exhaustive) |

\*Prefer server & library-based password strength checks; pattern is only a preliminary gate.

### Usage Examples By Type

#### Text

```tsx
<LabelInputField
  label="Project Name"
  required
  renderInput
  inputType="text"
  placeholder="e.g. Analytics Pipeline"
  maxLength={80}
  value={name}
  onChange={(e) => setName(e.target.value)}
/>
```

#### Email

```tsx
<LabelInputField
  label="Contact Email"
  required
  renderInput
  inputType="email"
  autoComplete="email"
  inputMode="email"
  placeholder="user@example.com"
  value={email}
  onValueChange={(v) => setEmail(v as string)}
/>
```

#### Number (parsed)

```tsx
<LabelInputField
  label="Max Users"
  renderInput
  inputType="number"
  min={1}
  max={1000}
  step={1}
  inputMode="numeric"
  value={maxUsers}
  onValueChange={(v) => setMaxUsers((v as number) || 0)}
/>
```

#### Telephone (E.164)

```tsx
<LabelInputField
  label="Support Phone"
  renderInput
  inputType="tel"
  inputMode="tel"
  pattern="^\\+?[1-9]\\d{1,14}$"
  placeholder="+15551234567"
  value={phone}
  onChange={(e) => setPhone(e.target.value)}
  inputProps={{ 'aria-label': 'Support phone number' }}
/>
```

#### Password

```tsx
<LabelInputField
  label="New Password"
  required
  renderInput
  inputType="password"
  autoComplete="new-password"
  pattern="^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$"
  maxLength={128}
  value={pwd}
  onChange={(e) => setPwd(e.target.value)}
  labelTooltip="Must contain uppercase, lowercase and a digit"
/>
```

#### Textarea

```tsx
<LabelInputField
  label="Internal Notes"
  renderInput
  inputType="textarea"
  rows={4}
  maxLength={500}
  placeholder="Add optional internal notes..."
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
/>
```

#### Hidden Label (compact search)

```tsx
<LabelInputField
  hideLabel
  renderInput
  inputType="text"
  placeholder="Search approvals..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  inputProps={{ 'aria-label': 'Search approvals', 'data-id': 'search-approvals' }}
/>
```

### Error & Invalid Message Priorities

1. Explicit `error` prop (highest precedence).
2. Captured native validation (`invalidMsg`) when `showInvalidMessage=true` and field fails HTML constraint (e.g., email format, pattern mismatch).
3. Placeholder dot `.` (transparent) to maintain height.

### Migration From FormField

| Old Prop    | New Prop / Approach  | Notes                                      |
| ----------- | -------------------- | ------------------------------------------ |
| `FormField` | `LabelInputField`    | Rename + extended API                      |
| `children`  | Still supported      | Use when not auto-rendering input          |
| (none)      | `renderInput`        | Toggle built-in control rendering          |
| (none)      | `inputType`          | Select which input variant                 |
| (none)      | `onValueChange`      | Simplifies number parsing                  |
| (none)      | `inputProps`         | Pass custom `data-*` / `aria-*` attributes |
| (none)      | `showInvalidMessage` | Native validation surfacing                |

Minimal mechanical change: update import and retain existing JSX. Optional enhancement: replace inline `<Input/>` with `renderInput` for simpler markup.

### Performance Considerations

- Wrapper adds negligible overhead (single extra div and helper line).
- Numeric parsing is O(1) and only runs on change for `number` inputs.
- Native validation avoids custom regex parsing for email and basic constraints.

### Accessibility Guidelines

- When `hideLabel=true`, provide `aria-label` in `inputProps`.
- Tooltip icon includes `aria-label` and `title` for screen readers.
- Required fields rely on `required` attribute for native announcement; keep descriptive error messages, not just “Invalid”.

### Troubleshooting (LabelInputField Specific)

| Issue                                   | Cause                                          | Resolution                                                                                  |
| --------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Error not clearing                      | External form state not resetting `error` prop | Clear outer error or use `onChange` to reset form error state                               |
| Number returns `undefined`              | Empty string or non-numeric input              | Treat `undefined` as “unset”; provide default fallback                                      |
| Native invalid message not showing      | `error` prop set OR `showInvalidMessage=false` | Remove `error` or set `showInvalidMessage` true                                             |
| Pattern ignored                         | Missing `pattern` or inputType mismatch        | Ensure `pattern` defined on non-textarea input; pattern only applies to input element types |
| Accessibility warning with hidden label | Missing `aria-label` when `hideLabel=true`     | Provide `inputProps={{ 'aria-label': 'Meaningful label' }}`                                 |

### Best Practices

1. Use `onValueChange` for numeric fields to avoid manual `Number()` parsing everywhere.
2. Always supply `autoComplete` for credential fields (`email`, `password`).
3. Keep `pattern` focused—avoid overly complex regex that harms performance or UX.
4. Show contextual tooltips for fields with business rules (e.g., password requirements, slug constraints).
5. Limit `maxLength` for textareas to reasonable sizes (e.g., 500–1000 chars) to prevent oversized payloads.
6. Combine `inputMode="numeric"` with `pattern` only when stricter formatting is truly needed.
7. Provide descriptions for fields with non-obvious semantics (e.g., "Max Users" influences billing tier).

---
