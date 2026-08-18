# Rubric Walker — Architecture Spine Finalize Gate

**Spine:** `architecture-tumo-app-2026-08-18/ARCHITECTURE-SPINE.md`  
**Intent:** `brainstorm-loyalty-qr-scan-flow-2026-08-18/brainstorm-intent.md`  
**Altitude:** feature · **Paradigm:** modular monolith (domain module)  
**Date:** 2026-08-18  

## Verdict: PASS_WITH_FIXES

Spine is a solid feature-altitude build-substrate: paradigm, ownership, points-native cutover, QR URL, scanner-primary, sheet, ranges, anti-dupe, plan B, and employee gate are decided and mapped. A few rule gaps leave room for two implementers to diverge on range validation, earn transactional integrity, and redeem eligibility — fix those before finalize, then PASS.

---

## Checklist

| Criterion | Result | Notes |
| --- | --- | --- |
| Fixes real divergence points for level below; misses none critical | **Partial** | Core seams covered (ownership, schema rename, API surface, scanner lib, sheet primitive). Gaps: range-array validation depth, earn atomicity, redeem eligibility rule, dual body shapes on points API. |
| Every AD Rule is enforceable and prevents its stated divergence | **Partial** | Most ADs are crisp. AD-3 / AD-9 / AD-10 leave edge behavior under-specified (see findings). |
| Nothing under Deferred could let two units diverge dangerously | **Pass** | Deferred items are Phase 2/3 or explicitly out of altitude (env, long session). Exact ticket amount deferred with MVP substitute clear. |
| Named tech verified-current | **Pass with note** | Pins given for next 16.2.12, react 19.2.4, qrcode 1.5.4, @yudiel/react-qr-scanner 2.6.0. **Unverifiable from spine alone** — versions not cross-checked against lockfile/registry in this review. |
| Ratifies rather than contradicts brownfield | **Pass** | Modular monolith, `modules/loyalty` ownership, thin adapters, `shell/db`, existing sheet, existing 4-digit code as plan B, `validateSession` — aligns with stated brownfield. Clean-slate rename matches single non-prod client. |
| Covers intent capabilities | **Pass** | QR URL, scanner primary, sheet, ranges, points-native, anti-dupe, plan B code, employee-only actions — all in ADs + capability map. |
| Every dimension this altitude owns is decided, deferred, or open | **Pass with minor** | No silent whole dimension. Observability/logging, i18n beyond ES copy, and multi-device concurrency on anti-dupe are thin but not full silent dimensions; anti-dupe multi-client is the only near-miss (server window covers it partially). |
| Spine is terse build-substrate | **Pass** | Short ADs, tables, seed tree, mermaid — little rationale bloat. |

---

## Capability coverage (intent → spine)

| Intent capability | Covered? | Where |
| --- | --- | --- |
| QR = public URL `/{slug}/loyalty/c/{code}` | Yes | AD-4, structural seed |
| Scanner primary employee view | Yes | AD-6 |
| Bottom sheet (name, progress, SUMAR, confirm, redeem) | Yes | AD-7 |
| Configurable contiguous ranges; below-min not recorded | Yes | AD-3 |
| Points-native clean slate | Yes | AD-2, AD-10 |
| Anti-duplicate window | Yes | AD-9 |
| Plan B 4-digit code | Yes | AD-6 |
| Employee/owner-only actions; customer read-only | Yes | AD-5 |
| Explicit confirm (not 0-tap) | Yes | AD-7 flow; undo deferred |
| Scanner distinguishes foreign / register QR | Yes | AD-8 |
| Money as cents | Yes | AD-12 |

---

## Findings

### F1 — HIGH — AD-3 range validation is incomplete for enforcement

**Rule today:** ordered array, contiguous cuts, last open, `points <= 0` not offered; "Server validates on PATCH".

**Gap:** No enforceable checks for: non-overlap, `min < max` when max set, first band starting at 0 (or explicit allow-list), monotonic mins, empty array allowed?, max ranges count, integer-only cents, or whether the 0-pt below-min band must exist in JSON vs be implied. Two units can ship different validators and different editor UX for the same AD.

**Fix:** Add 4–6 bullet invariants under AD-3 (or a one-line validation pseudo-contract) that program API and program-form must share.

### F2 — HIGH — Earn path lacks transactional / consistency rule

**Gap:** Flow diagram updates `point_movements` + `customers.points` but no AD states single transaction, how `total_points` increments, redeem race with concurrent earn, or idempotency key beyond 60s window. Implementers can diverge on partial writes and balance math.

**Fix:** One AD or bullet under AD-2/AD-10: earn and redeem mutate balance + insert movement in one DB transaction; define `points += N` / redeem `points = 0` and whether `total_points` is lifetime earn-only.

### F3 — MEDIUM — AD-10 dual body shapes invite parallel clients

**Rule:** `{ customerId, rangeIndex }` **or** `{ customerId, points, amountCents?, … }` with preferred `rangeIndex`.

**Gap:** "Preferred" is not exclusive. Two callers can use free-form `points` and bypass range resolution, reintroducing dual semantics AD-2/AD-3 try to kill.

**Fix:** MVP contract = only `{ customerId, rangeIndex, force? }`. Defer free-form body or mark it non-MVP / rejected with 400.

### F4 — MEDIUM — Redeem eligibility not ruled

**Intent:** redeem banner when customer can redeem. AD-7 says banner when `points >= points_needed`. AD-10: sets `points = 0`, inserts redeem.

**Gap:** No server rule that redeem rejects when `points < points_needed`, or partial redeem, or concurrent double-redeem. UI-only gate is not enough under AD-1/AD-5.

**Fix:** AD-10 or AD-7: server rejects redeem unless `points >= points_needed`; success zeros balance + one `kind='redeem'` movement with points = amount redeemed (define value).

### F5 — LOW — AD-9 force path and multi-tab

Client 2s disable + server 60s/`force` is good. Unspecified: who may send `force` (any employee same business?), audit of forced earns, and whether 409 applies only to identical range or any earn. Minor; default "any recent earn, any employee of business, force allowed after extra UI confirm" is enough if written once.

### F6 — LOW — Tech pins unverified from spine alone

Stack table is explicit; rubric cannot confirm next@16.2.12 / scanner@2.6.0 against lockfile without leaving the spine. Not a content defect — note for implementer: verify pins at kickoff.

### Non-findings (explicit pass)

- Deferred list does not hide dangerous open seams (undo, realtime, dynamic QR correctly Phase 2/3).
- Brownfield direction (AD-1, AD-11) ratifies modular monolith; no second app or BFF.
- Intent Phase 2/3 and pending architecture choices (scanner lib, sheet vs drawer, 60s window) are closed in spine.
- No silent dimensions at feature altitude (deploy deferred; auth reuse stated; tests convention present).
- Terse enough: substrate, not essay.

---

## Required fixes before Finalize PASS

1. **AD-3:** spell range validation invariants (contiguous, bounds, 0-pt band, integers).  
2. **Earn/redeem:** one transactional consistency bullet (balance + movement; `total_points` semantics).  
3. **AD-10:** single MVP body `{ customerId, rangeIndex, force? }`; drop or defer free-form.  
4. **Redeem:** server eligibility `points >= points_needed` + success semantics.

Optional: tighten AD-9 force/409 scope one line.

---

## Summary

| | |
| --- | --- |
| **Verdict** | **PASS_WITH_FIXES** |
| **Blocking theme** | Enforceability holes on ranges, earn consistency, API body exclusivity, redeem gate |
| **Strength** | Full intent capability map; brownfield-aligned; clean deferred; good seed + conventions |
