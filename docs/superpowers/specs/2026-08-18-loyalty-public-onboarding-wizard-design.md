# Design: Public loyalty onboarding wizard (`/{slug}/loyalty`)

**Branch:** `feat/loyalty-qr-scan-points` (same branch as QR/points work)  
**Status:** approved in conversation — ready for implementation plan  
**Date:** 2026-08-18

## Problem

The public registration screen is a single dense form (name + phone + optional birthday + login toggle). It feels dated and forces new and returning customers through the same surface. Returning customers should get in with phone only; new ones should only see name (and optional birthday) after phone lookup fails.

## Goal

Replace the one-shot form with a **step wizard** that:

1. Asks **only WhatsApp** first.
2. Looks up the customer **in this business**.
3. If found → show loyalty card (code + QR + points).
4. If not found → ask **name** (phone locked), then **optional birthday as day+month only** (no year), then register and show card.

Success: fewer fields on first paint; returning users never type a name; birthday is “when is your birthday”, not DOB.

## Non-goals

- OTP / SMS verification of phone.
- Changing employee dashboard or QR scan flow.
- Multi-business account linking.
- Redesign of the loyalty card itself (beyond receiving the same `LoyaltyCardData`).

## Flow

```
entry
  │
  ├─ valid client_id cookie for this business → card
  │
  └─ step phone
        │ Continuar (valid phone)
        │ GET /api/loyalty/customers?phone&slug
        │
        ├─ 200 found → set client_id (existing) → card
        │
        └─ 404 not found → step name
              │ phone shown read-only; “← Cambiar” → back to phone (clears name/birthday draft)
              │ Continuar (name required, trim ≥ 1 meaningful char)
              │
              └─ step birthday (optional)
                    │ day + month pickers (no year)
                    │ [Saltar] or [Continuar]
                    │ POST /api/loyalty/customers { name, phone, birthday?, slug }
                    │ → card
```

**“No soy X”** on card: clear `client_id`, reset wizard to `phone`.

## UI principles

- One primary question per step; large CTA bottom.
- Header brand (logo/name/tagline) stays on all steps.
- Subtle step indicator optional (e.g. dots 1–3 for new path only); omit on card.
- Errors inline under the field / above CTA; Spanish copy.
- Phone stays **fixed** after leaving step 1 until user explicitly goes back via “Cambiar”.

## Data & API

### Lookup (existing)

- `GET /api/loyalty/customers?phone=&slug=` — already supports phone + sets `client_id` when no staff session.
- Treat **404** as “new customer”; other errors surface message and stay on phone step.

### Register (existing)

- `POST /api/loyalty/customers` with `{ name, phone, birthday?, slug }`.
- Phone must match the locked value from step 1 (client sends same; server already normalizes).

### Birthday storage

- Column remains `customers.birthday DATE` (no migration required for MVP).
- UI collects **month + day only**.
- Persist as `DATE` with **sentinel year `2000`** → `2000-MM-DD` (stable leap-day: Feb 29 → `2000-02-29` is valid).
- Empty / skip → `birthday = null`.
- Do **not** show year in any public UI. Future marketing jobs can read `EXTRACT(MONTH/DAY)`.

If later we want a true `mm-dd` type, that is a separate migration; out of scope.

## Component shape

Refactor `modules/loyalty/public/registration.tsx` (Approach A — single component state machine):

```ts
type Step = "phone" | "name" | "birthday" | "card"
// card may also be represented by customer !== null (keep current pattern)
```

State: `phone`, `name`, `birthMonth`, `birthDay`, `loading`, `error`, `customer`.

Extract small presentational pieces only if the file becomes hard to read (optional):

- `PhoneStep`, `NameStep`, `BirthdayStep` — same file or `registration-steps.tsx` colocated.

Reuse: `PhoneInput`, `Input`, `Button`, `LoyaltyCard`, `useBusiness`.

**Remove:** dual `mode: register | login` forms; birthday full `DatePicker` with year; toggle “¿Ya tenés cuenta?” as separate path (absorbed by phone-first lookup).

## Error / edge cases

| Case | Behavior |
|------|----------|
| Invalid phone | Block Continuar; existing `isPhoneValid` |
| Network error on lookup | Message; stay on phone |
| Lookup 404 | name step |
| Empty name | Block Continuar |
| Back from name/birthday | phone editable again; clear downstream drafts |
| POST phone collision race | Server already returns existing customer → treat as success card |
| Cookie stale id | getCustomer fails → ignore cookie, show phone step (page already does this) |
| Staff session on public page | Unchanged public layout; cookie client_id rules from recent fix stay |

## Testing

- Update / replace `tests/ui/registration-birthday.test.tsx` for wizard steps (source or light RTL):
  - phone-only first paint (no name field).
  - birthday step has no year control.
  - skip birthday still registers.
- Domain: if birthday encoding helper is pure (`toBirthdayDate(month, day) → "2000-MM-DD" | null`), unit-test it.
- Keep existing customer API tests; add case only if encoding changes server validation.

## Implementation notes

- Same git branch: `feat/loyalty-qr-scan-points`.
- No new routes.
- Prefer TDD on pure helpers + UI source contracts consistent with repo tests.

## Out of scope follow-ups

- Visual polish / illustrations per step.
- Remember last phone in `sessionStorage`.
- True `birthday_md` column without sentinel year.
