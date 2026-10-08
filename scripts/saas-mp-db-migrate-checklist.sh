#!/usr/bin/env bash
# Tumo — checklist + apply SaaS MP schema on a TARGET database (local or friend's cloud).
# Does NOT invent credentials. Pass DATABASE_URL explicitly.
#
# Local docker compose (this machine):
#   DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/postgres?sslmode=disable' \
#     bash scripts/saas-mp-db-migrate-checklist.sh
#
# Friend's Supabase / real DB (he runs it, or you with his URL once):
#   DATABASE_URL='postgresql://postgres.[ref]:***@aws-0-....pooler.supabase.com:6543/postgres' \
#     bash scripts/saas-mp-db-migrate-checklist.sh
#
# Safe defaults: CHECK only. Pass --apply to run bun shell/db/migrate.ts against TARGET.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.bun/bin:${PATH}"

APPLY=0
if [[ "${1:-}" == "--apply" ]]; then
  APPLY=1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: set DATABASE_URL (no default — avoids hitting the wrong DB)."
  echo "Local compose example:"
  echo "  DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/postgres?sslmode=disable' $0 [--apply]"
  exit 1
fi

# Mask password in logs
MASKED="$(python3 - <<'PY'
import os, re
u=os.environ.get("DATABASE_URL","")
print(re.sub(r":([^:@/]+)@", ":***@", u))
PY
)"
echo "=== Tumo SaaS MP — DB migrate checklist ==="
echo "TARGET: $MASKED"
echo "MODE:   $([[ $APPLY -eq 1 ]] && echo APPLY || echo CHECK-only)"
echo

echo "--- 1) Files that must exist in repo ---"
need=(
  shell/db/migrations/017_saas_tenant_subscriptions.sql
  supabase/migrations/20261005120000_saas_tenant_subscriptions.sql
  shell/billing/plan-catalog.ts
  shell/db/migrate.ts
)
for f in "${need[@]}"; do
  if [[ -f "$f" ]]; then echo "  OK  $f"
  else echo "  MISSING $f"; exit 1
  fi
done

echo
echo "--- 2) What 017 adds (friend's real DB) ---"
cat <<'EOF'
  NEW table: public.tenant_subscriptions
    - plan_id: basico|pro|full
    - billing_interval: month|week (app v1 uses month)
    - module_ids text[]
    - amount_cents + currency (ARS snapshot)
    - status: active|past_due|paused|cancelled
    - provider default mercadopago
    - provider_subscription_id, subscribed_at, current_period_end, grace_deadline_at
    - UNIQUE open sub per business (active|past_due|paused)

  NOT in 017 yet (later slices — list when we ship them):
    - checkout_sessions
    - provider_events
    - owner_accounts
    - employees.owner_account_id
    - business_billing cycle_amount / interval columns (optional)

  App code that READS tenant_subscriptions (already on branch):
    - modules/admin/api/businesses.ts (list + detail saas_subscription)
    - modules/admin/dashboard/* SaaS UI

  Env for MP checkout (later; not required for admin display):
    - MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET, SELF_SERVICE_SIGNUP, APP_BASE_URL
EOF

echo
echo "--- 3) Connectivity probe ---"
python3 - <<'PY'
import os, sys
try:
    import subprocess
    url=os.environ["DATABASE_URL"]
    # Prefer psql if available
    r=subprocess.run(
        ["psql", url, "-v", "ON_ERROR_STOP=1", "-c", "SELECT current_database() AS db, current_user AS usr, now() AS ts;"],
        capture_output=True, text=True
    )
    if r.returncode==0:
        print(r.stdout)
        sys.exit(0)
    print("psql failed:", r.stderr.strip()[:400])
except FileNotFoundError:
    print("psql not installed — skipping live probe (bun migrate will still try).")
except Exception as e:
    print("probe error:", e)
    sys.exit(1)
PY

echo
echo "--- 4) Schema presence (before) ---"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "
SELECT
  to_regclass('public.tenant_subscriptions') AS tenant_subscriptions,
  to_regclass('public.business_module_subscriptions') AS business_module_subscriptions,
  to_regclass('public.business_billing') AS business_billing;
" 2>/dev/null || echo "(psql skip)"

if [[ $APPLY -eq 1 ]]; then
  echo
  echo "--- 5) APPLY: bun shell/db/migrate.ts (uses DATABASE_URL from env) ---"
  bun shell/db/migrate.ts
  echo
  echo "--- 6) Schema presence (after) ---"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "\d tenant_subscriptions" || true
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "
    SELECT COUNT(*) AS tenant_sub_rows FROM tenant_subscriptions;
  " || true
else
  echo
  echo "--- 5) CHECK-only: not applying ---"
  echo "Re-run with --apply when ready:"
  echo "  DATABASE_URL='…' bash scripts/saas-mp-db-migrate-checklist.sh --apply"
fi

echo
echo "--- 7) Friend handoff (real Supabase) — copy/paste ---"
cat <<'EOF'
  A. Repo already has dual files:
       shell/db/migrations/017_saas_tenant_subscriptions.sql
       supabase/migrations/20261005120000_saas_tenant_subscriptions.sql

  B. Options to apply on HIS project:
       1) Dashboard SQL editor: paste contents of 017_…sql and run
       2) supabase db push (linked to HIS project-ref) — picks supabase/migrations/*
       3) DATABASE_URL= (Transaction Pooler string) bash scripts/saas-mp-db-migrate-checklist.sh --apply
          NOTE: migrate.ts re-runs ALL migrations with IF NOT EXISTS — OK on greenfield;
          on mature prod prefer option 1 or 2 with ONLY 017 if earlier migs already applied.

  C. Verify on real DB:
       SELECT to_regclass('public.tenant_subscriptions');
       \d tenant_subscriptions

  D. No data backfill required for 017 (empty until first self-serve provision).
     Legacy businesses stay without row → admin shows "manual".

  E. Do NOT change orders MP / turnos payment tables for SaaS.
EOF

echo
echo "DONE."
