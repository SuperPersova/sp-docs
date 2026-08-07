# AdvancedRuleBuilder - Updated Design

## Overview

The AdvancedRuleBuilder has been completely redesigned to support per-condition AND/OR operators with a more intuitive UI.

## Key Features

### 1. **Per-Condition Operators**

- Each condition (after the first) has its own AND/OR dropdown selector
- First condition has no operator (it's the starting point)
- Users can change operators independently without affecting other conditions

### 2. **Inline Add Controls**

- Each condition row has a delete button + Add dropdown button
- Add dropdown offers:
  - **Add Condition** - Always available
  - **Add Group** - Only available at top level (depth 0)

### 3. **Group Support**

- Groups are nested condition containers with visual indentation
- Max depth: 1 level (groups cannot contain sub-groups)
- Groups have their own operator tracking
- Visual distinction: blue border for top level, purple for groups

### 4. **Empty State Handling**

- If all conditions are deleted, shows "Add First Condition" button
- Prevents users from getting stuck with no way to add conditions back

### 5. **Serialization Format**

```typescript
import { serializeConditionGroup } from '@/features/workflows/utils/serializeConditionGroup';

const serialized = serializeConditionGroup(rule.conditionGroup);
// Output examples:
// "status EQUALS approved"
// "status EQUALS approved AND amount GREATER_THAN 1000"
// "status EQUALS approved OR (priority EQUALS high AND amount GREATER_THAN 5000)"
```

**Edge Case Handling:**

- Parentheses in user input values are escaped: `(` → `\(`, `)` → `\)`
- Example: User enters `test(value)` → Serialized as `field EQUALS test\(value\)`

## Component Structure

### ConditionRow

Props:

- `operatorType` - 'AND' | 'OR' | undefined (shown in dropdown)
- `onOperatorChange` - Callback when user changes operator
- `isFirst` - Boolean to hide operator dropdown for first condition
- `canAddGroup` - Boolean to show/hide "Add Group" option
- `onAddCondition` - Callback to add new condition after this one
- `onAddGroup` - Callback to add new group after this one

### ConditionGroupEditor

Props:

- `depth` - Number (0 = top level, 1 = nested group)
- `operatorType` - Operator connecting this group to previous elements
- `onOperatorChange` - Callback when group operator changes
- `isFirstInParent` - Boolean to determine operator visibility

## Data Structure

### ExtendedConditionGroup

```typescript
type ExtendedConditionGroup = ConditionGroup & {
  _conditionOperators?: Array<'AND' | 'OR' | undefined>;
  _groupOperators?: Array<'AND' | 'OR' | undefined>;
};
```

- `_conditionOperators[i]` - Operator for condition at index i
- `_groupOperators[i]` - Operator for group at index i
- First element always has `undefined` operator

## Usage Example

```typescript
import { AdvancedRuleBuilder, serializeConditionGroup } from '@/features/workflows/components/RuleBuilder';

function WorkflowForm() {
  const [rules, setRules] = useState<Rule[]>([]);

  const handleSave = () => {
    rules.forEach(rule => {
      const serialized = serializeConditionGroup(rule.conditionGroup);
      console.log('Saving rule:', serialized);
      // Send to API
      api.saveRule({
        action: rule.action,
        conditionString: serialized
      });
    });
  };

  return (
    <AdvancedRuleBuilder
      rules={rules}
      onChange={setRules}
      resourceSchema={mySchema}
    />
  );
}
```

## Visual Flow

```
┌─────────────────────────────────────────────┐
│ Add Rule Buttons (AUTO_APPROVE, etc.)      │
└─────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────┐
│ Rule Card: AUTO_APPROVE                     │
│ ┌─────────────────────────────────────────┐ │
│ │ [    ] field    op    value  [X] [Add▼]│ │  ← First condition (no operator dropdown)
│ │ [AND▼] field    op    value  [X] [Add▼]│ │  ← Second condition (operator dropdown)
│ │ [OR ▼] field    op    value  [X] [Add▼]│ │  ← Third condition
│ │                                         │ │
│ │ [AND▼] ┌──────────────────────────────┐│ │  ← Group
│ │        │ GROUP                     [X] ││ │
│ │        │ [    ] field op value [X] [+]││ │  ← Condition in group
│ │        │ [AND▼] field op value [X] [+]││ │  ← Second condition in group
│ │        └──────────────────────────────┘│ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## Validation Rules

1. **First condition/group** - No operator selector (it's the starting point)
2. **Subsequent conditions** - Must have AND or OR operator
3. **Groups** - Cannot contain sub-groups (max depth = 1)
4. **Empty conditions** - Shows "Add First Condition" button
5. **Serialization** - Escapes parentheses in user values to prevent parsing conflicts

## Future Enhancements

- [ ] Implement `deserializeConditionGroup` for loading saved rules
- [ ] Add visual highlighting when hovering over conditions
- [ ] Support drag-and-drop reordering of conditions
- [ ] Add bulk operator change (e.g., "Change all to OR")
- [ ] Export/import rules as JSON
