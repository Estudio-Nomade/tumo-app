# Adversarial Finalize Review — Architecture Spine

**Spine:** `ARCHITECTURE-SPINE.md` (loyalty-qr-scan-points)  
**Intent:** `brainstorm-intent.md` (loyalty QR scan → points)  
**Reviewer stance:** two units one level down that each obey every AD literally and still ship incompatible systems  
**Date:** 2026-08-18  
**Verdict:** **FAIL — not finalize-ready**

---

## Method

For each hole: construct **Unit A** and **Unit B** (epic/story/implementer pairs). Both satisfy every adopted AD as written. Their integration breaks shared data, ownership, or mutation paths. Each pair is a spine defect requiring a new or tightened AD.

---

## Findings (incompatible pairs)

### 1. Dual earn request shapes → two mutation contracts for one endpoint

**ADs obeyed:** AD-10 (explicitly allows both bodies), AD-1, AD-3, AD-12

| | Unit A — Sheet + client | Unit B — `api/points` |
| --- | --- | --- |
| Behavior | Sends preferred body `{ customerId, rangeIndex, force? }` only | Implements only freeform `{ customerId, points, amountCents?, rangeLabel?, force? }` and treats `rangeIndex` as 400 unknown field |
| Or inverse | Caches range at sheet-open and posts freeform `points` + `amountCents` (still AD-10-legal) | Resolves **only** `rangeIndex` against live `point_ranges` at request time |

**Clash:** Confirm succeeds in A’s tests against a mock; B’s handler never matches. Worse: both paths accepted → same sale can earn `points` that no longer match `point_ranges[rangeIndex]` after a concurrent program edit (A trusts client numbers; B re-resolves index).

**Hole:** AD-10 must pick **one** canonical body. Preferred form should be mandatory; freeform banned or restricted to admin/tests. Specify server is source of truth: always resolve `rangeIndex` → `{ points, amount_cents, range_label }` at mutation time; reject client-supplied points.

---

### 2. Two owners of “what is a redeem record”

**ADs obeyed:** AD-2 (`point_movements.kind IN ('earn','redeem')`), AD-10 (`POST /redemptions` kept; insert `kind='redeem'`)

| | Unit A — Migration / history | Unit B — `api/redemptions` |
| --- | --- | --- |
| Behavior | Migration 003 drops or ignores legacy `redemptions` table; all history is `point_movements` only | Keeps writing `redemptions` **and** inserts `point_movements` (or only `redemptions`, mapping “insert kind=redeem” as “a redemption row exists”) |
| Metrics | Dashboard “canjes” counts `point_movements WHERE kind='redeem'` | Counts rows in `redemptions` |

**Clash:** Double-count or silent zero history after cutover. Brownfield code today uses `redemptions` + `purchases=0` (see current `redeemReward`); spine never says whether `redemptions` is deleted, dual-written, or views onto movements.

**Hole:** AD-2/AD-10 must state: single write path for redeem; fate of `redemptions` table (drop in 003 / migrate rows into `point_movements` / forbidden); response body shape (`points: 0` not `purchases: 0`).

---

### 3. Range model: intent’s “0-pt first band” vs AD-3’s “filter points<=0”

**ADs obeyed:** AD-3, intent decision 7, AD-12

| | Unit A — Program editor | Unit B — Earn + picker |
| --- | --- | --- |
| Behavior | Stores Omar-style config **including** explicit first band `{ min:0, max:1000000, points:0 }` then positive bands (matches intent §4 “primer tramo 0 pts editable”) | Filters `points <= 0` from picker (AD-3); treats “below min” as “no range contains amount” **or** as “first positive range’s min_cents” |
| Validation | Requires contiguous chain starting at 0 with exactly one open tail | Allows `point_ranges: []`, gaps, overlaps, or first `min_cents > 0` with no 0-band |

**Clash:** A’s saved JSON is valid for A; B’s resolver disagrees on whether empty ranges, missing 0-band, or only-positive arrays are legal. Picker empty vs “always show something.” Earn with freeform body (Finding 1) bypasses picker and records below-min purchases AD-3 said must not exist.

**Hole:** Tighten AD-3 with a closed validation spec: min length; sort order; contiguity predicate (`ranges[i].max_cents === ranges[i+1].min_cents`); exactly one `max_cents === null` and it must be last; whether a leading `points === 0` band is required or forbidden; reject `points < 0`; reject empty array on PATCH; earn path must not accept points that don’t come from a `points > 0` range.

---

### 4. `rangeIndex` identity is unstable across config edits

**ADs obeyed:** AD-3, AD-10 (rangeIndex preferred), AD-7

| | Unit A — Sheet UX | Unit B — Program form + PATCH |
| --- | --- | --- |
| Behavior | Opens sheet, loads ranges once, user picks index `2`, confirms seconds later | Owner PATCHes `point_ranges` (reorder/insert/delete) between load and confirm |
| Resolution | Sends `rangeIndex: 2` | Server applies index to **new** array → different points/label/amount |

**Clash:** Antifraud screen “N puntos a Juan” (intent) shows N from stale client ranges; server credits M. No AD requires ETag/version on `businesses.point_ranges`, or embedding range snapshot in confirm, or 409 `RANGES_CHANGED`.

**Hole:** AD on earn concurrency with program config: e.g. require `rangesVersion` / `updated_at` token on POST points; or body includes expected `points` and server rejects mismatch after resolving index; or transactional read of ranges at confirm with UI re-fetch before POST.

---

### 5. Customer balance fields: two increment/reset algebrae

**ADs obeyed:** AD-2 (rename columns), AD-10 (redeem sets `points = 0`), diagram earn→`customers.points`

| | Unit A — Earn | Unit B — Redeem + progress UI |
| --- | --- | --- |
| Behavior | `points += earned`; `total_points += earned` | Redeem: `points = 0` only; progress bar uses `points / points_needed`; lifetime badge uses `total_points` |
| Alternate B | Redeem also zeros or adjusts `total_points` | Earn only sets `points` and leaves `total_points` as legacy “purchase count” semantics |

**Clash:** No AD states invariants: `points` is cycle balance (0..points_needed-ish); `total_points` is monotonic lifetime earns; redeem never decreases `total_points`; earn is rejected or capped when? (overflow past `points_needed` without redeem — allowed?). Two implementers ship different card progress and different “can redeem” gates (`points >= points_needed` vs `total_points`).

**Hole:** AD for balance algebra + redeem eligibility + whether earn is allowed when already redeemable + single-row update transaction with movement insert.

---

### 6. Public deep link vs scanner: two session→sheet pipelines

**ADs obeyed:** AD-4, AD-5, AD-6, AD-8

| | Unit A — `app/.../loyalty/c/[code]/page` | Unit B — Scanner + dashboard `?c=` |
| --- | --- | --- |
| Behavior | Server redirect to `/{slug}/dashboard/loyalty?c={code}` if any `validateSession` cookie exists | Opens sheet only after client fetch `GET customer by code`; ignores `?c=` unless scanner decoded it |
| Cross-business | Redirects whenever session exists (any business) | Scanner accepts only path slug === current dashboard slug |

**Clash:** Employee of Biz-A opens printed QR for Biz-B customer (native camera): A sends them to Biz-B dashboard URL while session is Biz-A → AD-5 “same businessId” fails opaquely or sheet loads 404; B never hits that path and only tests in-app scan. No AD: match `session.businessId` to slug’s business **before** redirect; 403/friendly “no es tu negocio”; code uniqueness scope (per-business vs global) for `customers.code`.

**Hole:** AD-5 must specify slug↔business resolution, cross-tenant denial, and that both entry paths (QR URL and `?c=`) share one “open sheet for code” use-case with identical authz.

---

### 7. Registration QR vs customer QR paths unspecified

**ADs obeyed:** AD-8 (“distinguish program-registration QR if path matches known register URL”), AD-4 (only defines customer payload)

| | Unit A — Card / print | Unit B — Scanner parse |
| --- | --- | --- |
| Behavior | Registration QR = `/{slug}/loyalty` or `/{slug}/register` (guess from existing app) | `parse-loyalty-qr` only allows `/{slug}/loyalty/c/{code}`; everything else = foreign error |
| Or | Register = `/{slug}/loyalty/c/new` | Treats `new` as customer code |

**Clash:** Intent requires scanner distinguishes register vs customer; spine never canonicalizes register URL. A and B disagree → register QR always “foreign” or false customer open.

**Hole:** Extend AD-4/AD-8 with exact register path pattern and parse result union: `{ type: 'customer', slug, code } | { type: 'register', slug } | null`.

---

### 8. Anti-duplicate window: different predicates, same AD-9 text

**ADs obeyed:** AD-9

| | Unit A — Server | Unit B — Client sheet |
| --- | --- | --- |
| Behavior | 409 if **any** earn for customer+business in 60s | Disables confirm 2s only after **this** sheet’s success; second device/employee bypasses client |
| Predicate A′ | 409 only if same `points` or same `rangeIndex` | Always sends `force: true` after first 409 without extra UI (misread “retry with force”) |
| Clock | DB `created_at` | Client `Date.now()` |

**Clash:** Double-scan from two phones: A blocks, A′ does not. Force UX: spine says “UI then shows extra confirm” but does not bind which component owns it or that `force` without prior 409 is ignored.

**Hole:** AD-9: predicate = any earn (not same amount); server time only; `force` accepted only after… (or always allowed but audited); client disable is UX-only, not security; optional idempotency key.

---

### 9. Money/amount semantics: representative min vs “monto” in intent

**ADs obeyed:** AD-12 (`amount_cents = range.min_cents`), intent §4 (“monto, puntos, tramo”)

| | Unit A — Earn writer | Unit B — Reporting / “ticket” mental model |
| --- | --- | --- |
| Behavior | Stores `min_cents` only; `range_label` derived from bounds | Expects `amount_cents` ≈ real ticket; builds totals/sum revenue from movements |
| Open tail | Last range min 30000 → every +30k sale stored as 30000 | Analytics understate high tickets |

**Clash:** Same column, two meanings. Intent language “monto” invites B; AD-12 picks representative min. Not wrong if named, but unlabeled → silent product lie.

**Hole:** Rename or document: `amount_cents` is **range floor snapshot**, not ticket; or store `min_cents`/`max_cents` on movement; forbid summing `amount_cents` as revenue in any AD/convention row.

---

### 10. PATCH `/program` merge vs replace; partial points_needed

**ADs obeyed:** AD-3, AD-10 (`PATCH` body `{ points_needed, reward_name, point_ranges }`)

| | Unit A — Form submit | Unit B — API |
| --- | --- | --- |
| Behavior | Sends full object every save | Treats missing `point_ranges` as “leave unchanged” vs “set to default []” |
| Alternate | Sends only dirty fields | Replaces entire row columns with nulls for omitted keys |

**Clash:** Saving reward name wipes ranges or vice versa. No AD on PATCH semantics (JSON Merge Patch vs full replace) or transactionality with in-flight earns.

**Hole:** Explicit PATCH contract: required fields; omit = no change; `point_ranges` if present must pass full validator (replace array atomically).

---

### 11. API envelope and DTO casing — two wire formats

**ADs obeyed:** Consistency table (`{ status, body }`, errors `{ error, code? }`), AD-10 (`points` / `total_points`)

| | Unit A — Domain handlers | Unit B — UI fetch layer |
| --- | --- | --- |
| Behavior | Returns SQL snake_case in `body` (`total_points`, `range_label`) | Expects camelCase (`totalPoints`) as in TS types `PointRange` |
| Errors | `{ error: string, code?: string }` | Checks `body.code` vs HTTP status only |

**Clash:** Sheet progress NaN; duplicate handling never trips. Spine mixes `rangeIndex` (camel) with `points_needed` (snake) in AD-10 itself.

**Hole:** One wire naming AD (snake_case JSON everywhere vs camelCase); list every DTO field for Customer, Program, PointMovement, error codes enum (`DUPLICATE_RECENT`, …).

---

### 12. Transaction / isolation — two writers to balance + ledger

**ADs obeyed:** AD-1 (mutations in api/*), diagram dual write to `point_movements` + `customers`

| | Unit A — Earn | Unit B — Redeem (parallel request) |
| --- | --- | --- |
| Behavior | READ points → INSERT movement → UPDATE points += n (no tx) | READ points → check >= needed → INSERT redeem movement → UPDATE points = 0 |
| Outcome | Lost update: earn applies on stale balance after redeem zeros; or redeem sees pre-earn balance |

**Clash:** Intent antifraud and AD-9 assume coherent latest movement; without SERIALIZABLE/row lock AD, both are “correct” implementations.

**Hole:** AD: single transaction; `SELECT … FOR UPDATE` on customer row; movement insert + balance update atomic; define ordering earn vs redeem under concurrency.

---

### 13. `purchases` cutover: 410 vs redirect vs silent alias

**ADs obeyed:** AD-10 (“remove or thin-redirect purchases after cutover”)

| | Unit A — Deletes route; tests 410 | Unit B — Thin redirect mapping old body |
| --- | --- | --- |
| Clients | Mobile/kiosk leftover calling `/purchases` hard-fails | Keeps working with purchase semantics mapped poorly to points |

**Clash:** “or” is not an invariant. Parallel endpoints partially live → dual semantics AD-2 forbids.

**Hole:** Pick one cutover: calendar/migration step; `/purchases` **410** with body code; no redirect that reintroduces purchase vocabulary.

---

### 14. Sheet primitive ownership vs steps — second “sheet” by another name

**ADs obeyed:** AD-7 (one `CustomerActionSheet`, `components/ui/sheet.tsx`)

| | Unit A — All steps inside one Sheet | Unit B — Confirm as full-screen route or Dialog “because confirm is not the sheet” |
| --- | --- | --- |
| Behavior | greeting → picker → confirm → success in one component state machine | Uses Sheet for greeting only; confirm in `components/ui/dialog` to avoid scroll |

**Clash:** Intent “UN solo componente para todo el loop”; AD-7 names one component but does not forbid Dialog for substeps. Two UX stacks, two close/focus traps, duplicate redeem entry points.

**Hole:** AD-7 state machine: allowed steps; forbidden second modal libraries **and** second modal components for this loop; redeem only from defined step(s).

---

### 15. Scanner library pin vs “Plan B” list — two defaults for dashboard loyalty

**ADs obeyed:** AD-6, AD-8

| | Unit A — `loyalty` page default = Scanner full viewport | Unit B — `panel.tsx` remains default export; scanner is tab behind feature flag |
| --- | --- | --- |
| `?c=` | Scanner page reads query and opens sheet | Panel list highlights customer; no sheet |

**Clash:** AD-6 says default UI = scanner but does not forbid shipping panel as route default with scanner “reachable.” Deep link employee redirect lands on wrong chrome.

**Hole:** Exact route composition: page must mount Scanner as default; `?c=` mandatory handler; panel only via explicit secondary navigation control.

---

## Additional spine defects (not full pairs, still block finalize)

- **AD status inconsistency:** only AD-1 marked `[ADOPTED]`; AD-2…AD-12 unmarked — implementers may treat them as optional.
- **No AD for `points_needed` vs range point sizes** (incommensurable configs: ranges grant 50/100/150, threshold 10).
- **Employee long session / PIN** deferred in spine but called out in intent as mortal UX — fine as deferred, but no AD that session middleware must not force re-login on scan path.
- **Structural seed** lists files; no ownership of shared `lib/parse-loyalty-qr` vs inline parse in scanner (duplicate parsers → Finding 7 class).
- **Tests convention** exists; no required cases for cross-tenant, duplicate window, range validation matrix, or redeem+earn race.
- **i18n/copy:** Spanish strings required; no glossary for “puntos” / “canjear” / error strings → dual copy in A/B.
- **QR absolute origin “at render time”** (AD-4): SSR origin vs client `window.location.origin` vs env `APP_URL` — three absolute URLs for same card.

---

## Intent coverage gaps the pairs exploit

| Intent must-not-diverge | Spine gap exploited |
| --- | --- |
| Explicit confirm antifraud (“N puntos a Juan”) | Stale rangeIndex / freeform points (1, 4) |
| Single sheet loop sumar+canje | Dialog split / dual redeem records (2, 14) |
| Configurable contiguous ranges + below-min not recorded | 0-band vs filter; weak validation (3, 10) |
| Employee-only actions; customer read-only | Cross-tenant redirect (6) |
| QR URL is the API | Register path undefined (7); origin ambiguity |
| Anti-duplicate <60s extra confirm | Predicate + force underspecified (8) |
| Points-native clean slate | `redemptions` table + `/purchases` “or” (2, 13) |
| Movements: monto, puntos, tramo, employee, ts | amount_cents = min not ticket (9); missing tx (12) |

---

## Required AD closures (minimum to re-review)

1. **Canonical earn body only** `{ customerId, rangeIndex, force?, rangesNotBefore? }` — server resolves points/amount/label; delete freeform branch from AD-10.
2. **Ledger singularity:** `point_movements` only; migrate/drop `redemptions`; redeem = one INSERT kind=redeem + `points=0` in one transaction with FOR UPDATE.
3. **Closed `point_ranges` JSON Schema** + PATCH replace semantics + earn rejects non-positive ranges.
4. **Balance algebra** for `points` / `total_points` / eligibility.
5. **Authz matrix** for public code URL, dashboard `?c=`, scanner decode (same-business only).
6. **Parse contract** for customer vs register QR.
7. **AD-9 predicate + force rules** (server clock, any earn).
8. **Wire format** snake_case vs camelCase + error code enum.
9. **Cutover:** `/purchases` → 410 only; mark AD-2…AD-12 ADOPTED or drop them.
10. **Sheet state machine** single component, listed steps.

---

## Verdict rationale

The spine is a strong sketch (paradigm, stack, seed, many right instincts) but **AD-10’s dual body**, **unspecified redeem ledger**, **range validation half-spec**, and **missing balance/tx/authz contracts** allow multiple faithful implementers to build non-integrating systems. That is the definition of an unfinalized spine.

**Verdict: FAIL**

---

## Top findings (summary)

1. AD-10 dual earn bodies → sheet vs API incompatible or non-deterministic under range edits.  
2. AD-2/AD-10 dual redeem ownership (`redemptions` vs `point_movements`).  
3. AD-3 vs intent 0-pt band + weak contiguity validation → divergent config/earn.  
4. No ranges versioning → confirm UI N ≠ server credited M.  
5. No balance algebra / transaction AD → earn∥redeem lost updates and progress lies.

**Review file:** `_bmad-output/planning-artifacts/architecture/architecture-tumo-app-2026-08-18/reviews/review-adversarial.md`
