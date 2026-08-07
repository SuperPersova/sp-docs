# Company Onboarding & Management Guide

This guide details the integration and functionality of the `CompanyAddForm` shared component, which handles both initial company onboarding (from the Login screen) and subsequent company additions (from the Management Card).

## Shared Component: `CompanyAddForm`

**Location:** `sp_web_space/sp-web-ext/src/components/shared/company/CompanyAddForm.tsx`

The `CompanyAddForm` is designed to be highly reusable, adapting its UI and API logic based on the `formModeSrc` property.

### Properties

| Property | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `onSuccess` | `(emailOrPhone: string) => void` | Yes | Callback executed upon successful API response. Passes the submitted email or phone number. |
| `onCancel` | `() => void` | No | Callback executed when the Cancel button is clicked. |
| `className` | `string` | No | Additional CSS classes for custom styling. |
| `formModeSrc` | `'login' \| 'management'` | No | Dictates the form's mode. Defaults to `'login'`. |

---

## Modes of Operation

### 1. Login Mode (Onboarding)
Used when a completely new user is creating a new company workspace from the Login screen.

- **Trigger:** Setting `formModeSrc="login"` (or leaving it undefined).
- **Displayed Fields:** 
  - Company Name
  - Admin Email or Phone
  - Admin Password
  - Admin First Name
  - Admin Last Name
- **Submit Button:** "Send Verification OTP"
- **API Endpoint:** `/api/v1/identity/companies/onboard`
- **Logic:** Calls `identityService.onboardCompany`, passing both the company details and the new user's credentials. This registers the user and creates the company in a single transaction.

### 2. Management Mode
Used when an authenticated user (typically an administrator) is adding an additional company via the Management Card.

- **Trigger:** Setting `formModeSrc="management"`.
- **Displayed Fields:** 
  - Company Name
  - Company Email
- **Submit Button:** "Save Company"
- **API Endpoint:** `/api/v1/identity/companies`
- **Logic:** Calls `identityService.createCompany`, passing only the company details. No user registration is performed since the user is already authenticated.

---

## Example Usage

**Login Screen Integration:**
```tsx
<CompanyAddForm 
  formModeSrc="login"
  onSuccess={(email) => navigate('/verify', { state: { emailOrPhone: email } })}
  onCancel={() => setStep('credentials')}
/>
```

**Management Card Integration:**
```tsx
<CompanyAddForm 
  formModeSrc="management"
  onSuccess={(email) => {
    setCompanies([...companies, { id: Date.now().toString(), name: 'Pending...', domain: email }]);
    setIsAdding(false);
  }}
  onCancel={() => setIsAdding(false)}
/>
```
