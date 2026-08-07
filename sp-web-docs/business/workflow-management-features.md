# Workflow Management System - Business Features & User Stories

**Document Version:** 1.0  
**Last Updated:** November 28, 2025  
**Target Audience:** Product Managers, Business Analysts, Stakeholders

---

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Feature Set](#feature-set)
4. [User Stories with Acceptance Criteria](#user-stories-with-acceptance-criteria)
5. [Business Scenarios](#business-scenarios)
6. [Validation Rules](#validation-rules)
7. [Real-World Examples](#real-world-examples)
8. [i18n, Fonts & Theme Support](#i18n-fonts--theme-support)

---

## Overview

### Purpose

The Workflow Management System enables organizations to create, manage, and execute approval workflows for various resource types (roles, users, tenants, content, etc.). It provides a flexible, configurable system that supports both sequential and parallel approval processes.

### Recent Terminology & Navigation Update (2025-11-29)

- My Tasks submenu label changed from “Approvals” to “Workflow” to reflect broader scope.
- Route path updated from `/tasks/approvals` to `/tasks/workflow`; routeId remains `app.pendingApprovals` for backward compatibility (tests, analytics).
- Filter UX simplified on the assigned tasks page:
  - Status handled via quick tiles (All, Pending, Approved, Rejected, Overdue).
  - Single row filters: Search, Resources, Priorities, Workflows.
  - Resource ID standalone field removed; search now matches ID/name/message.

### Business Value

- **Compliance**: Enforce approval processes for sensitive operations
- **Accountability**: Track who approved what and when
- **Flexibility**: Support multiple approval patterns and resource types
- **Efficiency**: Automate approval routing and notifications
- **Transparency**: Provide clear visibility into approval status

### Key Stakeholders

- **Administrators**: Create and manage workflow templates
- **Approvers**: Review and approve/reject workflow stages
- **Requesters**: Initiate workflows and track progress
- **Auditors**: Review workflow history and compliance

---

## i18n, Fonts & Theme Support

Business UX Requirements:

- All user-visible strings across workflow pages and dialogs are localized (i18n) with approved keys; English is the fallback.
- UI respects user font size preference (`sm`, `md`, `lg`) and adapts layouts without truncation of critical information.
- Theme-aware components: supports light/dark themes with sufficient contrast per WCAG AA.
- Shared selection patterns (tag-based multi-select with debounced search) are standardized across pages to reduce training time and improve consistency.

---

## Core Concepts

### 1. Workflow Definition (Template)

A reusable blueprint that defines how approvals should flow.

**Key Attributes:**

- Name and description
- Resource type (what it applies to)
- Stages (approval steps)
- Sequential vs. parallel processing
- Auto-approval rules
- Version control

**Business Reason:** Templates ensure consistency across similar approval processes and reduce setup time.

### 2. Workflow Instance

A specific execution of a workflow template for a particular resource.

**Key Attributes:**

- Current stage
- Overall status (Draft, In Progress, Approved, Rejected)
- Linked resource
- Approval history
- Comments and attachments

**Business Reason:** Instances track the actual approval journey for each item, providing audit trails.

### 3. Workflow Stage

An individual approval step within a workflow.

**Key Attributes:**

- Stage name and description
- Assigned reviewers (users or roles)
- Required approval count
- Stage status
- Timeout settings
- Auto-approval conditions

**Business Reason:** Stages break down complex approvals into manageable steps with clear ownership.

### 4. Resource Types

The types of entities that can be governed by workflows:

- **ROLE**: New role creation/modification
- **USER**: User account creation/modification
- **TENANT**: Tenant provisioning/changes
- **PERMISSION**: Permission grant requests
- **CONTENT**: Content publication/changes
- **FEATURE**: Feature flag changes
- **SUBSCRIPTION**: Subscription tier changes
- **CONFIGURATION**: System configuration changes
- **REPORT**: Report generation/distribution
- **CUSTOM**: Organization-specific resources

**Business Reason:** Different resource types have different approval requirements and stakeholders.

---

## Feature Set

### 1. Workflow Template Management

#### Create Workflow Template

**User Story:** As an administrator, I want to create workflow templates so that I can standardize approval processes across my organization.

**Acceptance Criteria:**

- [x] Can specify workflow name (required, 3-100 characters)
- [x] Can add description (optional, max 500 characters)
- [x] Can select resource type from predefined list
- [x] Can add multiple stages (minimum 1, maximum 10)
- [x] Can configure sequential or parallel approval mode
- [x] Can save as draft or publish immediately
- [x] System validates all required fields before saving
- [x] Success/error notifications displayed
- [x] Stage reviewer selection uses the standardized tag-based multi-select with removable badges; prevents duplicates and auto-clears search after selection (shared component).
- [x] Search inputs are debounced (300ms) with a minimum character threshold (1–3) to reduce noise and improve performance.
- [x] All labels/messages are localized; UI respects theme and user font size settings.

**Validation Rules:**

```typescript
// Name validation
- Required field
- Minimum 3 characters
- Maximum 100 characters
- Cannot contain special characters: < > " ' / \
- Must be unique within the organization

// Description validation
- Optional field
- Maximum 500 characters
- Can contain line breaks

// Resource type validation
- Must be one of predefined types
- Cannot change after workflows are assigned

// Stage validation
- Minimum 1 stage required
- Maximum 10 stages allowed
- Each stage must have at least 1 reviewer
- Stage names must be unique within the workflow
```

**Business Example:**

```
Scenario: Creating a role approval workflow

Given: I am an IT administrator
When: I create a new workflow template
Then:
  - Name: "Role Creation Approval"
  - Description: "Two-stage approval for new role creation"
  - Resource Type: ROLE
  - Stages:
    1. "Manager Approval" - Requires 1 approval from manager role
    2. "IT Security Review" - Requires 1 approval from security team
  - Sequential: Yes (must complete in order)
  - Status: ACTIVE

Business Impact: All new role requests automatically route through
manager approval before reaching security team, ensuring proper
oversight and reducing unauthorized role proliferation.
```

#### Edit Workflow Template

**User Story:** As an administrator, I want to edit existing workflow templates so that I can adapt to changing business requirements.

**Acceptance Criteria:**

- [x] Can modify name and description
- [x] Can add/remove/reorder stages
- [x] Can update reviewers for each stage
- [x] Cannot edit templates with active instances (must create new version)
- [x] Changes require confirmation
- [x] Audit trail maintained
- [x] Reviewer selection uses the shared tag-based multi-select; existing selections appear as inline tags with remove (✕).
- [x] Search fields use debounce (300ms) and minimum characters for filtering.
- [x] All confirmation dialogs and messages are localized and respect theme/font size.

**Validation Rules:**

```typescript
// Edit restrictions
- Cannot modify if active instances exist
- Must create new version for breaking changes
- Version number auto-increments
- Original version remains accessible for audit

// Impact analysis
- System shows count of affected assignments
- Warns if changes will impact pending approvals
- Requires explicit confirmation for major changes
```

**Business Example:**

```
Scenario: Adding emergency approval path

Context: During COVID-19, need faster approval for remote access roles

Given: Existing "Role Creation Approval" workflow with 2 stages
When: Administrator wants to add emergency bypass
Then:
  - Add new stage: "Emergency Approval"
  - Configure as alternative path
  - Requires VP approval
  - Can skip standard stages if emergency flag set
  - Create as v2.0 of workflow
  - v1.0 remains for existing instances

Business Impact: Critical access requests can be approved within hours
instead of days while maintaining audit trail and executive oversight.
```

### 2. Workflow Assignment

#### Assign Workflow to Resources

**User Story:** As an administrator, I want to assign workflows to resource types so that all matching resources automatically use the correct approval process.

**Acceptance Criteria:**

- [x] Can select workflow template
- [x] Can choose resource type
- [x] Can apply to all resources or specific selection
- [x] Can enable auto-trigger on resource creation
- [x] Can enable/disable assignment
- [x] System prevents duplicate assignments
- [x] Confirmation shown with affected resource count
- [x] Resource selection uses the shared SearchableSelectField (single or multi) with debounced search and pagination.
- [x] All user-facing text is localized; component respects theme and font settings.

**Validation Rules:**

```typescript
// Assignment validation
- Workflow resource type must match assignment target
- Cannot have multiple active workflows for same resource type
- Must specify at least one resource or "apply to all"
- Auto-trigger requires "apply to all" mode

// Conflict detection
- Checks for existing assignments
- Warns about overlapping rules
- Prevents circular dependencies
```

**Business Example:**

```
Scenario: Enforcing approval for all new roles

Given: "Role Creation Approval" workflow template
When: Administrator assigns to ROLE resource type
Then:
  - Apply to: All resources
  - Auto-trigger: Yes (on role creation)
  - Enabled: Yes
  - Effect: Every new role creation automatically starts approval

Business Impact: Eliminates manual workflow initiation, ensuring
100% compliance with role approval policy. Reduces admin overhead
and prevents accidental bypasses.
```

### 3. Workflow Execution

#### Initiate Workflow

**User Story:** As a user, I want to create a new role (or other resource) and have the approval workflow automatically start so that I can request necessary permissions.

**Acceptance Criteria:**

- [x] Workflow starts automatically when resource created (if auto-trigger enabled)
- [x] User can manually start workflow from resource page
- [x] Initial stage becomes "pending"
- [x] Assigned reviewers notified
- [x] Requester receives confirmation
- [x] Workflow instance ID generated

**Behind the Scenes:**

```typescript
// Workflow initiation process
1. User creates new role "Database Administrator"
2. System detects resource type = ROLE
3. Queries for active workflow assignments
4. Finds "Role Creation Approval" workflow
5. Creates workflow instance:
   - Links to role resource
   - Sets status = IN_PROGRESS
   - Sets current_stage = first stage
   - Records initiator
   - Generates unique instance ID
6. Notifies stage 1 reviewers (managers)
7. Sends confirmation to requester
8. Updates role status to "Pending Approval"

// Database operations
- INSERT workflow_instances
- INSERT workflow_stage_assignments
- INSERT notifications
- UPDATE resource_status
- INSERT audit_log
```

**Business Example:**

```
Scenario: New contractor role request

Context: IT team needs temporary elevated access for contractor

Action Flow:
1. IT Admin creates role "Contractor-AWS-Developer"
2. Workflow auto-starts (assigned previously)
3. Stage 1: IT Manager receives notification
   - Email: "Role approval request pending"
   - Dashboard: Red badge on "Pending Approvals"
   - Details: Role name, permissions, requester
4. Manager has 48 hours to review
5. After approval, moves to Stage 2
6. Security team reviews
7. After final approval, role becomes active

Business Impact:
- Clear accountability (who requested, who approved)
- Audit trail for compliance
- Prevents unauthorized access
- SLA enforcement (48-hour timeout)
```

#### Approve Stage

**User Story:** As an approver, I want to review and approve workflow stages so that I can authorize appropriate requests.

**Acceptance Criteria:**

- [x] Can view workflow details (resource, requester, history)
- [x] Can add comments before approval
- [x] Can approve or reject
- [x] System validates approver is assigned to current stage
- [x] Approval timestamp recorded
- [x] Next stage starts automatically (if sequential)
- [x] Notifications sent to relevant parties

**Validation Rules:**

```typescript
// Approver authorization
- Must be assigned to current stage
- Cannot approve own requests
- Must be active user account
- Cannot approve if conflict of interest flag set

// Approval business rules
- Comments optional for approval
- Comments required for rejection
- Cannot undo approval (must escalate to admin)
- Approval counts towards required threshold
- If parallel: all reviewers must act
- If sequential: moves to next stage immediately
```

**Business Example:**

```
Scenario: Manager approving contractor role

Given: IT Manager receives approval request
When: Manager reviews "Contractor-AWS-Developer" role
Then:
  Action: Clicks "Approve" in dashboard
  Comment: "Approved for Project Phoenix, 6-month duration"
  Result:
    - Stage 1 status = APPROVED
    - Workflow moves to Stage 2 (Security Review)
    - Security team notified
    - Requester notified of progress
    - Audit log updated
    - Role status remains "Pending Approval"

Business Impact: Clear decision trail, progress visibility,
automated routing to next approver without manual handoff.
```

#### Reject Stage

**User Story:** As an approver, I want to reject inappropriate workflow requests so that I can prevent unauthorized resource access.

**Acceptance Criteria:**

- [x] Must provide rejection reason (required)
- [x] Workflow status changes to REJECTED
- [x] Resource status changes to REJECTED
- [x] Requester notified with reason
- [x] Cannot proceed to next stages
- [x] Requester can resubmit with modifications

**Validation Rules:**

```typescript
// Rejection requirements
- Reason required (minimum 10 characters)
- Must specify rejection category:
  * Insufficient justification
  * Policy violation
  * Security concern
  * Resource duplication
  * Other (explain)
- Cannot reject after all stages approved
- Rejection is final for this instance
```

**Business Example:**

```
Scenario: Security rejecting over-permissioned role

Given: Security team reviewing contractor role
When: Security analyst sees excessive permissions
Then:
  Action: Clicks "Reject"
  Category: "Security concern"
  Reason: "Contractor should not have production database delete
          permissions. Please revise to read-only access."
  Result:
    - Workflow status = REJECTED
    - Role status = REJECTED
    - Email sent to requester with reason
    - Email sent to IT Manager (for awareness)
    - Audit log records rejection with full context
    - Requester can create new role request with corrections

Business Impact:
- Prevents over-privileged access
- Educates requesters on security policies
- Creates learning opportunity
- Maintains least-privilege principle
```

### 4. Workflow Monitoring

#### Pending Approvals Dashboard

**User Story:** As an approver, I want to see all workflows awaiting my approval so that I can efficiently process requests.

**Acceptance Criteria:**

- [x] Lists all workflows where user is assigned reviewer
- [x] Shows workflow name, resource, requester, age
- [x] Filterable by resource type, age, priority
- [x] Sortable by date, priority, requester
- [x] Search functionality
- [x] Badge shows pending count
- [x] One-click access to workflow details
- [x] All labels, filters, and messages are localized; page respects theme and font size.

**UI Features:**

```typescript
// Dashboard elements
- Red badge with count (e.g., "5" pending)
- Table/card view toggle
- Filters: All, Urgent (>48h), By Resource Type
- Sort: Oldest First, Newest First, Priority
- Search: By requester name, workflow name, resource name
- Quick actions: Approve, Reject, View Details
- Bulk actions: Select multiple, Approve all selected

// Performance optimization
- Debounce search (300ms)
- Pagination (10 items per page)
- Lazy loading for large lists
- Cache recent data
```

**Business Example:**

```
Scenario: Manager reviewing morning approvals

Context: Manager logs in at 9 AM

Dashboard Display:
┌─────────────────────────────────────────────────┐
│ Pending Approvals (7)                          │
├─────────────────────────────────────────────────┤
│ 🔴 URGENT (>48h): 2 items                      │
│   • Role: "AWS-Admin" - Requested 3 days ago   │
│   • Tenant: "Partner-XYZ" - Requested 4 days ago│
│                                                  │
│ ⚠️  NORMAL: 5 items                            │
│   • Role: "Contractor-Dev" - 1 day ago         │
│   • User: "john.doe@email" - 6 hours ago       │
│   • Content: "Q4 Report" - 2 hours ago         │
│   • ...                                         │
└─────────────────────────────────────────────────┘

Actions:
- Manager clicks urgent items first
- Reviews and approves/rejects
- Badge updates in real-time
- Email digest sent at end of day if items remain

Business Impact:
- Prioritizes time-sensitive requests
- Reduces approval bottlenecks
- Improves SLA compliance
- Clear visibility into workload
```

#### Workflow History & Audit Trail

**User Story:** As an auditor, I want to view complete workflow history so that I can verify compliance and investigate issues.

**Acceptance Criteria:**

- [x] Shows all workflow events chronologically
- [x] Includes: approvals, rejections, comments, modifications
- [x] Records: actor, timestamp, action, before/after values
- [x] Exportable to CSV/PDF
- [x] Filterable by date range, actor, action type
- [x] Immutable (cannot be edited or deleted)

**Audit Data Captured:**

```typescript
// Event types
- WORKFLOW_CREATED
- STAGE_APPROVED
- STAGE_REJECTED
- COMMENT_ADDED
- ASSIGNMENT_CHANGED
- TIMEOUT_TRIGGERED
- ESCALATION_SENT
- WORKFLOW_COMPLETED
- WORKFLOW_CANCELLED

// For each event
{
  id: "evt-uuid",
  timestamp: "2025-11-28T10:30:45Z",
  actor_id: "user-123",
  actor_name: "Jane Smith",
  actor_role: "IT Manager",
  action: "STAGE_APPROVED",
  workflow_instance_id: "wfi-789",
  stage_id: "stage-approval-1",
  metadata: {
    comments: "Approved for Q1 project",
    ip_address: "192.168.1.100",
    user_agent: "Chrome/120.0",
    before_status: "PENDING",
    after_status: "APPROVED"
  }
}
```

**Business Example:**

```
Scenario: Compliance audit for sensitive role

Context: Annual security audit requires proof of approval

Audit Query: Show all approvals for "Production-DBA" role

Report Generated:
═══════════════════════════════════════════════════════
Workflow Audit Report
Role: Production-DBA-Admin
Instance ID: wfi-2024-1234
Period: Jan 1 - Dec 31, 2024
═══════════════════════════════════════════════════════

2024-03-15 09:30 - WORKFLOW_CREATED
  Initiated by: John Developer (jdeveloper@company.com)
  Reason: "Need DBA access for migration project"

2024-03-15 14:22 - STAGE_APPROVED (Stage 1: Manager)
  Approved by: Sarah Manager (smanager@company.com)
  Comment: "Approved for 6-month migration project"

2024-03-17 10:15 - STAGE_APPROVED (Stage 2: Security)
  Approved by: Mike Security (msecurity@company.com)
  Comment: "Verified need, limited to non-production first"

2024-03-17 10:16 - WORKFLOW_COMPLETED
  Final Status: APPROVED
  Role Activated: 2024-03-17 10:16

2024-09-15 08:00 - ROLE_DEACTIVATED
  Deactivated by: System (Project ended)
  Reason: "6-month duration expired"

═══════════════════════════════════════════════════════
Audit Result: ✅ COMPLIANT
- Proper approvals obtained
- Comments documented
- Timely review (< 48 hours)
- Access deactivated on schedule
═══════════════════════════════════════════════════════

Business Impact:
- Passes compliance audit
- Demonstrates proper controls
- Shows accountability
- Validates security posture
```

---

## Business Scenarios

### Scenario 1: New Employee Onboarding

**Context:** New software engineer joins the company

**Workflow Journey:**

1. **Day 1 - Role Assignment Request**
   - HR creates user account
   - Manager requests "Software Engineer" role
   - Workflow auto-starts

2. **Day 1 - Manager Approval (Stage 1)**
   - Hiring manager reviews
   - Confirms: laptop assigned, workspace ready
   - Approves within 2 hours

3. **Day 2 - Security Review (Stage 2)**
   - Security team reviews background check
   - Confirms: clearance completed
   - Approves access levels

4. **Day 2 - IT Provisioning (Stage 3)**
   - IT confirms: VPN setup, 2FA enabled
   - Final approval granted
   - Role activated

5. **Result:**
   - User has appropriate access Day 2
   - All approvals documented
   - No manual handoffs
   - Audit trail complete

**Business Value:** Faster onboarding, better experience, full compliance

### Scenario 2: Tenant Provisioning for New Client

**Context:** Enterprise client signs contract, needs dedicated environment

**Workflow Journey:**

1. **Week 1 - Sales Handoff**
   - Account Executive creates tenant request
   - Includes: Company name, size, feature requirements
   - Workflow: "Enterprise Tenant Provisioning"

2. **Week 1 - Finance Approval (Stage 1)**
   - Finance verifies: Contract signed, payment method
   - Checks credit terms
   - Approves within 24 hours

3. **Week 1 - Technical Review (Stage 2)**
   - Solutions Architect reviews: Resource requirements
   - Plans: Server allocation, database size, integrations
   - Approves with specifications

4. **Week 2 - Security Configuration (Stage 3)**
   - Security team: Sets up firewall rules, SSO
   - Reviews: Compliance requirements (HIPAA, SOC2)
   - Approves security baseline

5. **Week 2 - Provisioning (Automated)**
   - After all approvals: System auto-provisions
   - Creates: Database, application instance, storage
   - Sends credentials to client admin

6. **Result:**
   - Tenant live within 2 weeks
   - All stakeholders reviewed
   - Security requirements met
   - Client receives welcome email

**Business Value:** Scalable onboarding, consistent quality, risk mitigation

### Scenario 3: Emergency Access Request

**Context:** Production incident requires immediate database access

**Workflow Journey:**

1. **Friday 11 PM - Incident Occurs**
   - Developer needs emergency DBA access
   - Creates urgent role request
   - Workflow: "Emergency Access" (special path)

2. **Friday 11:05 PM - On-Call Approval**
   - On-call manager receives SMS alert
   - Reviews: Incident severity, blast radius
   - Approves via mobile app
   - Comment: "Prod down, customer impact"

3. **Friday 11:10 PM - Security Fast-Track**
   - Security lead notified (parallel)
   - Reviews: Access logs, incident ticket
   - Approves time-limited access (4 hours)

4. **Friday 11:15 PM - Access Granted**
   - Both approvals complete
   - System grants temporary elevated access
   - Logs all actions during window

5. **Saturday 3 AM - Auto-Revoke**
   - 4-hour window expires
   - Access automatically revoked
   - Audit report generated
   - Incident reviewed in Monday standup

**Business Value:**

- Rapid response capability
- Maintains security controls even in emergencies
- Automatic access expiration prevents lingering privileges
- Complete audit trail for post-incident review

---

## Validation Rules

### Workflow Template Validation

```typescript
/**
 * Validation: Workflow Name
 *
 * Business Reason: Names are used for search and reporting,
 * must be meaningful and prevent confusion
 */
const validateWorkflowName = (name: string): ValidationResult => {
  // Required check
  if (!name || name.trim().length === 0) {
    return {
      valid: false,
      error: 'Workflow name is required',
      reason: 'Users need to identify workflows in lists and reports',
    };
  }

  // Length check
  if (name.length < 3) {
    return {
      valid: false,
      error: 'Workflow name must be at least 3 characters',
      reason: 'Too short names are not descriptive enough',
    };
  }

  if (name.length > 100) {
    return {
      valid: false,
      error: 'Workflow name must not exceed 100 characters',
      reason: "Long names don't fit in UI tables and reports",
    };
  }

  // Character validation
  const invalidChars = /[<>"'\/\\]/;
  if (invalidChars.test(name)) {
    return {
      valid: false,
      error: 'Workflow name contains invalid characters',
      reason: 'Special characters can cause XSS vulnerabilities and display issues',
    };
  }

  return { valid: true };
};

/**
 * Validation: Stage Configuration
 *
 * Business Reason: Stages define approval flow,
 * must have valid reviewers and make business sense
 */
const validateStage = (stage: WorkflowStage): ValidationResult => {
  // Reviewer validation
  if (!stage.reviewers || stage.reviewers.length === 0) {
    return {
      valid: false,
      error: 'Stage must have at least one reviewer',
      reason: 'Cannot route approvals without designated reviewers',
    };
  }

  // Approval threshold validation
  if (stage.requiredApprovals > stage.reviewers.length) {
    return {
      valid: false,
      error: 'Required approvals cannot exceed number of reviewers',
      reason: 'Cannot require more approvals than available reviewers',
    };
  }

  // Timeout validation
  if (stage.timeoutHours && stage.timeoutHours < 1) {
    return {
      valid: false,
      error: 'Timeout must be at least 1 hour',
      reason: 'Reviewers need reasonable time to evaluate requests',
    };
  }

  return { valid: true };
};
```

### Assignment Validation

```typescript
/**
 * Validation: Workflow Assignment
 *
 * Business Reason: Assignments control which workflows apply to resources,
 * conflicts can cause unpredictable behavior
 */
const validateAssignment = (
  workflowId: string,
  resourceType: ResourceType,
  applyToAll: boolean,
  specificResources?: string[],
): ValidationResult => {
  // Check for existing active assignment
  const existingAssignment = getActiveAssignment(resourceType);
  if (existingAssignment && existingAssignment.workflowId !== workflowId) {
    return {
      valid: false,
      error: `Resource type ${resourceType} already has active workflow: ${existingAssignment.workflowName}`,
      reason: 'Multiple workflows for same resource type can cause conflicts',
      suggestion: 'Disable existing assignment or modify it instead',
    };
  }

  // Validate specific resources if not apply-to-all
  if (!applyToAll) {
    if (!specificResources || specificResources.length === 0) {
      return {
        valid: false,
        error: "Must select at least one resource or enable 'Apply to All'",
        reason: 'Assignment without targets has no effect',
      };
    }
  }

  // Validate workflow and resource type match
  const workflow = getWorkflow(workflowId);
  if (workflow.resourceType !== resourceType) {
    return {
      valid: false,
      error: 'Workflow resource type must match assignment target',
      reason: 'Workflow designed for ROLE cannot be applied to TENANT',
      example: 'A role approval workflow expects role-specific data',
    };
  }

  return { valid: true };
};
```

---

## Real-World Examples

### Example 1: Financial Services - Wire Transfer Approval

**Business Context:**
Bank requires multi-level approval for wire transfers based on amount

**Workflow Configuration:**

```yaml
name: 'Wire Transfer Approval'
resource_type: TRANSACTION
description: 'Multi-tiered approval based on transaction amount'

stages:
  - name: 'Branch Manager Approval'
    reviewers: [ROLE:branch_manager]
    required_approvals: 1
    conditions:
      - amount >= 10000
      - amount < 50000
    timeout: 4 hours

  - name: 'Regional Manager Approval'
    reviewers: [ROLE:regional_manager]
    required_approvals: 1
    conditions:
      - amount >= 50000
      - amount < 100000
    timeout: 8 hours

  - name: 'VP Finance Approval'
    reviewers: [ROLE:vp_finance, ROLE:vp_operations]
    required_approvals: 2 # Both VPs must approve
    conditions:
      - amount >= 100000
    timeout: 24 hours
    escalation: [ROLE:cfo]

sequential: true
allow_comments: true
require_mfa: true # Additional security for financial transactions
```

**Business Impact:**

- Fraud prevention through multi-level oversight
- Segregation of duties compliance (SOX)
- Clear accountability chain
- Faster processing for routine transfers
- Automatic escalation prevents delays

### Example 2: Healthcare - Patient Data Access

**Business Context:**
Hospital must comply with HIPAA, restrict access to patient records

**Workflow Configuration:**

```yaml
name: 'Patient Record Access Request'
resource_type: PERMISSION
description: 'HIPAA-compliant access approval for patient records'

stages:
  - name: 'Department Head Approval'
    reviewers: [ROLE:department_head]
    required_approvals: 1
    timeout: 2 hours
    required_data:
      - patient_id
      - access_reason
      - duration

  - name: 'Privacy Officer Review'
    reviewers: [ROLE:privacy_officer]
    required_approvals: 1
    timeout: 4 hours
    checks:
      - verify_legitimate_need
      - check_minimum_necessary
      - validate_duration

  - name: 'Audit Log'
    auto_approve: true
    actions:
      - log_to_hipaa_system
      - notify_compliance
      - set_expiration_timer

sequential: true
audit_level: HIGH
notification_methods: [email, sms, in_app]
auto_revoke_after: duration_specified
```

**Business Impact:**

- HIPAA compliance maintained
- "Minimum necessary" principle enforced
- Complete audit trail for regulators
- Time-limited access reduces risk
- Privacy officer oversight prevents abuse

### Example 3: Software Company - Production Deployment

**Business Context:**
SaaS company requires approvals before production deployments

**Workflow Configuration:**

```yaml
name: 'Production Deployment Approval'
resource_type: DEPLOYMENT
description: 'Multi-stage approval for production changes'

stages:
  - name: 'Code Review'
    reviewers: [ROLE:senior_engineer]
    required_approvals: 2 # Two senior engineers
    timeout: 24 hours
    checks:
      - code_review_completed
      - tests_passed
      - security_scan_clean

  - name: 'QA Sign-Off'
    reviewers: [ROLE:qa_lead]
    required_approvals: 1
    timeout: 8 hours
    checks:
      - regression_tests_passed
      - performance_benchmarks_met
      - no_critical_bugs

  - name: 'Product Manager Approval'
    reviewers: [ROLE:product_manager]
    required_approvals: 1
    timeout: 4 hours
    checks:
      - feature_flags_configured
      - rollback_plan_ready
      - customer_communication_sent

  - name: 'DevOps Final Check'
    reviewers: [ROLE:devops_lead]
    required_approvals: 1
    timeout: 2 hours
    checks:
      - infrastructure_ready
      - monitoring_configured
      - on_call_engineer_assigned

sequential: false # Parallel reviews until final stage
final_stage_sequential: true # DevOps must be last
deployment_window: 'Mon-Thu 10:00-14:00' # Only deploy during safe window
automated_rollback: true
```

**Business Impact:**

- Reduced production incidents (75% decrease)
- Multiple expert reviews catch issues early
- Deployment during safe windows minimizes customer impact
- Automated checks prevent human error
- Clear rollback procedures reduce downtime

---

## Internationalization (i18n) Support

All workflow UI components and pages support internationalization:

### Translation Keys Structure

```typescript
// Workflow management translations
workflows: {
  // Page titles
  title: "Workflow Management",
  create: "Create Workflow",
  edit: "Edit Workflow",
  view: "View Workflow",
  assign: "Assign Workflow",

  // Actions
  approve: "Approve",
  reject: "Reject",
  comment: "Add Comment",
  cancel: "Cancel",
  save: "Save",

  // Status labels
  status: {
    draft: "Draft",
    active: "Active",
    inactive: "Inactive",
    in_progress: "In Progress",
    approved: "Approved",
    rejected: "Rejected"
  },

  // Validation messages
  validation: {
    nameRequired: "Workflow name is required",
    nameTooShort: "Name must be at least {{min}} characters",
    nameTooLong: "Name must not exceed {{max}} characters",
    stageRequired: "At least one stage is required"
  },

  // Success/error messages
  messages: {
    createSuccess: "Workflow created successfully",
    updateSuccess: "Workflow updated successfully",
    deleteSuccess: "Workflow deleted successfully",
    assignSuccess: "Workflow assigned to {{count}} resource(s)",
    approveSuccess: "Approval submitted successfully",
    rejectSuccess: "Rejection submitted successfully"
  }
}
```

### Usage Example

```typescript
// In React component
import i18next from 'i18next';

const WorkflowHeader = () => {
  const t = i18next.t.bind(i18next);

  return (
    <h1>{t('workflows.title', { ns: 'workflows' })}</h1>
  );
};

// With parameters
<p>{t('workflows.messages.assignSuccess', {
  count: 5,
  ns: 'workflows'
})}</p>
// Output: "Workflow assigned to 5 resource(s)"
```

---

## Theme Support

All workflow components respect user's theme preferences (light/dark mode) and font size settings:

### Theme Implementation

```typescript
// Component uses theme context
const { theme } = useTheme();
const { fontSize } = useSelector((s: RootState) => s.preferences);

// Dynamic classes
const fontSizeClass = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg'
}[fontSize || 'base'];

// Applied to root element
<div className={`${fontSizeClass} ${theme === 'dark' ? 'dark' : ''}`}>
  {/* Content adapts to theme */}
</div>
```

### Accessibility

- Color contrast meets WCAG AA standards
- Icons have descriptive labels
- Keyboard navigation fully supported
- Screen reader friendly
- Focus indicators visible
- Font sizing respects user preferences

---

## Summary

This workflow management system provides:

✅ **Flexibility**: Support for multiple resource types and approval patterns  
✅ **Compliance**: Complete audit trails and validation rules  
✅ **Efficiency**: Automated routing and notifications  
✅ **Scalability**: Template-based approach for consistency  
✅ **Transparency**: Real-time visibility into approval status  
✅ **Security**: Role-based access and multi-level approvals  
✅ **Usability**: Intuitive UI with full i18n and theme support

The system has been designed based on real-world business scenarios and includes comprehensive validation to prevent common pitfalls while maintaining flexibility for diverse organizational needs.

---

**Related Documentation:**

- [Developer Guide - Workflow Implementation](../developer/workflow-implementation.md)
- [Shared Components - SearchableSelectField](../developer/shared-components.md)
- [API Reference - Workflow Endpoints](../developer/api/workflow-api.md)
